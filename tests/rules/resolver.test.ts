import { describe, it, expect } from 'vitest';
import { MicromatchRuleResolver, flattenRules } from '../../src/rules/resolver.js';
import type { Rule } from '../../src/core/types.js';

describe('MicromatchRuleResolver', () => {
  const resolver = new MicromatchRuleResolver();

  it('returns TypeScript rules for .ts files', () => {
    const rules = resolver.getRulesForFile('src/test.ts');
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.some((r) => r.toLowerCase().includes('type'))).toBe(true);
  });

  it('returns Python rules for .py files', () => {
    const rules = resolver.getRulesForFile('src/test.py');
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.some((r) => r.toLowerCase().includes('exception') || r.toLowerCase().includes('none'))).toBe(true);
  });

  it('returns default rules for unknown files', () => {
    const rules = resolver.getRulesForFile('somefile.xyz');
    // Default rules should match anything
    expect(rules.length).toBeGreaterThan(0);
  });

  it('prefers more specific pattern', () => {
    const customRules: Rule[] = [
      { name: 'all', description: 'Generic', globPattern: '**/*', rules: ['generic rule'] },
      { name: 'ts-specific', description: 'TS', globPattern: '**/*.ts', rules: ['typescript specific'] },
    ];
    const customResolver = new MicromatchRuleResolver(customRules);
    const rules = customResolver.getRulesForFile('src/test.ts');
    expect(rules).toContain('typescript specific');
  });

  it('handles nested paths correctly', () => {
    const rules = resolver.getRulesForFile('src/components/Button.tsx');
    expect(rules.length).toBeGreaterThan(0);
  });
});

describe('flattenRules', () => {
  it('formats rules as numbered list', () => {
    const result = flattenRules(['Rule one', 'Rule two']);
    expect(result).toBe('1. Rule one\n2. Rule two');
  });
});
