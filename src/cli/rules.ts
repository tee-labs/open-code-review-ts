import { Command } from 'commander';
import { SystemRuleResolver, loadDefaultRules } from '../rules/resolver.js';

export function rulesCommand(): Command {
  const cmd = new Command('rules')
    .description('Manage review rules');

  cmd
    .command('check')
    .description('Check which rule applies to a file')
    .argument('<file>', 'File path to check')
    .action((file: string) => {
      const resolver = new SystemRuleResolver();
      const ruleText = resolver.resolve(file);
      const ruleName = resolver.resolveName(file);
      console.log(JSON.stringify({
        file,
        matchingRule: ruleName,
      }, null, 2));
    });

  cmd
    .command('show')
    .description('Show rule content for a file or rule name')
    .argument('<file>', 'File path to check')
    .action((file: string) => {
      const resolver = new SystemRuleResolver();
      const ruleText = resolver.resolve(file);
      console.log(JSON.stringify({
        file,
        content: ruleText,
      }, null, 2));
    });

  cmd
    .command('list')
    .description('List all available rule mappings')
    .action(() => {
      const systemRules = loadDefaultRules();
      const pathRules = systemRules.pathRules.map((pr) => ({
        pattern: pr.pattern,
        rulePreview: pr.rule.split('\n').slice(0, 2).join('\n') + '...',
      }));
      console.log(JSON.stringify({
        defaultRule: systemRules.defaultRule.split('\n')[0],
        pathRules,
      }, null, 2));
    });

  return cmd;
}
