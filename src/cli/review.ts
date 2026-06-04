import { Command } from 'commander';
import { resolveLLMConfig } from '../core/config.js';
import { MicromatchRuleResolver } from '../rules/resolver.js';
import { runReview } from '../agent/agent.js';
import type { AgentArgs } from '../core/types.js';

export function reviewCommand(): Command {
  const cmd = new Command('review')
    .description('Run code review on the current workspace')
    .option('--diff-type <type>', 'Diff type: workspace, commit, or range', 'workspace')
    .option('--commit-range <range>', 'Commit range for review')
    .option('--model <model>', 'LLM model to use')
    .option('--extensions <exts>', 'Comma-separated extra extensions')
    .option('--exclude-patterns <patterns>', 'Comma-separated exclude patterns')
    .option('--max-tool-round <num>', 'Max tool call rounds', '20')
    .option('--top-p <value>', 'Top-p sampling parameter', '1')
    .option('--temperature <value>', 'Temperature parameter', '0.7')
    .option('--output <path>', 'Output file path')
    .action(async (options) => {
      const cwd = process.cwd();
      const llmConfig = resolveLLMConfig({});

      if (!llmConfig.token) {
        console.log(JSON.stringify({
          error: 'No LLM token configured. Set OCR_LLM_TOKEN environment variable.',
        }, null, 2));
        process.exit(1);
      }

      const args: AgentArgs = {
        workspace: cwd,
        diffType: options.diffType as AgentArgs['diffType'],
        commitRange: options.commitRange,
        rules: [],
        template: null as unknown as AgentArgs['template'],
        tools: [],
        llmConfig,
        model: options.model || llmConfig.model,
        extensions: options.extensions ? options.extensions.split(',') : [],
        excludePatterns: options.excludePatterns ? options.excludePatterns.split(',') : [],
        maxToolRound: parseInt(options.maxToolRound, 10) || 20,
        topP: parseFloat(options.topP) || 1,
        temperature: parseFloat(options.temperature) || 0.7,
        outputPath: options.output,
        maxPlanPhaseDiffSize: 500,
      };

      try {
        const result = await runReview(args);
        const output = JSON.stringify(result, null, 2);

        if (args.outputPath) {
          const { writeFile } = await import('node:fs/promises');
          await writeFile(args.outputPath, output, 'utf-8');
        } else {
          console.log(output);
        }
      } catch (err) {
        console.log(JSON.stringify({
          error: err instanceof Error ? err.message : String(err),
        }, null, 2));
        process.exit(1);
      }
    });

  return cmd;
}
