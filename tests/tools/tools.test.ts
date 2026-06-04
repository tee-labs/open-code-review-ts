import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolRegistry } from '../../src/tools/registry.js';
import { FileReadTool } from '../../src/tools/file-read.js';
import { FileFindTool } from '../../src/tools/file-find.js';
import { CodeSearchTool } from '../../src/tools/code-search.js';
import { CodeCommentTool } from '../../src/tools/code-comment.js';
import { TaskDoneTool } from '../../src/tools/task-done.js';
import type { ToolContext, ToolCall, LlmComment } from '../../src/core/types.js';

function createMockContext(overrides?: Partial<ToolContext>): ToolContext {
  const comments: LlmComment[] = [];
  return {
    workspace: '/test/workspace',
    blockedFiles: new Set(['blocked.txt']),
    git: {
      raw: vi.fn(),
    } as unknown as ToolContext['git'],
    commentCollector: {
      comments,
      addComment(c: LlmComment) { comments.push(c); },
      getComments() { return [...comments]; },
    },
    ...overrides,
  };
}

describe('ToolRegistry', () => {
  it('registers and retrieves tools', () => {
    const registry = new ToolRegistry();
    registry.register(new FileReadTool());
    registry.register(new TaskDoneTool());

    expect(registry.get('file_read')).toBeDefined();
    expect(registry.get('task_done')).toBeDefined();
    expect(registry.get('unknown')).toBeUndefined();
  });

  it('returns tool definitions', () => {
    const registry = new ToolRegistry();
    registry.register(new TaskDoneTool());

    const defs = registry.getDefinitions();
    expect(defs).toHaveLength(1);
    expect(defs[0].name).toBe('task_done');
  });

  it('returns error for unknown tool', async () => {
    const registry = new ToolRegistry();
    const result = await registry.execute(
      { id: '1', name: 'unknown', arguments: '{}' },
      createMockContext(),
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown tool');
  });
});

describe('FileReadTool', () => {
  it('has correct definition', () => {
    const tool = new FileReadTool();
    expect(tool.definition.name).toBe('file_read');
    expect(tool.definition.parameters).toHaveProperty('properties.path');
  });

  it('rejects blocked files', async () => {
    const tool = new FileReadTool();
    const ctx = createMockContext({ blockedFiles: new Set(['secret.txt']) });
    const result = await tool.execute({ path: 'secret.txt' }, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toContain('blocked');
  });
});

describe('FileFindTool', () => {
  it('has correct definition', () => {
    const tool = new FileFindTool();
    expect(tool.definition.name).toBe('file_find');
  });

  it('rejects empty pattern', async () => {
    const tool = new FileFindTool();
    const result = await tool.execute({}, createMockContext());
    expect(result.success).toBe(false);
    expect(result.error).toContain('pattern is required');
  });
});

describe('CodeSearchTool', () => {
  it('has correct definition', () => {
    const tool = new CodeSearchTool();
    expect(tool.definition.name).toBe('code_search');
  });
});

describe('CodeCommentTool', () => {
  it('adds comment to collector', async () => {
    const tool = new CodeCommentTool();
    const ctx = createMockContext();
    const result = await tool.execute({
      path: 'src/test.ts',
      content: 'This could be improved',
      existingCode: 'old code',
      suggestionCode: 'new code',
      thinking: 'Because...',
    }, ctx);

    expect(result.success).toBe(true);
    expect(ctx.commentCollector.getComments()).toHaveLength(1);
    expect(ctx.commentCollector.getComments()[0].path).toBe('src/test.ts');
  });

  it('rejects missing path', async () => {
    const tool = new CodeCommentTool();
    const result = await tool.execute({
      content: 'comment',
      existingCode: '',
      suggestionCode: '',
      thinking: '',
    }, createMockContext());
    expect(result.success).toBe(false);
  });
});

describe('TaskDoneTool', () => {
  it('returns DONE status', async () => {
    const tool = new TaskDoneTool();
    const result = await tool.execute({ status: 'DONE', summary: 'Review complete' }, createMockContext());
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ status: 'DONE', _done: true });
  });

  it('returns FAILED status', async () => {
    const tool = new TaskDoneTool();
    const result = await tool.execute({ status: 'FAILED' }, createMockContext());
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ status: 'FAILED', _done: true });
  });
});
