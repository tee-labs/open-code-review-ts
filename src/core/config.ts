/**
 * User config management for ~/.opencodereview/config.json
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { UserConfig, LLMProtocol } from './types.js';

const CONFIG_DIR = join(homedir(), '.opencodereview');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

export function getConfigPath(): string {
  return CONFIG_PATH;
}

export function loadConfig(): UserConfig {
  try {
    if (existsSync(CONFIG_PATH)) {
      const raw = readFileSync(CONFIG_PATH, 'utf-8');
      return JSON.parse(raw) as UserConfig;
    }
  } catch {
    // corrupted config, return default
  }
  return {};
}

export function saveConfig(config: UserConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    writeFileSync(CONFIG_DIR, '', 'utf-8');
    // Actually create the directory
    const { mkdirSync } = require('node:fs');
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export function resolveLLMConfig(config: UserConfig): {
  url: string;
  token: string;
  model: string;
  protocol: LLMProtocol;
} {
  // Priority: 1. ENV vars 2. Config file
  const url = process.env.OCR_LLM_URL || config.llm?.url || 'https://api.openai.com/v1';
  const token = process.env.OCR_LLM_TOKEN || config.llm?.token || '';
  const model = process.env.OCR_LLM_MODEL || config.llm?.model || 'gpt-4o';

  return { url, token, model, protocol: 'openai' as LLMProtocol };
}
