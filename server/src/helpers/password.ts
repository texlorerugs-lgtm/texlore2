/**
 * Password hashing (bcrypt, 12 rounds) and strength validation.
 * Enforces Part 2: min 8 chars, upper, lower, number, special.
 */
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

const PASSWORD_RE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~])[A-Za-z\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]{8,128}$/;

export function isStrongPassword(pw: string): boolean {
  return PASSWORD_RE.test(pw);
}

export function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, BCRYPT_ROUNDS);
}

export function comparePassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}
