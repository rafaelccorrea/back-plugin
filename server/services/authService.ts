import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { TRPCError } from '@trpc/server';
import { getDb, ensureUserHasFreeSubscription } from '../db';
import { users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const JWT_EXPIRES_IN = '1h'; // Access token: 1 hora (refresh token renova na troca de página/F5)
const REFRESH_TOKEN_EXPIRES_IN = '7d';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Hash de senha com bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

/**
 * Validar senha
 */
export async function validatePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Gerar JWT token
 */
export function generateJWT(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Gerar refresh token
 */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

/**
 * Verificar JWT token
 */
export function verifyJWT(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Registrar novo usuário
 */
export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<{ userId: string; email: string }> {
  // Validar email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Email inválido',
    });
  }

  // Validar força de senha
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Senha deve ter mín. 8 caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 especial',
    });
  }

  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Banco de dados indisponível',
    });
  }

  // Verificar se usuário já existe
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'Email já registrado',
    });
  }

  // Hash de senha
  const passwordHash = await hashPassword(password);

  // Criar usuário (plano free por padrão quando não vem de assinatura)
  const newUser = await db
    .insert(users)
    .values({
      email,
      name,
      passwordHash,
      emailVerified: false,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: users.id, email: users.email });

  if (!newUser || newUser.length === 0) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Erro ao criar usuário',
    });
  }

  await ensureUserHasFreeSubscription(newUser[0].id);

  return {
    userId: newUser[0].id,
    email: newUser[0].email,
  };
}

/**
 * Fazer login
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ accessToken: string; refreshToken: string; user: any }> {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Banco de dados indisponível',
    });
  }

  // Buscar usuário
  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (userResult.length === 0) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Email ou senha incorretos',
    });
  }

  const user = userResult[0];

  // Validar senha
  const isPasswordValid = await validatePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Email ou senha incorretos',
    });
  }

  // Gerar tokens
  const tokenPayload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = generateJWT(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Atualizar lastSignedIn
  await db
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, user.id));

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}

/**
 * Renovar access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const payload = verifyJWT(refreshToken);
  if (!payload) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Refresh token inválido',
    });
  }

  const newAccessToken = generateJWT(payload);
  return newAccessToken;
}

/**
 * Validar força de senha
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Mínimo 8 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Pelo menos 1 letra maiúscula');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Pelo menos 1 letra minúscula');
  }
  if (!/\d/.test(password)) {
    errors.push('Pelo menos 1 número');
  }
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Pelo menos 1 caractere especial (@$!%*?&)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
