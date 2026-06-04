import type { ToolDefinition } from '../core/types.js';

/**
 * Default tool definitions that the LLM can call during review.
 * These match the original tools.json structure.
 */

export const MAIN_TASK_TOOLS: ToolDefinition[] = [
  {
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
      required: ['status', 'summary'],
    },
  },
  {
    name: 'code_comment',
    description: 'Submit a code review comment with a suggestion. Use this to provide feedback on specific code in the diff.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The file path being commented on',
        },
        content: {
          type: 'string',
          description: 'The review comment explaining the issue and suggestion',
        },
        existingCode: {
          type: 'string',
          description: 'The existing code that should be changed',
        },
        suggestionCode: {
          type: 'string',
          description: 'The suggested replacement code',
        },
        thinking: {
          type: 'string',
          description: 'Internal reasoning for this comment',
        },
      },
      required: ['path', 'content', 'existingCode', 'suggestionCode', 'thinking'],
    },
  },
  {
    name: 'file_read',
    description: 'Read a file from the repository. Use this to read source files for more context beyond the diff.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative path to the file to read',
        },
        startLine: {
          type: 'number',
          description: 'Start line number (1-indexed, optional)',
        },
        endLine: {
          type: 'number',
          description: 'End line number (inclusive, optional)',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'file_find',
    description: 'Find files in the repository matching a search pattern. Uses git ls-files internally.',
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Glob pattern to search for files (e.g., **/*.ts, **/utils/**)',
        },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'code_search',
    description: 'Search for code patterns in the repository using git grep. Use this to find usages of functions, classes, or patterns.',
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Search pattern (string or regex)',
        },
        path: {
          type: 'string',
          description: 'Optional path filter to narrow the search scope',
        },
      },
      required: ['pattern'],
    },
  },
];

export const PLAN_TASK_TOOLS: ToolDefinition[] = [
  {
    name: 'task_done',
    description: 'Signal that the planning phase is complete.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['DONE', 'FAILED'],
          description: 'The completion status',
        },
        plan: {
          type: 'string',
          description: 'The review plan',
        },
      },
      required: ['status'],
    },
  },
  {
    name: 'file_read',
    description: 'Read a file from the repository.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative path to the file to read',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'file_find',
    description: 'Find files in the repository matching a search pattern.',
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Glob pattern to search for files',
        },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'code_search',
    description: 'Search for code patterns in the repository.',
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Search pattern (string or regex)',
        },
      },
      required: ['pattern'],
    },
  },
];
