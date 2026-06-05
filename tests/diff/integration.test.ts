import { describe, it, expect } from 'vitest';
import { parseDiff } from '../../src/diff/parser.js';
import { countTokens } from '../../src/util/tokenizer.js';
import { SystemRuleResolver } from '../../src/rules/resolver.js';

describe('Integration: End-to-end diff processing', () => {
  const sampleDiff = `diff --git a/src/index.ts b/src/index.ts
index abc123..def456 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,5 +1,7 @@
 import { foo } from './foo';
+import { bar } from './bar';
 
 function hello() {
   console.log('hi');
+  bar();
 }
@@ -10,5 +12,6 @@ function world() {
   return 'world';
+  return 'earth';
 }`;

  it('parses diff and extracts file paths correctly', () => {
    const diffs = parseDiff(sampleDiff);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].oldPath).toBe('src/index.ts');
    expect(diffs[0].newPath).toBe('src/index.ts');
    expect(diffs[0].hunks).toHaveLength(2);
    expect(diffs[0].insertions).toBe(3);
    expect(diffs[0].deletions).toBe(0);
  });

  it('resolver applies correct rule to .ts files', () => {
    const resolver = new SystemRuleResolver();
    const ruleText = resolver.resolve('src/index.ts');
    expect(ruleText.length).toBeGreaterThan(50);
    expect(ruleText).toContain('React');
  });
});
