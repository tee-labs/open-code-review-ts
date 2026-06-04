import type { ToolDefinition, ToolContext, ToolResult } from '../core/types.js';
import type { Tool } from './types.js';

export class TaskDoneTool implements Tool {
  definition: ToolDefinition = {
    name: 'task_done',
    description: 'Signal that the review task is complete. Call this when you have finished reviewing and submitted all comments.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['DONE', 'FAILED'],
          description: 'The completion status',
        },
        summary: {
          type: 'string',
          description: 'Brief summary of what was done',
        },
      },
      required: ['status'],
    },
  };

  async execute(args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolResult> {
    const status = String(args.status || 'DONE');
    const summary = args.summary ? String(args.summary) : '';

    return {
      success: true,
      data: {
        status: status === 'FAILED' ? 'FAILED' : 'DONE',
        summary,
        _done: true, // Signal to the agent loop that task is complete
      },
    };
  }
}
