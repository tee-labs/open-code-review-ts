import type { ToolDefinition, ToolContext, ToolResult } from '../core/types.js';

export interface Tool {
  definition: ToolDefinition;
  execute(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult>;
}
