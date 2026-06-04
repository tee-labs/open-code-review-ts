import type { ToolDefinition, ToolContext, ToolResult, LlmComment } from '../core/types.js';
import type { Tool } from './types.js';

export class CodeCommentTool implements Tool {
  definition: ToolDefinition = {
    name: 'code_comment',
    description: 'Submit a code review comment with a suggestion.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'The file path being commented on' },
        content: { type: 'string', description: 'The review comment explaining the issue and suggestion' },
        existingCode: { type: 'string', description: 'The existing code that should be changed' },
        suggestionCode: { type: 'string', description: 'The suggested replacement code' },
        thinking: { type: 'string', description: 'Internal reasoning for this comment' },
      },
      required: ['path', 'content', 'existingCode', 'suggestionCode', 'thinking'],
    },
  };

  async execute(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
    const path = String(args.path || '');
    const content = String(args.content || '');
    const existingCode = String(args.existingCode || '');
    const suggestionCode = String(args.suggestionCode || '');
    const thinking = String(args.thinking || '');

    if (!path || !content) {
      return { success: false, data: null, error: 'path and content are required' };
    }

    const comment: LlmComment = {
      path,
      content,
      suggestionCode,
      existingCode,
      startLine: 0,
      endLine: 0,
      thinking,
    };

    ctx.commentCollector.addComment(comment);

    return {
      success: true,
      data: { message: 'Comment recorded successfully', path, commentCount: ctx.commentCollector.getComments().length },
    };
  }
}
