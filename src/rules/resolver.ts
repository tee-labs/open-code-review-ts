import micromatch from 'micromatch';
import type { Rule } from '../core/types.js';
import { DEFAULT_RULES } from '../config/default-rules.js';

export interface RuleResolver {
  getRulesForFile(filePath: string): string[];
  getAllRules(): Rule[];
}

export class MicromatchRuleResolver implements RuleResolver {
  private rules: Rule[];

  constructor(rules: Rule[] = DEFAULT_RULES) {
    this.rules = [...rules].sort((a, b) => b.globPattern.length - a.globPattern.length);
  }

  getRulesForFile(filePath: string): string[] {
    const normalizedPath = filePath.replace(/\\/g, '/');
    for (const rule of this.rules) {
      if (micromatch.isMatch(normalizedPath, rule.globPattern, { dot: true })) {
        return rule.rules;
      }
    }
    return [];
  }

  getAllRules(): Rule[] {
    return [...this.rules];
  }
}

export function flattenRules(rules: string[]): string {
  return rules.map((r, i) => `${i + 1}. ${r}`).join('\n');
}
