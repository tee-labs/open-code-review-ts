import OpenAI from 'openai';
import type {
  LLMConfig,
  LLMMessage,
  LLMResponse,
  ToolDefinition,
  ToolCall,
} from '../core/types.js';

export class LLMClient {
  private client: OpenAI;
  private model: string;

  constructor(config: LLMConfig) {
    this.client = new OpenAI({
      baseURL: config.url,
      apiKey: config.token,
    });
    this.model = config.model;
  }

  async chat(
    messages: LLMMessage[],
    tools: ToolDefinition[],
    options?: { topP?: number; temperature?: number },
  ): Promise<LLMResponse> {
    const openAIMessages = this.toOpenAIMessages(messages);
    const openAITools = tools.length > 0 ? this.toOpenAITools(tools) : undefined;

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: openAIMessages,
          tools: openAITools,
          top_p: options?.topP,
          temperature: options?.temperature,
        });

        return this.fromOpenAIResponse(response);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    throw lastError || new Error('LLM request failed');
  }

  private toOpenAIMessages(
    messages: LLMMessage[],
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return messages.map((msg) => {
      const content = msg.content ?? '';
      switch (msg.role) {
        case 'system':
          return { role: 'system', content } as const;
        case 'user':
          return { role: 'user', content } as const;
        case 'assistant':
          if (msg.tool_calls && msg.tool_calls.length > 0) {
            return {
              role: 'assistant',
              content: content || null,
              tool_calls: msg.tool_calls.map((tc) => ({
                id: tc.id,
                type: 'function' as const,
                function: { name: tc.name, arguments: tc.arguments },
              })),
            } as OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam;
          }
          return { role: 'assistant', content: content || null } as const;
        case 'tool':
          return {
            role: 'tool',
            tool_call_id: msg.tool_call_id || '',
            content,
          } as OpenAI.Chat.Completions.ChatCompletionToolMessageParam;
        default:
          return { role: 'user', content } as const;
      }
    });
  }

  private toOpenAITools(
    tools: ToolDefinition[],
  ): OpenAI.Chat.Completions.ChatCompletionTool[] {
    return tools.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters as Record<string, unknown>,
      },
    }));
  }

  private fromOpenAIResponse(
    response: OpenAI.Chat.Completions.ChatCompletion,
  ): LLMResponse {
    const choice = response.choices[0];
    if (!choice) {
      return { content: null, tool_calls: [], usage: null };
    }

    const message = choice.message;

    let toolCalls: ToolCall[] = [];
    if (message.tool_calls) {
      toolCalls = message.tool_calls.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: tc.function.arguments,
      }));
    }

    const usage = response.usage
      ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        }
      : null;

    return {
      content: message.content,
      tool_calls: toolCalls,
      usage,
    };
  }
}
