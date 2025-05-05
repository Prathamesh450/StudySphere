import bcrypt from 'bcrypt';

/**
 * Hashes a password using bcrypt
 * @param password The plain text password to hash
 * @returns A promise that resolves to the hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compares a plain text password with a hashed password
 * @param password The plain text password to check
 * @param hash The hashed password to compare against
 * @returns A promise that resolves to true if the password matches, false otherwise
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
} 