import type { ToolDefinition, ToolContext, ToolResult } from '../core/types.js';
import type { Tool } from './types.js';

export class CodeSearchTool implements Tool {
  definition: ToolDefinition = {
    name: 'code_search',
    description: 'Search for code patterns in the repository using git grep. Use this to find usages of functions, classes, or patterns.',
    parameters: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Search pattern (string or regex)' },
        path: { type: 'string', description: 'Optional path filter to narrow the search scope' },
      },
      required: ['pattern'],
    },
  };

  async execute(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
    const pattern = String(args.pattern || '');
    if (!pattern) {
      return { success: false, data: null, error: 'pattern is required' };
    }

    const pathFilter = args.path ? String(args.path) : undefined;

    try {
      const rawArgs = ['grep', '-n', '--heading', '-I', pattern];
      if (pathFilter) rawArgs.push('--', pathFilter);

      const result = await ctx.git.raw(rawArgs);
      const matches = parseGitGrepOutput(result);

      return {
        success: true,
        data: matches,
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

function parseGitGrepOutput(output: string): Array<{ file: string; line: string; lineNumber: number }> {
  const results: Array<{ file: string; line: string; lineNumber: number }> = [];
  const lines = output.split('\n');
  let currentFile = '';

  for (const line of lines) {
    if (!line) continue;

    if (lines.indexOf(line) < lines.length - 1 && !line.includes(':')) {
      currentFile = line;
      continue;
    }

    if (line.includes(':')) {
      const sepIndex = line.indexOf(':');
      const potentialFile = line.slice(0, sepIndex);
      const rest = line.slice(sepIndex + 1);

      if (rest.includes(':')) {
        const lineSep = rest.indexOf(':');
        const lineNumStr = rest.slice(0, lineSep);
        const lineNum = parseInt(lineNumStr, 10);
        if (!isNaN(lineNum)) {
          results.push({
            file: potentialFile,
            lineNumber: lineNum,
            line: rest.slice(lineSep + 1),
          });
        }
      }
    }
  }

  return results;
}
