import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Stream } from 'openai/streaming';

/**
 * Create an async iterable that mimics an OpenAI stream chunk.
 * The LLM client always uses stream: true, so we must return
 * a proper async iterable from the mock.
 */
function streamChunk(content: string | null, toolCalls?: Array<{ id: string; name: string; args: string; index: number }>, usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }): AsyncIterable<any> {
  const choices: any[] = [{
    delta: {
      content,
      tool_calls: toolCalls?.map(tc => ({
        index: tc.index,
        id: tc.id,
        function: { name: tc.name, arguments: tc.args },
      })),
    },
    index: 0,
  }];

  const chunk = { choices, usage };
  return {
    [Symbol.asyncIterator]() {
      let delivered = false;
      return {
        next() {
          if (delivered) return Promise.resolve({ done: true, value: undefined });
          delivered = true;
          return Promise.resolve({ done: false, value: chunk });
        },
      };
    },
  };
}

vi.mock('openai', () => {
  const mockCreate = vi.fn();
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
      constructor() {
        (globalThis as any).__openaiMockCreate = mockCreate;
      }
    },
  };
});

import { LLMClient } from '../../src/llm/client.js';
import { LLMProtocol } from '../../src/core/types.js';
import type { LLMConfig, LLMMessage } from '../../src/core/types.js';

const testConfig: LLMConfig = {
  url: 'https://api.openai.com/v1',
  token: 'test-token',
  model: 'gpt-4o',
  protocol: LLMProtocol.OpenAI,
};

describe('LLMClient', () => {
  let client: LLMClient;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new LLMClient(testConfig);
    mockCreate = (globalThis as any).__openaiMockCreate;
    mockCreate.mockReset();
  });

  it('handles basic chat completion', async () => {
    mockCreate.mockResolvedValueOnce(streamChunk('Test response', undefined, { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }));

    const messages: LLMMessage[] = [
      { role: 'system', content: 'You are a reviewer' },
      { role: 'user', content: 'Review this code' },
    ];

    const response = await client.chat(messages, []);
    expect(response.content).toBe('Test response');
    expect(response.tool_calls).toEqual([]);
    expect(response.usage).toEqual({ promptTokens: 10, completionTokens: 5, totalTokens: 15 });
  });

  it('handles tool call responses', async () => {
    mockCreate.mockResolvedValueOnce(streamChunk(null, [
      { id: 'call_1', name: 'task_done', args: '{"status":"DONE"}', index: 0 },
    ]));

    const messages: LLMMessage[] = [
      { role: 'user', content: 'Review this code' },
    ];

    const response = await client.chat(messages, [
      { name: 'task_done', description: 'Finish', parameters: {} },
    ]);

    expect(response.content).toBeNull();
    expect(response.tool_calls).toHaveLength(1);
    expect(response.tool_calls[0].name).toBe('task_done');
    expect(response.tool_calls[0].arguments).toBe('{"status":"DONE"}');
  });

  it('retries on failure', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Network error'));
    mockCreate.mockRejectedValueOnce(new Error('Network error'));
    mockCreate.mockResolvedValueOnce(streamChunk('Retry worked'));

    const messages: LLMMessage[] = [{ role: 'user', content: 'Hi' }];
    const response = await client.chat(messages, []);
    expect(response.content).toBe('Retry worked');
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it('exhausts retries and throws', async () => {
    mockCreate.mockRejectedValue(new Error('Persistent error'));

    const messages: LLMMessage[] = [{ role: 'user', content: 'Hi' }];
    await expect(client.chat(messages, [])).rejects.toThrow('Persistent error');
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it('throws after exhausting retries', async () => {
    mockCreate.mockRejectedValue(new Error('Server error'));

    await expect(
      client.chat([{ role: 'user', content: 'hi' }], []),
    ).rejects.toThrow('Server error');
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });
});
