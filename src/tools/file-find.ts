import type { ToolDefinition, ToolContext, ToolResult } from '../core/types.js';
import type { Tool } from './types.js';

export class FileFindTool implements Tool {
  definition: ToolDefinition = {
    name: 'file_find',
    description: 'Find files in the repository matching a search pattern. Uses git ls-files internally.',
    parameters: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Glob pattern to search for files (e.g., **/*.ts, **/utils/**)' },
      },
      required: ['pattern'],
    },
  };

  async execute(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
    const pattern = String(args.pattern || '');
    if (!pattern) {
      return { success: false, data: null, error: 'pattern is required' };
    }

    try {
      const result = await ctx.git.raw(['ls-files', '--', pattern]);
      const files = result
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean)
        .sort();

      return {
        success: true,
        data: files,
      };
    } catch (err) {
      return {
        success: false,
        data: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
