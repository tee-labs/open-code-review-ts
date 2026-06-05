import { describe, it, expect } from 'vitest';
import { SystemRuleResolver, loadDefaultRules, flattenRules } from '../../src/rules/resolver.js';

describe('SystemRuleResolver', () => {
  const resolver = new SystemRuleResolver();

  it('resolves TypeScript files to ts_js_tsx_jsx rules', () => {
    const ruleText = resolver.resolve('src/test.ts');
    expect(ruleText).toBeTruthy();
    expect(ruleText.length).toBeGreaterThan(50);
    expect(ruleText).toContain('拼写错误');
  });

  it('resolves .tsx files to ts_js_tsx_jsx rules', () => {
    const ruleText = resolver.resolve('components/Button.tsx');
    expect(ruleText).toBeTruthy();
    expect(ruleText).toContain('React');
  });

  it('resolves .py files to default rules (no specific Python rule)', () => {
    const ruleText = resolver.resolve('src/test.py');
    expect(ruleText).toBeTruthy();
    expect(ruleText).toBe(resolver.resolve('somefile.xyz'));
  });

  it('resolves .java files to java rules', () => {
    const ruleText = resolver.resolve('src/Main.java');
    expect(ruleText).toBeTruthy();
    expect(ruleText.length).toBeGreaterThan(50);
    expect(ruleText).toContain('并发');
  });

  it('resolves .json files to json rules', () => {
    const ruleText = resolver.resolve('config.json');
    expect(ruleText).toBeTruthy();
    expect(ruleText.length).toBeGreaterThan(20);
  });

  it('falls back to default rule for unknown extensions', () => {
    const ruleText = resolver.resolve('somefile.xyz');
    expect(ruleText).toBeTruthy();
    expect(ruleText).toContain('Correctness');
  });

  it('returns default rule name for unknown files', () => {
    const name = resolver.resolveName('somefile.xyz');
    expect(name).toBe('default');
  });

  it('returns correct pattern name for .ts files', () => {
    const name = resolver.resolveName('src/test.ts');
    expect(name).toContain('ts,js,tsx,jsx');
  });

  it('handles nested paths correctly', () => {
    const ruleText = resolver.resolve('src/deeply/nested/path/util.ts');
    expect(ruleText.length).toBeGreaterThan(50);
  });
});

describe('loadDefaultRules', () => {
  it('loads system_rules.json and inlines markdown content', () => {
    const rules = loadDefaultRules();
    expect(rules.defaultRule).toBeTruthy();
    expect(rules.defaultRule.length).toBeGreaterThan(50);
    expect(rules.pathRules.length).toBeGreaterThan(0);

    const tsRule = rules.pathRules.find((pr) => pr.pattern.includes('ts'));
    expect(tsRule).toBeTruthy();
    expect(tsRule!.rule.length).toBeGreaterThan(50);
  });
});

describe('flattenRules', () => {
  it('formats rules as numbered list', () => {
    const result = flattenRules(['Rule one', 'Rule two']);
    expect(result).toBe('1. Rule one\n2. Rule two');
  });
});
