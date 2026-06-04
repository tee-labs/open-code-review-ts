import type { ToolDefinition, ToolContext, ToolResult } from '../core/types.js';
import type { Tool } from './types.js';
import { readFile } from 'node:fs/promises';
import { join, normalize, relative } from 'node:path';

const MAX_READ_LINES = 500;

export class FileReadTool implements Tool {
  definition: ToolDefinition = {
    name: 'file_read',
    description: 'Read a file from the repository. Use this to read source files for more context beyond the diff.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to the file to read' },
        startLine: { type: 'number', description: 'Start line number (1-indexed, optional)' },
        endLine: { type: 'number', description: 'End line number (inclusive, optional)' },
      },
      required: ['path'],
    },
  };

  async execute(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
    const filePath = String(args.path || '');
    if (!filePath) {
      return { success: false, data: null, error: 'path is required' };
    }

    const normalizedPath = normalize(filePath);

    if (ctx.blockedFiles.has(normalizedPath)) {
      return { success: false, data: null, error: `Cannot read blocked file: ${filePath}` };
    }

    if (normalizedPath.includes('..')) {
      return { success: false, data: null, error: 'Path traversal not allowed' };
    }

    const fullPath = join(ctx.workspace, normalizedPath);

    try {
      const content = await readFile(fullPath, 'utf-8');
      const lines = content.split('\n');

      const startLine = args.startLine ? Math.max(1, Number(args.startLine)) : 1;
      const endLine = args.endLine
        ? Math.min(lines.length, Number(args.endLine))
        : Math.min(lines.length, startLine + MAX_READ_LINES - 1);

      if (endLine - startLine + 1 > MAX_READ_LINES) {
        return {
          success: false,
          data: null,
          error: `File too large. Max ${MAX_READ_LINES} lines. File has ${lines.length} lines.`,
        };
      }

      const selected = lines.slice(startLine - 1, endLine);
      return {
        success: true,
        data: selected.join('\n'),
      };
    } catch (err) {
      return {
        success: false,
        data: null,
        error: `Cannot read file: ${filePath}. ${err instanceof Error ? err.message : ''}`,
      };
    }
  }
}
