import { Command } from 'commander';
import { loadConfig, resolveLLMConfig } from '../core/config.js';

export function llmCommand(): Command {
  const cmd = new Command('llm')
    .description('LLM operations');

  cmd
    .command('test')
    .description('Test LLM connectivity')
    .option('--model <model>', 'Model to test')
    .action(async (options: { model?: string }) => {
      const config = loadConfig();
      const resolved = resolveLLMConfig(config);

      if (!resolved.token) {
        console.log(JSON.stringify({
          success: false,
          error: 'No LLM token configured. Set OCR_LLM_TOKEN env var or run "ocr config set llm.token <token>"',
          config: { url: resolved.url, model: options.model || resolved.model },
        }, null, 2));
        return;
      }

      try {
        const { default: OpenAI } = await import('openai');
        const client = new OpenAI({
          baseURL: resolved.url,
          apiKey: resolved.token,
        });

        const model = options.model || resolved.model;
        const response = await client.chat.completions.create({
          model,
          messages: [{ role: 'user', content: 'Reply with just: OK' }],
          max_tokens: 10,
        });

        console.log(JSON.stringify({
          success: true,
          model,
          response: response.choices[0]?.message?.content,
          usage: response.usage
            ? {
                promptTokens: response.usage.prompt_tokens,
                completionTokens: response.usage.completion_tokens,
              }
            : null,
        }, null, 2));
      } catch (err) {
        console.log(JSON.stringify({
          success: false,
          error: err instanceof Error ? err.message : String(err),
          config: { url: resolved.url, model: options.model || resolved.model },
        }, null, 2));
      }
    });

  return cmd;
}
