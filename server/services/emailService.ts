import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Resend free tier: use exatamente "onboarding@resend.dev" ou "Nome <onboarding@resend.dev>"
const FROM_EMAIL = (process.env.FROM_EMAIL || 'ChatLead Pro <onboarding@resend.dev>').trim();
const APP_URL = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;

/** Verifica se o Resend está configurado (para logs e validação). */
export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function ensureResend(): Resend {
  if (!resend) {
    throw new Error(
      'Resend não configurado. Defina RESEND_API_KEY e FROM_EMAIL no .env. Obtenha a chave em https://resend.com/'
    );
  }
  return resend;
}

/** Mensagem amigável quando Resend está em modo de teste (só envia para o email da conta). */
function formatResendError(error: unknown, recipientEmail: string): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes('only send testing emails to your own email address')) {
    const match = msg.match(/\(([^)]+@[^)]+)\)/);
    const allowedEmail = match ? match[1].trim() : process.env.RESEND_TEST_EMAIL || 'o email da conta Resend';
    return `No modo de teste do Resend, os emails só podem ser enviados para ${allowedEmail}. Cadastre-se com esse email para receber o link de ativação, ou verifique um domínio em https://resend.com/domains para enviar para qualquer endereço.`;
  }
  return msg;
}

/** Envia email e trata resposta do Resend (API retorna { data, error }, não lança exceção). */
async function sendEmail(options: { from: string; to: string; subject: string; html: string }): Promise<void> {
  const client = ensureResend();
  const { data, error } = await client.emails.send(options);

  if (error) {
    console.error('[EmailService] Resend API error:', JSON.stringify(error, null, 2));
    const message = typeof error === 'object' && error !== null && 'message' in error
      ? formatResendError(error, options.to)
      : formatResendError(new Error(String(error)), options.to);
    throw new Error(message);
  }

  if (data?.id) {
    console.log(`[EmailService] Email enviado (id: ${data.id}) para ${options.to}`);
  }
}

/**
 * Send email verification link to user
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  name?: string
): Promise<void> {
  const verificationUrl = `${APP_URL}/verify-email?token=${token}`;
  
  try {
    await sendEmail({
      from: FROM_EMAIL,
      to: email,
      subject: 'Verifique seu email - ChatLead Pro',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>WA-SDR</h1>
                <p>Bem-vindo ao futuro da gestão de leads imobiliários!</p>
              </div>
              <div class="content">
                <h2>Olá${name ? `, ${name}` : ''}!</h2>
                <p>Obrigado por se cadastrar no WA-SDR. Para começar a usar nossa plataforma, você precisa verificar seu endereço de email.</p>
                <p>Clique no botão abaixo para verificar seu email:</p>
                <div style="text-align: center;">
                  <a href="${verificationUrl}" class="button">Verificar Email</a>
                </div>
                <p>Ou copie e cole este link no seu navegador:</p>
                <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
                <p style="margin-top: 30px; color: #666; font-size: 14px;">
                  Se você não criou uma conta no WA-SDR, por favor ignore este email.
                </p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} WA-SDR. Todos os direitos reservados.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error('[EmailService] Falha ao enviar email de verificação:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Falha ao enviar email de verificação. Verifique RESEND_API_KEY e FROM_EMAIL no .env.'
    );
  }
}

/**
 * Send password reset link to user
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
  name?: string
): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  
  try {
    await ensureResend().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Recuperação de senha - WA-SDR',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>WA-SDR</h1>
                <p>Recuperação de Senha</p>
              </div>
              <div class="content">
                <h2>Olá${name ? `, ${name}` : ''}!</h2>
                <p>Recebemos uma solicitação para redefinir a senha da sua conta no WA-SDR.</p>
                <p>Clique no botão abaixo para criar uma nova senha:</p>
                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">Redefinir Senha</a>
                </div>
                <p>Ou copie e cole este link no seu navegador:</p>
                <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
                <div class="warning">
                  <strong>⚠️ Importante:</strong> Este link expira em <strong>1 hora</strong>.
                </div>
                <p style="margin-top: 30px; color: #666; font-size: 14px;">
                  Se você não solicitou a recuperação de senha, por favor ignore este email. Sua senha permanecerá inalterada.
                </p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} WA-SDR. Todos os direitos reservados.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error('[EmailService] Falha ao enviar email de recuperação de senha:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Falha ao enviar email de recuperação de senha.'
    );
  }
}

/**
 * Send welcome email after successful verification
 */
export async function sendWelcomeEmail(
  email: string,
  name?: string
): Promise<void> {
  try {
    await sendEmail({
      from: FROM_EMAIL,
      to: email,
      subject: 'Bem-vindo ao ChatLead Pro! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .feature { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #667eea; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Bem-vindo ao WA-SDR!</h1>
              </div>
              <div class="content">
                <h2>Olá${name ? `, ${name}` : ''}!</h2>
                <p>Sua conta foi verificada com sucesso! Agora você tem acesso completo à nossa plataforma de gestão de leads imobiliários com IA.</p>
                
                <h3>O que você pode fazer agora:</h3>
                
                <div class="feature">
                  <strong>📊 Dashboard de Leads</strong>
                  <p>Visualize e gerencie todos os seus leads capturados do WhatsApp em um só lugar.</p>
                </div>
                
                <div class="feature">
                  <strong>🤖 Análise com IA</strong>
                  <p>Nossa IA analisa conversas automaticamente e extrai informações estruturadas dos leads.</p>
                </div>
                
                <div class="feature">
                  <strong>🔑 API Key</strong>
                  <p>Configure sua extensão Chrome com sua API Key disponível nas configurações.</p>
                </div>
                
                <div style="text-align: center;">
                  <a href="${APP_URL}/leads" class="button">Acessar Dashboard</a>
                </div>
                
                <p style="margin-top: 30px;">
                  Se tiver alguma dúvida, nossa equipe de suporte está sempre disponível para ajudar!
                </p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} WA-SDR. Todos os direitos reservados.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error('[EmailService] Falha ao enviar email de boas-vindas:', error);
    // Não falha o fluxo; email de boas-vindas não é crítico
  }
}
