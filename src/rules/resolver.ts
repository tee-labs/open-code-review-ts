import micromatch from 'micromatch';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SystemRule, PathRule, Rule } from '../core/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load system rules from system-rules.json and rule-docs/*.md.
 * Matches Go's rules.LoadDefault() exactly:
 * 1. Parse system-rules.json to get default_rule + path_rule_map
 * 2. Read each referenced .md file and inline its content
 */
export function loadDefaultRules(): SystemRule {
  const configPath = join(__dirname, '..', 'config', 'system-rules.json');
  const rulesDir = join(__dirname, '..', 'config', 'rule-docs');

  const raw = JSON.parse(readFileSync(configPath, 'utf-8'));

  const defaultRuleFile: string = raw.default_rule;
  const defaultRule = readFileSync(join(rulesDir, defaultRuleFile), 'utf-8').replace(/\n$/, '');

  const pathRules: PathRule[] = [];
  for (const [pattern, ruleFile] of Object.entries(raw.path_rule_map)) {
    const content = readFileSync(join(rulesDir, ruleFile as string), 'utf-8').replace(/\n$/, '');
    pathRules.push({ pattern, rule: content });
  }

  return { defaultRule, pathRules };
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

  /**
   * Resolve returns the rule text for a given file path.
   * First match wins; if none match, falls back to defaultRule.
   * Matches Go's SystemRule.Resolve() exactly.
   */
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

/**
 * Flatten a list of rule items into a numbered checklist string.
 * Used for custom/user rules that come as string arrays.
 */
export function flattenRules(rules: string[]): string {
  return rules.map((r, i) => `${i + 1}. ${r}`).join('\n');
}

/**
 * Expand brace patterns like "{ts,js,tsx,jsx}" into multiple patterns.
 * Matches Go's expandBraces() exactly.
 */
function expandBraces(s: string): string[] {
  const openIdx = s.indexOf('{');
  if (openIdx < 0) return [s];

  const closeIdx = s.indexOf('}', openIdx);
  if (closeIdx < 0) return [s];

  const prefix = s.slice(0, openIdx);
  const suffix = s.slice(closeIdx + 1);
  const options = s.slice(openIdx + 1, closeIdx).split(',');

  return options.map((opt) => prefix + opt + suffix);
}
