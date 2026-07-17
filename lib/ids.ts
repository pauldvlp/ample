import { customAlphabet } from 'nanoid';

// URL-safe, human-friendly id (no ambiguous chars). Length 16 keeps collisions
// astronomically unlikely for a single-user dataset while staying compact.
const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
const nano = customAlphabet(alphabet, 16);

export function newId(prefix?: string): string {
  return prefix ? `${prefix}_${nano()}` : nano();
}
