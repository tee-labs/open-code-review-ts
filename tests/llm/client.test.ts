import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
        // Assign mock so tests can access it
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
    mockCreate.mockResolvedValueOnce({
      id: 'test-id',
      choices: [
        {
          message: {
            content: 'Test response',
            role: 'assistant',
            tool_calls: null,
          },
          finish_reason: 'stop',
          index: 0,
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    });

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
    mockCreate.mockResolvedValueOnce({
      id: 'test-id',
      choices: [
        {
          message: {
            content: null,
            role: 'assistant',
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: { name: 'task_done', arguments: '{"status":"DONE"}' },
              },
            ],
          },
          finish_reason: 'tool_calls',
          index: 0,
        },
      ],
      usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
    });

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
    mockCreate
      .mockRejectedValueOnce(new Error('Rate limit'))
      .mockResolvedValueOnce({
        id: 'test-id',
        choices: [{ message: { content: 'OK', role: 'assistant', tool_calls: null }, finish_reason: 'stop', index: 0 }],
        usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
      });

    const response = await client.chat([{ role: 'user', content: 'hi' }], []);
    expect(response.content).toBe('OK');
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting retries', async () => {
    mockCreate.mockRejectedValue(new Error('Server error'));

    await expect(
      client.chat([{ role: 'user', content: 'hi' }], []),
    ).rejects.toThrow('Server error');
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });
});
