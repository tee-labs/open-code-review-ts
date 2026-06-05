import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { loadConfig, saveConfig } from '../core/config.js';

export function configCommand(): Command {
  const cmd = new Command('config')
    .description('Manage configuration');

  cmd
    .command('show')
    .description('Show current configuration')
    .action(() => {
      const config = loadConfig();
      console.log(JSON.stringify(config, null, 2));
    });

  cmd
    .command('set')
    .description('Set a configuration value (e.g., llm.token, llm.model)')
    .argument('<key>', 'Config key (e.g., llm.token)')
    .argument('<value>', 'Config value')
    .action(async (key: string, value: string) => {
      const config = loadConfig();
      const keys = key.split('.');
      
      let current: Record<string, unknown> = config as unknown as Record<string, unknown>;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
          current[keys[i]] = {};
        }
        current = current[keys[i]] as Record<string, unknown>;
      }
      current[keys[keys.length - 1]] = value;

      saveConfig(config);
      console.log(JSON.stringify({ success: true, key, value }, null, 2));
    });

  cmd
    .command('init')
    .description('Initialize default configuration')
    .action(() => {
      const configPath = join(homedir(), '.opencodereview', 'config.json');
      if (existsSync(configPath)) {
        console.log(JSON.stringify({ message: 'Config already exists at: ' + configPath }, null, 2));
        return;
      }
      saveConfig({
        llm: {
          url: 'https://api.openai.com/v1',
          token: '',
          model: 'gpt-4o',
        },
        language: 'Chinese',
        extensions: [],
        excludePatterns: [],
        maxToolRound: 20,
        topP: 1,
        temperature: 0.7,
      });
      console.log(JSON.stringify({ message: 'Config created at: ' + configPath }, null, 2));
    });

  return cmd;
}
