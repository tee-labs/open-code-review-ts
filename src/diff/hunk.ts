import type { Hunk, HunkLine } from '../core/types.js';

const HUNK_HEADER_RE = /^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@(?:\s+(.*))?$/;

export function parseHunkHeader(line: string): {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  header: string;
} | null {
  const m = line.match(HUNK_HEADER_RE);
  if (!m) return null;
  return {
    oldStart: parseInt(m[1], 10),
    oldLines: m[2] ? parseInt(m[2], 10) : 1,
    newStart: parseInt(m[3], 10),
    newLines: m[4] ? parseInt(m[4], 10) : 1,
    header: m[5] || '',
  };
}

export function parseHunkLines(
  lines: string[],
  oldStart: number,
  newStart: number,
): HunkLine[] {
  const result: HunkLine[] = [];
  let oldLine = oldStart;
  let newLine = newStart;

  for (const raw of lines) {
    if (raw.length === 0) {
      result.push({ type: 'context', content: '', oldLineNo: oldLine++, newLineNo: newLine++ });
      continue;
    }
    const ch = raw[0];
    const content = raw.slice(1);

    switch (ch) {
      case ' ':
        result.push({ type: 'context', content, oldLineNo: oldLine++, newLineNo: newLine++ });
        break;
      case '+':
        result.push({ type: 'added', content, oldLineNo: null, newLineNo: newLine++ });
        break;
      case '-':
        result.push({ type: 'deleted', content, oldLineNo: oldLine++, newLineNo: null });
        break;
      case '\\': // No newline at end of file
        result.push({ type: 'context', content: raw, oldLineNo: null, newLineNo: null });
        break;
      default:
        result.push({ type: 'context', content: raw, oldLineNo: null, newLineNo: null });
        break;
    }
  }

  return result;
}

export function parseHunk(hunkText: string): Hunk | null {
  const lines = hunkText.split('\n');
  if (lines.length === 0) return null;

  const header = parseHunkHeader(lines[0]);
  if (!header) return null;

  const body = lines.slice(1).filter((l) => lines[0] !== l || l !== '');
  return {
    oldStart: header.oldStart,
    oldLines: header.oldLines,
    newStart: header.newStart,
    newLines: header.newLines,
    header: header.header,
    lines: parseHunkLines(body, header.oldStart, header.newStart),
  };
}
