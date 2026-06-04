import { Command } from 'commander';
import { reviewCommand } from './review.js';
import { configCommand } from './config.js';
import { rulesCommand } from './rules.js';
import { llmCommand } from './llm.js';
import { versionCommand } from './version.js';

const program = new Command();

program
  .name('ocr')
  .description('AI-powered code review tool')
  .version('0.1.0');

program.addCommand(reviewCommand());
program.addCommand(configCommand());
program.addCommand(rulesCommand());
program.addCommand(llmCommand());
program.addCommand(versionCommand());

program.parse(process.argv);
