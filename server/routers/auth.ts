import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import {
  validatePassword,
  hashPassword,
  comparePassword,
} from "../services/passwordService";
import {
  generateEmailVerificationToken,
  generatePasswordResetToken,
  getEmailVerificationExpiry,
  getPasswordResetExpiry,
  isTokenExpired,
  generateApiKey,
} from "../services/tokenService";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from "../services/emailService";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { sdk } from "../_core/sdk";
import { getSessionCookieOptions } from "../_core/cookies";

/**
 * Authentication router
 * Handles registration, login, email verification, and password reset
 */
export const authRouter = router({
  /**
   * Register new user with email and password
   */
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email("Email inválido"),
        password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { email, password, name } = input;

      // Validate password strength
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(", "));
      }

      // Check if user already exists
      const existingUser = await db.getUserByEmail(email);
      if (existingUser) {
        throw new Error("Este email já está cadastrado");
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Generate verification token
      const verificationToken = generateEmailVerificationToken();
      const verificationExpiry = getEmailVerificationExpiry();

      // Create user
      const user = await db.createUser({
        email,
        name: name || null,
        passwordHash,
        loginMethod: "email",
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpiry,
        apiKey: generateApiKey(),
      });

      if (!user) {
        throw new Error("Erro ao criar usuário");
      }

      // Enviar email de verificação (obrigatório para ativar a conta)
      await sendVerificationEmail(email, verificationToken, name);

      return {
        success: true,
        message: "Conta criada com sucesso! Verifique seu email (e a pasta de spam) para ativar sua conta.",
        userId: user.id,
      };
    }),

  /**
   * Login with email and password
   */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email("Email inválido"),
        password: z.string().min(1, "Senha é obrigatória"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { email, password } = input;

      console.log("[Auth:Login] ═══════════════════════════════════════");
      console.log("[Auth:Login] Requisição de login recebida, email=" + email);

      // Get user by email
      const user = await db.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        console.log("[Auth:Login] Falha: usuário não encontrado ou sem senha (email=" + email + ")");
        throw new Error("Email ou senha incorretos");
      }
      console.log("[Auth:Login] Usuário encontrado id=" + user.id + " email=" + user.email);

      // Compare password
      const isPasswordValid = await comparePassword(password, user.passwordHash);
      if (!isPasswordValid) {
        console.log("[Auth:Login] Falha: senha incorreta para email=" + email);
        throw new Error("Email ou senha incorretos");
      }
      console.log("[Auth:Login] Senha validada com sucesso");

      // Check if email is verified
      if (!user.emailVerified) {
        console.log("[Auth:Login] Falha: email não verificado para email=" + email);
        throw new Error(
          "Email não verificado. Por favor, verifique seu email antes de fazer login."
        );
      }
      console.log("[Auth:Login] Email verificado ok");

      // Update last signed in (opcional: falha não bloqueia login)
      try {
        await db.updateUser(user.id, { lastSignedIn: new Date() });
        console.log("[Auth:Login] lastSignedIn atualizado");
      } catch (e) {
        console.warn("[Auth:Login] updateUser lastSignedIn falhou (ignorado):", e instanceof Error ? e.message : e);
      }

      // Import JWT functions
      const { generateJWT, generateRefreshToken } = await import('../services/authService');

      const tokenPayload = {
        userId: user.id.toString(),
        email: user.email || '',
        role: user.role || 'user',
      };
      const accessToken = generateJWT(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);
      console.log("[Auth:Login] accessToken e refreshToken gerados");

      // Plano e status vêm da tabela subscriptions (não de users)
      let plan = "free";
      let subscriptionStatus: string | null = null;
      try {
        const subInfo = await db.getActiveUserSubscriptionInfo(user.id);
        plan = (subInfo?.plan ?? "free") as string;
        subscriptionStatus = subInfo?.status ?? null;
      } catch (e) {
        console.warn("[Auth:Login] getActiveUserSubscriptionInfo falhou (usando free):", e instanceof Error ? e.message : e);
      }

      // Also set cookie for backward compatibility
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, accessToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });
      console.log("[Auth:Login] Cookie de sessão definido");
      console.log("[Auth:Login] Login concluído com sucesso para email=" + email);
      console.log("[Auth:Login] ═══════════════════════════════════════");

      return {
        success: true,
        message: "Login realizado com sucesso",
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role || 'user',
          plan,
          subscriptionStatus,
        },
      };
    }),

  /**
   * Renovar access token usando refresh token (não exige Authorization)
   */
  refresh: publicProcedure
    .input(
      z.object({
        refreshToken: z.string().min(1, "Refresh token é obrigatório"),
      })
    )
    .mutation(async ({ input }) => {
      const { refreshAccessToken } = await import("../services/authService");
      const accessToken = await refreshAccessToken(input.refreshToken);
      return { accessToken };
    }),

  /**
   * Verify email with token
   */
  verifyEmail: publicProcedure
    .input(
      z.object({
        token: z.string().min(1, "Token é obrigatório"),
      })
    )
    .mutation(async ({ input }) => {
      const { token } = input;

      const user = await db.verifyEmailWithToken(token);
      if (!user) {
        throw new Error("Token inválido ou expirado");
      }

      // Send welcome email
      try {
        await sendWelcomeEmail(user.email!, user.name || undefined);
      } catch (error) {
        console.error("[Auth] Failed to send welcome email:", error);
      }

      return {
        success: true,
        message: "Email verificado com sucesso! Você já pode fazer login.",
      };
    }),

  /**
   * Resend verification email
   */
  resendVerification: publicProcedure
    .input(
      z.object({
        email: z.string().email("Email inválido"),
      })
    )
    .mutation(async ({ input }) => {
      const { email } = input;

      const user = await db.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists
        return {
          success: true,
          message: "Se o email existir, um novo link de verificação será enviado.",
        };
      }

      if (user.emailVerified) {
        throw new Error("Este email já está verificado");
      }

      // Generate new verification token
      const verificationToken = generateEmailVerificationToken();
      const verificationExpiry = getEmailVerificationExpiry();

      await db.setEmailVerificationToken(
        user.id,
        verificationToken,
        verificationExpiry
      );

      // Send verification email
      try {
        await sendVerificationEmail(email, verificationToken, user.name || undefined);
      } catch (error) {
        console.error("[Auth] Failed to send verification email:", error);
        throw new Error("Erro ao enviar email de verificação");
      }

      return {
        success: true,
        message: "Email de verificação enviado com sucesso!",
      };
    }),

  /**
   * Request password reset
   */
  forgotPassword: publicProcedure
    .input(
      z.object({
        email: z.string().email("Email inválido"),
      })
    )
    .mutation(async ({ input }) => {
      const { email } = input;

      const user = await db.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists
        return {
          success: true,
          message:
            "Se o email existir, você receberá instruções para redefinir sua senha.",
        };
      }

      // Only allow password reset for email/password accounts
      if (user.loginMethod !== "email" || !user.passwordHash) {
        return {
          success: true,
          message:
            "Se o email existir, você receberá instruções para redefinir sua senha.",
        };
      }

      // Generate reset token
      const resetToken = generatePasswordResetToken();
      const resetExpiry = getPasswordResetExpiry();

      await db.setPasswordResetToken(user.id, resetToken, resetExpiry);

      // Send reset email
      try {
        await sendPasswordResetEmail(email, resetToken, user.name || undefined);
      } catch (error) {
        console.error("[Auth] Failed to send password reset email:", error);
        throw new Error("Erro ao enviar email de recuperação");
      }

      return {
        success: true,
        message: "Instruções de recuperação de senha enviadas para seu email!",
      };
    }),

  /**
   * Validate password reset token
   */
  validateResetToken: publicProcedure
    .input(
      z.object({
        token: z.string().min(1, "Token é obrigatório"),
      })
    )
    .query(async ({ input }) => {
      const { token } = input;

      const user = await db.getUserByPasswordResetToken(token);
      if (!user) {
        return {
          valid: false,
          message: "Token inválido ou expirado",
        };
      }

      return {
        valid: true,
        email: user.email,
      };
    }),

  /**
   * Reset password with token
   */
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string().min(1, "Token é obrigatório"),
        password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
      })
    )
    .mutation(async ({ input }) => {
      const { token, password } = input;

      // Validate password strength
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(", "));
      }

      // Hash new password
      const passwordHash = await hashPassword(password);

      // Reset password
      const user = await db.resetPasswordWithToken(token, passwordHash);
      if (!user) {
        throw new Error("Token inválido ou expirado");
      }

      return {
        success: true,
        message: "Senha redefinida com sucesso! Você já pode fazer login.",
      };
    }),

  /**
   * Change password (for logged in users)
   */
  changePassword: publicProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1, "Senha atual é obrigatória"),
        newPassword: z.string().min(8, "Nova senha deve ter no mínimo 8 caracteres"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new Error("Você precisa estar logado para alterar a senha");
      }

      const { currentPassword, newPassword } = input;

      // Get user
      const user = await db.getUserById(ctx.user.id);
      if (!user || !user.passwordHash) {
        throw new Error("Usuário não encontrado ou não usa autenticação por senha");
      }

      // Verify current password
      const isPasswordValid = await comparePassword(currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        throw new Error("Senha atual incorreta");
      }

      // Validate new password
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(", "));
      }

      // Hash new password
      const passwordHash = await hashPassword(newPassword);

      // Update password
      await db.updateUser(user.id, {
        passwordHash,
      });

      return {
        success: true,
        message: "Senha alterada com sucesso!",
      };
    }),

  /**
   * Get current user (me)
   * O plano vem da tabela subscriptions (assinatura ativa), não de users.plan.
   */
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      return null;
    }

    const user = await db.getUserById(ctx.user.id);
    if (!user) {
      return null;
    }

    const subInfo = await db.getActiveUserSubscriptionInfo(ctx.user.id);
    let plan = (subInfo?.plan ?? "free") as string;
    let subscriptionStatus = subInfo?.status ?? null;
    // Se não há assinatura ativa, verificar se existe assinatura expirada/pendente (para mostrar "Minha Assinatura")
    if (!subInfo) {
      const latestStatus = await db.getLatestSubscriptionStatus(ctx.user.id);
      if (latestStatus && ["past_due", "canceled", "unpaid"].includes(latestStatus)) {
        subscriptionStatus = latestStatus;
      }
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      apiKey: user.apiKey,
      emailVerified: user.emailVerified,
      plan,
      subscriptionStatus,
      createdAt: user.createdAt,
    };
  }),

  /**
   * Regenerate API Key
   */
  regenerateApiKey: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const newApiKey = generateApiKey();
      const user = await db.updateUser(ctx.user.id, { apiKey: newApiKey });
      
      return {
        success: true,
        message: "API Key regenerada com sucesso",
        apiKey: newApiKey,
      };
    } catch (error) {
      console.error("[Auth] Error regenerating API key:", error);
      throw new Error("Erro ao regenerar API Key");
    }
  }),

  /**
   * Logout - clear session cookie
   */
  logout: publicProcedure.mutation(async ({ ctx }) => {
    // Clear the session cookie
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, cookieOptions);

    return {
      success: true,
      message: "Logout realizado com sucesso",
    };
  }),
});
