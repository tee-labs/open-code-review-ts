import type { Hunk, HunkLine } from '../core/types.js';

export interface LineRange {
  startLine: number;
  endLine: number;
}

/**
 * Resolves the line numbers for a given existingCode string
 * within a hunk or full file content.
 * Implements the same strategy chain as the original Go code.
 */
export class LineNumberResolver {
  /**
   * Try to find existingCode within a hunk's line content.
   */
  resolveInHunk(hunk: Hunk, existingCode: string): LineRange | null {
    const normalizedSearch = normalizeCode(existingCode);
    if (!normalizedSearch) return null;

    const hunkContent = hunk.lines
      .filter((l) => l.type === 'context' || l.type === 'added' || l.type === 'deleted')
      .map((l) => l.content)
      .join('\n');

    return this.findInContent(hunkContent, normalizedSearch, hunk.lines);
  }

  /**
   * Try to find existingCode within a full file content (using newFileContent).
   */
  resolveInFile(fileContent: string, existingCode: string, newStartLine: number): LineRange | null {
    const normalizedSearch = normalizeCode(existingCode);
    if (!normalizedSearch) return null;

    const lines = fileContent.split('\n');
    // Try exact match first
    const searchLines = normalizedSearch.split('\n');

    for (let i = 0; i <= lines.length - searchLines.length; i++) {
      let match = true;
      for (let j = 0; j < searchLines.length; j++) {
        if (normalizeLine(lines[i + j]) !== normalizeLine(searchLines[j])) {
          match = false;
          break;
        }
      }
      if (match) {
        const startLine = newStartLine + i;
        return { startLine, endLine: startLine + searchLines.length - 1 };
      }
    }

    return null;
  }

  /**
   * Full resolve: try hunk first, then full file content.
   */
  resolve(hunk: Hunk, existingCode: string, fileContent?: string, newStartLine?: number): LineRange | null {
    const inHunk = this.resolveInHunk(hunk, existingCode);
    if (inHunk) return inHunk;

    if (fileContent && newStartLine !== undefined) {
      return this.resolveInFile(fileContent, existingCode, newStartLine);
    }

    return null;
  }

  private findInContent(
    content: string,
    search: string,
    hunkLines: HunkLine[],
  ): LineRange | null {
    const contentLines = content.split('\n');
    const searchLines = search.split('\n');

    for (let i = 0; i <= contentLines.length - searchLines.length; i++) {
      let match = true;
      for (let j = 0; j < searchLines.length; j++) {
        if (normalizeLine(contentLines[i + j]) !== normalizeLine(searchLines[j])) {
          match = false;
          break;
        }
      }
      if (match) {
        // Map back to line numbers using the hunk lines
        const startHunkLine = findHunkLineByIndex(hunkLines, i);
        const endHunkLine = findHunkLineByIndex(hunkLines, i + searchLines.length - 1);

        if (startHunkLine && endHunkLine) {
          return {
            startLine: startHunkLine.newLineNo ?? startHunkLine.oldLineNo ?? 0,
            endLine: endHunkLine.newLineNo ?? endHunkLine.oldLineNo ?? 0,
          };
        }
      }
    }

    return null;
  }
}

function normalizeCode(code: string): string {
  return code
    .split('\n')
    .map((l) => normalizeLine(l))
    .join('\n')
    .trim();
}

function normalizeLine(line: string): string {
  return line.trim().replace(/\s+/g, ' ');
}

function findHunkLineByIndex(hunkLines: HunkLine[], index: number): HunkLine | null {
  let count = 0;
  for (const hl of hunkLines) {
    if (hl.type === 'context' || hl.type === 'added' || hl.type === 'deleted') {
      if (count === index) return hl;
      count++;
    }
  }
  return null;
}
