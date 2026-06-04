import { Command } from 'commander';
import { MicromatchRuleResolver, flattenRules } from '../rules/resolver.js';

export function rulesCommand(): Command {
  const cmd = new Command('rules')
    .description('Manage review rules');

  cmd
    .command('check')
    .description('Check which rules apply to a file')
    .argument('<file>', 'File path to check')
    .action((file: string) => {
      const resolver = new MicromatchRuleResolver();
      const rules = resolver.getRulesForFile(file);
      console.log(JSON.stringify({
        file,
        matchingRules: rules.length > 0 ? rules : ['(default rules applied)'],
        rulesCount: rules.length,
      }, null, 2));
    });

  cmd
    .command('list')
    .description('List all available rules')
    .action(() => {
      const resolver = new MicromatchRuleResolver();
      const allRules = resolver.getAllRules();
      const result = allRules.map((r) => ({
        name: r.name,
        description: r.description,
        globPattern: r.globPattern,
        ruleCount: r.rules.length,
      }));
      console.log(JSON.stringify(result, null, 2));
    });

  cmd
    .command('show')
    .description('Show full rule content for a rule name')
    .argument('<name>', 'Rule name (e.g., typescript, python)')
    .action((name: string) => {
      const resolver = new MicromatchRuleResolver();
      const allRules = resolver.getAllRules();
      const rule = allRules.find((r) => r.name === name);
      if (!rule) {
        console.log(JSON.stringify({ error: `Rule "${name}" not found` }, null, 2));
        return;
      }
      console.log(JSON.stringify(rule, null, 2));
    });

  return cmd;
}
