import type { ToolDefinition, ToolCall, ToolContext, ToolResult } from '../core/types.js';
import type { Tool } from './types.js';

export class ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool): void {
    this.tools.set(tool.definition.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  async execute(toolCall: ToolCall, ctx: ToolContext): Promise<ToolResult> {
    const tool = this.tools.get(toolCall.name);
    if (!tool) {
      return { success: false, data: null, error: `Unknown tool: ${toolCall.name}` };
    }

    let args: Record<string, unknown>;
    try {
      args = JSON.parse(toolCall.arguments);
    } catch {
      return { success: false, data: null, error: 'Invalid arguments JSON' };
    }

    return tool.execute(args, ctx);
  }
}
