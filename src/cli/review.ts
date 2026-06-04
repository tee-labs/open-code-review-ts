import { Command } from 'commander';
import { loadConfig, resolveLLMConfig } from '../core/config.js';
import { MicromatchRuleResolver } from '../rules/resolver.js';
import { runReview } from '../agent/agent.js';
import { isExcluded, isAllowedExtension } from '../config/file-filters.js';
import type { AgentArgs } from '../core/types.js';

export function reviewCommand(): Command {
  const cmd = new Command('review')
    .description('Run code review on the current workspace')
    .option('--from <ref>', 'Source ref to start diff from (e.g. main)')
    .option('--to <ref>', 'Target ref to end diff at (e.g. feature-branch)')
    .option('-c, --commit <hash>', 'Single commit hash or tag to review (vs its parent)')
    .option('--model <model>', 'LLM model to use')
    .option('--extensions <exts>', 'Comma-separated extra extensions')
    .option('--exclude-patterns <patterns>', 'Comma-separated exclude patterns')
    .option('--max-tool-round <num>', 'Max tool call rounds', '20')
    .option('--top-p <value>', 'Top-p sampling parameter', '1')
    .option('--temperature <value>', 'Temperature parameter', '0.7')
    .option('--output <path>', 'Output file path')
    .option('--concurrency <num>', 'Max concurrent file reviews', '8')
    .option('-b, --background <context>', 'Business context / requirements for the review')
    .option('-p, --preview', 'List files to review without running LLM')
    .action(async (options) => {
      const cwd = process.cwd();
      const llmConfig = resolveLLMConfig(loadConfig());

      const modeCount = (options.from || options.to ? 1 : 0) + (options.commit ? 1 : 0);
      if (modeCount > 1) {
        console.log(JSON.stringify({ error: 'Only one review mode allowed (--from/--to or --commit)' }, null, 2));
        process.exit(1);
      }
      if (options.from && !options.to) {
        console.log(JSON.stringify({ error: '--to is required when --from is specified' }, null, 2));
        process.exit(1);
      }
      if (options.to && !options.from) {
        console.log(JSON.stringify({ error: '--from is required when --to is specified' }, null, 2));
        process.exit(1);
      }

      if (!llmConfig.token && !options.preview) {
        console.log(JSON.stringify({
          error: 'No LLM token configured. Set OCR_LLM_TOKEN environment variable.',
        }, null, 2));
        process.exit(1);
      }

      const concurrency = parseInt(options.concurrency, 10);
      if (concurrency < 1) {
        console.log(JSON.stringify({ error: '--concurrency must be >= 1' }, null, 2));
        process.exit(1);
      }

      const args: AgentArgs = {
        workspace: cwd,
        from: options.from,
        to: options.to,
        commit: options.commit,
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
        background: options.background,
        preview: options.preview ?? false,
        concurrency,
      };

      if (args.preview) {
        const { GitDiffProvider } = await import('../diff/git.js');
        const provider = new GitDiffProvider(args.workspace);
        const mode = args.commit ? 'commit' : (args.from ? 'range' : 'workspace');
        const diffs = await provider.getDiffs({ mode, from: args.from, to: args.to, commit: args.commit });
        const filtered = diffs.filter(d => {
          const path = d.newPath || d.oldPath;
          return isAllowedExtension(path, args.extensions) && !isExcluded(path, args.excludePatterns);
        });
        const result = {
          mode,
          files: filtered.map(d => ({
            path: d.newPath || d.oldPath,
            insertions: d.insertions,
            deletions: d.deletions,
            status: d.status,
          })),
          totalFiles: filtered.length,
          totalInsertions: filtered.reduce((s, d) => s + d.insertions, 0),
          totalDeletions: filtered.reduce((s, d) => s + d.deletions, 0),
        };
        const output = JSON.stringify(result, null, 2);
        if (args.outputPath) {
          const { writeFile } = await import('node:fs/promises');
          await writeFile(args.outputPath, output, 'utf-8');
        } else {
          console.log(output);
        }
        return;
      }

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
