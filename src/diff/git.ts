import { simpleGit, type SimpleGit } from 'simple-git';
import type { Diff } from '../core/types.js';
import { parseDiff } from './parser.js';

export interface GitDiffOptions {
  mode: 'workspace' | 'commit' | 'range';
  from?: string;
  to?: string;
  commit?: string;
}

export class GitDiffProvider {
  private git: SimpleGit;
  private refForFileRead: string | null = null;

  constructor(workspace: string) {
    this.git = simpleGit(workspace);
  }

  async getDiffs(options: GitDiffOptions): Promise<Diff[]> {
    this.refForFileRead = null;

    switch (options.mode) {
      case 'workspace':
        return this.getWorkspaceDiff();
      case 'commit':
        this.refForFileRead = options.commit ?? null;
        return this.getCommitDiff(options.commit);
      case 'range':
        this.refForFileRead = options.to ?? 'HEAD';
        return this.getRangeDiff(options.from, options.to);
      default:
        throw new Error(`Unknown diff mode: ${options.mode}`);
    }
  }

  async getWorkspaceDiff(): Promise<Diff[]> {
    const [unstaged, staged] = await Promise.all([
      this.git.diff(),
      this.git.diff(['--cached']),
    ]);
    const combined = [unstaged, staged].filter(Boolean).join('\n');
    return parseDiff(combined);
  }

  async getCommitDiff(commit?: string): Promise<Diff[]> {
    if (!commit) {
      const log = await this.git.log({ maxCount: 1 });
      if (log.latest) {
        const diffText = await this.git.show([log.latest.hash, '--format=""']);
        return parseDiff(diffText);
      }
      return [];
    }
    const diffText = await this.git.show([commit, '--format=""']);
    return parseDiff(diffText);
  }

  async getRangeDiff(from?: string, to?: string): Promise<Diff[]> {
    const fromRef = from || 'HEAD';
    const toRef = to || 'HEAD';
    let baseRef: string;
    try {
      baseRef = (await this.git.raw(['merge-base', fromRef, toRef])).trim();
    } catch {
      baseRef = fromRef;
    }
    const diffText = await this.git.diff([`${baseRef}..${toRef}`]);
    return parseDiff(diffText);
  }

  async getFileContent(filePath: string): Promise<string> {
    if (this.refForFileRead) {
      return this.git.show([`${this.refForFileRead}:${filePath}`]);
    }
    return this.git.show([`HEAD:${filePath}`]);
  }

  async findFiles(pattern: string): Promise<string[]> {
    const result = await this.git.raw(['ls-files', '--', pattern]);
    return result.split('\n').filter(Boolean);
  }

  async searchCode(pattern: string, pathFilter?: string): Promise<Array<{ file: string; line: string; lineNumber: number }>> {
    const args = ['grep', '-n', '--heading', pattern];
    if (pathFilter) args.push('--', pathFilter);
    try {
      const result = await this.git.raw(args);
      return parseGitGrepOutput(result);
    } catch {
      // git grep returns non-zero exit code when no matches found
      return [];
    }
  }
}

function parseGitGrepOutput(output: string): Array<{ file: string; line: string; lineNumber: number }> {
  const results: Array<{ file: string; line: string; lineNumber: number }> = [];
  const lines = output.split('\n');
  let currentFile = '';

  for (const line of lines) {
    if (line.includes(':')) {
      const sepIndex = line.indexOf(':');
      const potentialFile = line.slice(0, sepIndex);
      const rest = line.slice(sepIndex + 1);

      if (rest.includes(':')) {
        // format: file:lineNumber:content
        const lineSep = rest.indexOf(':');
        const lineNumStr = rest.slice(0, lineSep);
        const lineNum = parseInt(lineNumStr, 10);
        if (!isNaN(lineNum)) {
          results.push({
            file: potentialFile,
            lineNumber: lineNum,
            line: rest.slice(lineSep + 1),
          });
        }
      }
    }
  }

  return results;
}
