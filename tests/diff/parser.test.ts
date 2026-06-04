import { describe, it, expect } from 'vitest';
import { parseHunkHeader, parseHunkLines, parseHunk } from '../../src/diff/hunk.js';
import { parseDiff } from '../../src/diff/parser.js';
import { LineNumberResolver } from '../../src/diff/resolver.js';
import { buildRelocationMessages, parseRelocationResponse } from '../../src/diff/relocation.js';
import type { Hunk, HunkLine } from '../../src/core/types.js';

describe('parseHunkHeader', () => {
  it('parses a standard hunk header', () => {
    const result = parseHunkHeader('@@ -1,5 +1,7 @@ export function test() {');
    expect(result).not.toBeNull();
    expect(result!.oldStart).toBe(1);
    expect(result!.oldLines).toBe(5);
    expect(result!.newStart).toBe(1);
    expect(result!.newLines).toBe(7);
    expect(result!.header).toBe('export function test() {');
  });

  it('parses hunk header with single lines', () => {
    const result = parseHunkHeader('@@ -1 +1 @@');
    expect(result).not.toBeNull();
    expect(result!.oldStart).toBe(1);
    expect(result!.oldLines).toBe(1);
    expect(result!.newStart).toBe(1);
    expect(result!.newLines).toBe(1);
    expect(result!.header).toBe('');
  });

  it('parses hunk header with file header context', () => {
    const result = parseHunkHeader('@@ -10,15 +10,17 @@ import { something }');
    expect(result).not.toBeNull();
    expect(result!.oldStart).toBe(10);
    expect(result!.oldLines).toBe(15);
    expect(result!.newStart).toBe(10);
    expect(result!.newLines).toBe(17);
  });

  it('returns null for non-hunk line', () => {
    const result = parseHunkHeader('diff --git a/test.ts b/test.ts');
    expect(result).toBeNull();
  });
});

describe('parseHunkLines', () => {
  it('parses context, added, and deleted lines', () => {
    const lines = [' context', '+added', '-deleted'];
    const result = parseHunkLines(lines, 1, 1);

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ type: 'context', content: 'context', oldLineNo: 1, newLineNo: 1 });
    expect(result[1]).toMatchObject({ type: 'added', content: 'added', oldLineNo: null, newLineNo: 2 });
    expect(result[2]).toMatchObject({ type: 'deleted', content: 'deleted', oldLineNo: 2, newLineNo: null });
  });

  it('tracks line numbers correctly across mixed lines', () => {
    const lines = [' a', '+b', '-c', ' d', '+e'];
    const result = parseHunkLines(lines, 10, 20);

    expect(result[0]).toMatchObject({ type: 'context', content: 'a', oldLineNo: 10, newLineNo: 20 });
    expect(result[1]).toMatchObject({ type: 'added', content: 'b', oldLineNo: null, newLineNo: 21 });
    expect(result[2]).toMatchObject({ type: 'deleted', content: 'c', oldLineNo: 11, newLineNo: null });
    expect(result[3]).toMatchObject({ type: 'context', content: 'd', oldLineNo: 12, newLineNo: 22 });
    expect(result[4]).toMatchObject({ type: 'added', content: 'e', oldLineNo: null, newLineNo: 23 });
  });
});

describe('parseDiff', () => {
  const BASIC_DIFF = `diff --git a/src/test.ts b/src/test.ts
index abc123..def456 100644
--- a/src/test.ts
+++ b/src/test.ts
@@ -1,5 +1,7 @@
 line1
 line2
+added line
 line3
+another added
 line4
-removed line
 line5`;

  it('parses a basic unified diff', () => {
    const result = parseDiff(BASIC_DIFF);
    expect(result).toHaveLength(1);
    expect(result[0].oldPath).toBe('src/test.ts');
    expect(result[0].newPath).toBe('src/test.ts');
    expect(result[0].status).toBe('modified');
  });

  it('parses insertions and deletions counts', () => {
    const result = parseDiff(BASIC_DIFF);
    expect(result[0].insertions).toBe(2);
    expect(result[0].deletions).toBe(1);
  });

  it('parses hunk content correctly', () => {
    const result = parseDiff(BASIC_DIFF);
    expect(result[0].hunks).toHaveLength(1);
    const hunk = result[0].hunks[0];
    expect(hunk.oldStart).toBe(1);
    expect(hunk.oldLines).toBe(5);
    expect(hunk.newStart).toBe(1);
    expect(hunk.newLines).toBe(7);
  });

  it('parses hunk lines with correct types', () => {
    const result = parseDiff(BASIC_DIFF);
    const lines = result[0].hunks[0].lines;

    const contexts = lines.filter((l) => l.type === 'context');
    const adds = lines.filter((l) => l.type === 'added');
    const dels = lines.filter((l) => l.type === 'deleted');

    expect(contexts.length).toBeGreaterThan(0);
    expect(adds).toHaveLength(2);
    expect(dels).toHaveLength(1);
  });

  it('handles new file (added)', () => {
    const diff = `diff --git a/newfile.ts b/newfile.ts
new file mode 100644
index 0000000..abc1234
--- /dev/null
+++ b/newfile.ts
@@ -0,0 +1,3 @@
+line1
+line2
+line3`;
    const result = parseDiff(diff);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('added');
    expect(result[0].newPath).toBe('newfile.ts');
    expect(result[0].insertions).toBe(3);
  });

  it('handles deleted file', () => {
    const diff = `diff --git a/oldfile.ts b/oldfile.ts
deleted file mode 100644
index abc1234..0000000
--- a/oldfile.ts
+++ /dev/null
@@ -1,3 +0,0 @@
-line1
-line2
-line3`;
    const result = parseDiff(diff);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('deleted');
    expect(result[0].deletions).toBe(3);
  });

  it('handles renamed file', () => {
    const diff = `diff --git a/old.ts b/new.ts
rename from old.ts
rename to new.ts`;
    const result = parseDiff(diff);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('renamed');
    expect(result[0].oldPath).toBe('old.ts');
    expect(result[0].newPath).toBe('new.ts');
  });

  it('handles diff with multiple hunks', () => {
    const diff = `diff --git a/src/test.ts b/src/test.ts
index abc123..def456 100644
--- a/src/test.ts
+++ b/src/test.ts
@@ -1,5 +1,6 @@
 line1
 line2
+added
 line3
 line4
 line5
@@ -10,5 +11,6 @@ export function foo() {
 function bar() {
   return 1;
+  return 2;
 }
 return 3`;
    const result = parseDiff(diff);
    expect(result).toHaveLength(1);
    expect(result[0].hunks).toHaveLength(2);
  });

  it('returns empty array for empty input', () => {
    expect(parseDiff('')).toEqual([]);
    expect(parseDiff('   ')).toEqual([]);
  });
});

describe('LineNumberResolver', () => {
  const sampleHunk: Hunk = {
    oldStart: 1,
    oldLines: 5,
    newStart: 1,
    newLines: 7,
    header: '',
    lines: [
      { type: 'context', content: 'line1', oldLineNo: 1, newLineNo: 1 },
      { type: 'context', content: 'line2', oldLineNo: 2, newLineNo: 2 },
      { type: 'added', content: 'added line', oldLineNo: null, newLineNo: 3 },
      { type: 'context', content: 'line3', oldLineNo: 3, newLineNo: 4 },
      { type: 'added', content: 'another added', oldLineNo: null, newLineNo: 5 },
      { type: 'context', content: 'line4', oldLineNo: 4, newLineNo: 6 },
      { type: 'deleted', content: 'removed line', oldLineNo: 5, newLineNo: null },
      { type: 'context', content: 'line5', oldLineNo: 6, newLineNo: 7 },
    ],
  };

  const resolver = new LineNumberResolver();

  it('resolves existingCode within hunk', () => {
    const result = resolver.resolveInHunk(sampleHunk, 'added line');
    expect(result).not.toBeNull();
    expect(result!.startLine).toBe(3);
    expect(result!.endLine).toBe(3);
  });

  it('resolves multi-line existingCode', () => {
    const result = resolver.resolveInHunk(sampleHunk, 'line3\nanother added');
    expect(result).not.toBeNull();
    expect(result!.startLine).toBe(4);
    expect(result!.endLine).toBe(5);
  });

  it('returns null for non-matching code', () => {
    const result = resolver.resolveInHunk(sampleHunk, 'nonexistent code here');
    expect(result).toBeNull();
  });

  it('resolves existingCode in file content', () => {
    const fileContent = 'line1\nline2\nline3\nline4\nline5';
    const result = resolver.resolveInFile(fileContent, 'line3\nline4', 1);
    expect(result).not.toBeNull();
    expect(result!.startLine).toBe(3);
    expect(result!.endLine).toBe(4);
  });
});

describe('Relocation', () => {
  it('builds relocation messages', () => {
    const messages = buildRelocationMessages('some code', 'test.ts', 'file content here');
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('parses valid relocation response', () => {
    const result = parseRelocationResponse('{"startLine": 42, "endLine": 45}');
    expect(result).not.toBeNull();
    expect(result!.startLine).toBe(42);
    expect(result!.endLine).toBe(45);
  });

  it('parses JSON embedded in text', () => {
    const result = parseRelocationResponse('The code is at:\n```\n{"startLine": 10, "endLine": 15}\n```');
    expect(result).not.toBeNull();
    expect(result!.startLine).toBe(10);
    expect(result!.endLine).toBe(15);
  });

  it('returns null for invalid response', () => {
    const result = parseRelocationResponse('I cannot find this code.');
    expect(result).toBeNull();
  });
});
