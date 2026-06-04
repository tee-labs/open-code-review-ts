import { Command } from 'commander';

export function versionCommand(): Command {
  return new Command('version')
    .description('Print version information')
    .action(() => {
      console.log(JSON.stringify({ version: '0.1.0', name: 'open-code-review-ts' }, null, 2));
    });
}
