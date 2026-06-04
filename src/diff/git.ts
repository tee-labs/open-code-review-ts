import { simpleGit, type SimpleGit } from 'simple-git';
import type { DiffType, Diff } from '../core/types.js';
import { parseDiff } from './parser.js';

export interface GitDiffOptions {
  workspace: string;
  diffType: DiffType;
  commitRange?: string;
}

export class GitDiffProvider {
  private git: SimpleGit;

  constructor(workspace: string) {
    this.git = simpleGit(workspace);
  }

  async getDiffs(options: GitDiffOptions): Promise<Diff[]> {
    switch (options.diffType) {
      case 'workspace':
        return this.getWorkspaceDiff();
      case 'commit':
        return this.getCommitDiff(options.commitRange);
      case 'range':
        return this.getRangeDiff(options.commitRange);
      default:
        throw new Error(`Unknown diff type: ${options.diffType}`);
    }
  }

  async getWorkspaceDiff(): Promise<Diff[]> {
    const diffText = await this.git.diff();
    return parseDiff(diffText);
  }

  async getCommitDiff(commit?: string): Promise<Diff[]> {
    if (!commit) {
      // Get diff of the latest commit
      const log = await this.git.log({ maxCount: 1 });
      if (log.latest) {
        const diffText = await this.git.show([log.latest.hash, '--format=""']);
        return parseDiff(diffText);
      }
      return [];
    }

    // git diff HEAD~1..HEAD or use the specific commit range
    const diffText = await this.git.diff([`${commit}~1..${commit}`]);
    return parseDiff(diffText);
  }

  async getRangeDiff(range?: string): Promise<Diff[]> {
    const ref = range || 'HEAD';
    const diffText = await this.git.diff([ref]);
    return parseDiff(diffText);
  }

  async getFileContent(filePath: string): Promise<string> {
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
