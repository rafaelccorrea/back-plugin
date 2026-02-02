import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

/**
 * Password validation rules
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate password strength
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push('A senha deve ter no mínimo 8 caracteres');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('A senha deve conter pelo menos uma letra maiúscula');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('A senha deve conter pelo menos uma letra minúscula');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('A senha deve conter pelo menos um número');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('A senha deve conter pelo menos um caractere especial');
  }

  if (password.length > 128) {
    errors.push('A senha não pode ter mais de 128 caracteres');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    console.log("[Auth:Password] hashPassword chamado, saltRounds=" + SALT_ROUNDS);
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    console.log("[Auth:Password] hash gerado, length=" + hash.length);
    return hash;
  } catch (error) {
    console.error("[Auth:Password] Erro ao hashear senha:", error);
    throw new Error('Erro ao processar senha');
  }
}

/**
 * Compare password with hash
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    console.log("[Auth:Password] comparePassword chamado, hash length=" + (hash?.length ?? 0));
    const isMatch = await bcrypt.compare(password, hash);
    console.log("[Auth:Password] comparação:", isMatch ? "senha correta" : "senha incorreta");
    return isMatch;
  } catch (error) {
    console.error("[Auth:Password] Erro ao comparar senha:", error);
    return false;
  }
}

/**
 * Check if password meets minimum requirements (for quick validation)
 */
export function isPasswordStrong(password: string): boolean {
  return validatePassword(password).isValid;
}

/**
 * Generate a random password that meets all requirements
 * Useful for temporary passwords or testing
 */
export function generateRandomPassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}';
  
  const allChars = uppercase + lowercase + numbers + special;
  
  // Ensure at least one of each required character type
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}
