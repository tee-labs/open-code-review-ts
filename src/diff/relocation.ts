import type { LLMMessage } from '../core/types.js';
import { buildReLocationMessages } from '../config/task-template.js';

/**
 * LLM-assisted comment relocation.
 * When existingCode cannot be found via text matching,
 * we ask the LLM to locate it and return line numbers.
 */
export interface RelocationResult {
  startLine: number;
  endLine: number;
}

/**
 * Build messages for the relocation task.
 */
export function buildRelocationMessages(
  existingCode: string,
  filePath: string,
  fileContent: string,
): LLMMessage[] {
  return buildReLocationMessages(existingCode, filePath, fileContent);
}

/**
 * Parse the LLM response for relocation.
 * Expected JSON format: { "startLine": 42, "endLine": 45 }
 */
export function parseRelocationResponse(response: string): RelocationResult | null {
  try {
    // Try to find JSON in the response
    const jsonMatch = response.match(/\{[\s\S]*"startLine"[\s\S]*"endLine"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (typeof parsed.startLine === 'number' && typeof parsed.endLine === 'number') {
        return { startLine: parsed.startLine, endLine: parsed.endLine };
      }
    }
    return null;
  } catch {
    return null;
  }
}
