import crypto from 'crypto';

/**
 * Generate a cryptographically secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate email verification token
 * Returns a URL-safe token
 */
export function generateEmailVerificationToken(): string {
  return generateToken(32);
}

/**
 * Generate password reset token
 * Returns a URL-safe token
 */
export function generatePasswordResetToken(): string {
  return generateToken(32);
}

/**
 * Generate API key for user
 * Returns a longer, more secure token
 */
export function generateApiKey(): string {
  return generateToken(32);
}

/**
 * Get expiration date for email verification (24 hours from now)
 */
export function getEmailVerificationExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24);
  return expiry;
}

/**
 * Get expiration date for password reset (1 hour from now)
 */
export function getPasswordResetExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 1);
  return expiry;
}

/**
 * Check if a token has expired
 */
export function isTokenExpired(expiryDate: Date | null): boolean {
  if (!expiryDate) {
    return true;
  }
  return new Date() > new Date(expiryDate);
}

/**
 * Hash a token for secure storage (optional, for extra security)
 * Use this if you want to store hashed tokens in the database
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Compare a plain token with a hashed token
 */
export function compareToken(plainToken: string, hashedToken: string): boolean {
  const hashedPlain = hashToken(plainToken);
  return crypto.timingSafeEqual(
    Buffer.from(hashedPlain),
    Buffer.from(hashedToken)
  );
}
