/**
 * Token counting utility wrapping js-tiktoken.
 */
import { getEncoding } from 'js-tiktoken';

let encoder: ReturnType<typeof getEncoding> | null = null;

function getEncoder(): ReturnType<typeof getEncoding> {
  if (!encoder) {
    encoder = getEncoding('cl100k_base');
  }
  return encoder;
}

/**
 * Count the number of tokens in a text string.
 */
export function countTokens(text: string): number {
  const enc = getEncoder();
  return enc.encode(text).length;
}

/**
 * Count tokens for an array of messages.
 * Approximates the OpenAI chat format token count.
 */
export function countMessageTokens(
  messages: Array<{ role: string; content: string | null }>,
): number {
  let total = 0;
  for (const msg of messages) {
    total += 4; // per-message overhead
    total += countTokens(msg.role);
    if (msg.content) {
      total += countTokens(msg.content);
    }
  }
  total += 2; // reply overhead
  return total;
}
