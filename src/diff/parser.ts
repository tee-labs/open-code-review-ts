import type { Diff, DiffStatus, Hunk } from '../core/types.js';
import { parseHunkHeader, parseHunkLines } from './hunk.js';

const DIFF_FILE_RE = /^diff\s--git\s+a\/(.+?)\s+b\/(.+)$/;
const OLD_MODE_RE = /^old mode (\d+)$/;
const NEW_MODE_RE = /^new mode (\d+)$/;
const DELETED_MODE_RE = /^deleted file mode (\d+)$/;
const NEW_MODE_FILE = /^new file mode (\d+)$/;
const RENAME_FROM = /^rename from (.+)$/;
const RENAME_TO = /^rename to (.+)$/;
const INDEX_RE = /^index [0-9a-f]+\.\.[0-9a-f]+/;

export function parseDiff(diffText: string): Diff[] {
  if (!diffText || diffText.trim().length === 0) return [];

  const results: Diff[] = [];
  const blocks = splitDiffBlocks(diffText);

  for (const block of blocks) {
    const d = parseSingleDiff(block);
    if (d) results.push(d);
  }

  return results;
}

function splitDiffBlocks(text: string): string[] {
  const lines = text.split('\n');
  const blocks: string[] = [];
  let current: string[] = [];
  let inDiff = false;

  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      if (inDiff && current.length > 0) {
        blocks.push(current.join('\n'));
      }
      current = [line];
      inDiff = true;
    } else if (inDiff) {
      current.push(line);
    }
  }

  if (inDiff && current.length > 0) {
    blocks.push(current.join('\n'));
  }

  return blocks;
}

function parseSingleDiff(block: string): Diff | null {
  const lines = block.split('\n');
  if (lines.length < 2) return null;

  const headerMatch = lines[0].match(DIFF_FILE_RE);
  if (!headerMatch) return null;

  const oldPath = headerMatch[1];
  const newPath = headerMatch[2];

  let oldMode: string | undefined;
  let newMode: string | undefined;
  let status: DiffStatus = 'modified';
  let isBinary = false;

  let i = 1;
  let oldPathActual = oldPath;
  let newPathActual = newPath;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('old mode ')) {
      oldMode = line.match(OLD_MODE_RE)?.[1];
      i++;
    } else if (line.startsWith('new mode ')) {
      newMode = line.match(NEW_MODE_RE)?.[1];
      i++;
    } else if (line.startsWith('deleted file mode')) {
      status = 'deleted';
      i++;
    } else if (line.startsWith('new file mode')) {
      status = 'added';
      newMode = line.match(NEW_MODE_FILE)?.[1];
      i++;
    } else if (line.startsWith('rename from ')) {
      oldPathActual = line.match(RENAME_FROM)?.[1] || oldPathActual;
      status = 'renamed';
      i++;
    } else if (line.startsWith('rename to ')) {
      newPathActual = line.match(RENAME_TO)?.[1] || newPathActual;
      status = 'renamed';
      i++;
    } else if (line.startsWith('Binary files')) {
      isBinary = true;
      i++;
    } else if (INDEX_RE.test(line) || line.startsWith('--- ') || line.startsWith('+++ ') || line.trim() === '') {
      i++;
    } else if (line.startsWith('@@')) {
      break;
    } else {
      i++;
    }
  }

  if (isBinary) return null;

  // Gather hunk text blocks
  const hunks: Hunk[] = [];
  let hunkLines: string[] = [];
  let inHunk = false;

  for (; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('@@')) {
      if (inHunk && hunkLines.length > 0) {
        const hunk = parseHunkFromLines(hunkLines);
        if (hunk) hunks.push(hunk);
      }
      hunkLines = [line];
      inHunk = true;
    } else if (inHunk) {
      hunkLines.push(line);
    }
  }

  if (inHunk && hunkLines.length > 0) {
    const hunk = parseHunkFromLines(hunkLines);
    if (hunk) hunks.push(hunk);
  }

  let insertions = 0;
  let deletions = 0;
  for (const hunk of hunks) {
    for (const hl of hunk.lines) {
      if (hl.type === 'added') insertions++;
      if (hl.type === 'deleted') deletions++;
    }
  }

  return {
    oldPath: oldPathActual,
    newPath: newPathActual,
    diff: block,
    insertions,
    deletions,
    oldMode,
    newMode,
    status,
    hunks,
  };
}

function parseHunkFromLines(lines: string[]): Hunk | null {
  if (lines.length === 0) return null;
  const header = parseHunkHeader(lines[0]);
  if (!header) return null;

  const body = lines.slice(1);
  return {
    oldStart: header.oldStart,
    oldLines: header.oldLines,
    newStart: header.newStart,
    newLines: header.newLines,
    header: header.header,
    lines: parseHunkLines(body, header.oldStart, header.newStart),
  };
}
