import micromatch from 'micromatch';
import type { SystemRule } from '../core/types.js';
import { buildEmbeddedRules } from '../config/rules-data.js';

/**
 * Load system rules — reads from embedded data (no filesystem I/O).
 * Matches Go's rules.LoadDefault() exactly.
 */
export function loadDefaultRules(): SystemRule {
  return buildEmbeddedRules();
}

/**
 * SystemRuleResolver — matches Go's rules.SystemRule.
 * Resolves a file path to its full rule markdown content.
 */
export class SystemRuleResolver {
  private rule: SystemRule;

  constructor(rule?: SystemRule) {
    this.rule = rule ?? loadDefaultRules();
  }

  resolve(path: string): string {
    const normalized = path.replace(/\\/g, '/').toLowerCase();
    for (const pr of this.rule.pathRules) {
      const expanded = expandBraces(pr.pattern);
      for (const p of expanded) {
        if (micromatch.isMatch(normalized, p, { dot: true })) {
          return pr.rule;
        }
      }
    }
    return this.rule.defaultRule;
  }

  resolveName(path: string): string {
    const normalized = path.replace(/\\/g, '/').toLowerCase();
    for (const pr of this.rule.pathRules) {
      const expanded = expandBraces(pr.pattern);
      for (const p of expanded) {
        if (micromatch.isMatch(normalized, p, { dot: true })) {
          return pr.pattern;
        }
      }
    }
    return 'default';
  }
}

export function flattenRules(rules: string[]): string {
  return rules.map((r, i) => `${i + 1}. ${r}`).join('\n');
}

function expandBraces(s: string): string[] {
  const openIdx = s.indexOf('{');
  if (openIdx < 0) return [s];
  let closeIdx = s.indexOf('}', openIdx);
  if (closeIdx < 0) return [s];
  const prefix = s.slice(0, openIdx);
  const suffix = s.slice(closeIdx + 1);
  const options = s.slice(openIdx + 1, closeIdx).split(',');
  return options.map(opt => prefix + opt + suffix);
}
