import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { ReviewAgent } from '../../src/agent/agent.js';
import { LLMProtocol } from '../../src/core/types.js';
import type { AgentArgs } from '../../src/core/types.js';

vi.mock('../../src/llm/client.js', () => ({
  LLMClient: vi.fn().mockImplementation(() => ({
    chat: vi.fn().mockResolvedValue({
      content: 'Review complete',
      tool_calls: [],
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    }),
  })),
}));

function makeTempGitRepo(): string {
  const dir = join(tmpdir(), `ocr-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  execSync('git init', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email test@test.com', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name Test', { cwd: dir, stdio: 'pipe' });
  writeFileSync(join(dir, 'test.ts'), 'const x = 1;\n');
  execSync('git add -A && git commit -m "init"', { cwd: dir, stdio: 'pipe' });
  return dir;
}

describe('ReviewAgent', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempGitRepo();
  });

  it('can be instantiated', () => {
    const args: AgentArgs = {
      workspace: tempDir,
      diffType: 'workspace',
      rules: [],
      template: {
        mainTask: [],
        planTask: [],
        memoryCompressionTask: [],
        reLocationTask: [],
      },
      tools: [],
      llmConfig: { url: 'https://api.test.com', token: 'test', model: 'gpt-4o', protocol: LLMProtocol.OpenAI },
      model: 'gpt-4o',
      extensions: [],
      excludePatterns: [],
      maxToolRound: 3,
      topP: 1,
      temperature: 0.7,
      maxPlanPhaseDiffSize: 500,
    };
    const agent = new ReviewAgent(args);
    expect(agent).toBeDefined();
  });

  it('runs review with empty diff gracefully', async () => {
    const args: AgentArgs = {
      workspace: tempDir,
      diffType: 'workspace',
      rules: [],
      template: {
        mainTask: [],
        planTask: [],
        memoryCompressionTask: [],
        reLocationTask: [],
      },
      tools: [],
      llmConfig: { url: 'https://api.test.com', token: 'test', model: 'gpt-4o', protocol: LLMProtocol.OpenAI },
      model: 'gpt-4o',
      extensions: [],
      excludePatterns: [],
      maxToolRound: 3,
      topP: 1,
      temperature: 0.7,
      maxPlanPhaseDiffSize: 500,
    };
    const agent = new ReviewAgent(args);
    const result = await agent.run();
    expect(result).toBeDefined();
    expect(Array.isArray(result.comments)).toBe(true);
  });
});
