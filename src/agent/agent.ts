import { simpleGit } from 'simple-git';
import pLimit from 'p-limit';
import type {
  AgentArgs,
  Diff,
  Hunk,
  LlmComment,
  LLMMessage,
  CodeReviewResult,
  ToolCall,
  ToolContext,
  CommentCollector,
  ToolDefinition,
} from '../core/types.js';
import { LLMClient } from '../llm/client.js';
import { countMessageTokens } from '../util/tokenizer.js';
import { GitDiffProvider } from '../diff/git.js';
import { LineNumberResolver } from '../diff/resolver.js';
import { ToolRegistry } from '../tools/registry.js';
import { FileReadTool } from '../tools/file-read.js';
import { FileFindTool } from '../tools/file-find.js';
import { CodeSearchTool } from '../tools/code-search.js';
import { CodeCommentTool } from '../tools/code-comment.js';
import { TaskDoneTool } from '../tools/task-done.js';
import { isExcluded, isAllowedExtension } from '../config/file-filters.js';
import { SystemRuleResolver } from '../rules/resolver.js';
import { buildMainTaskMessages, buildPlanTaskMessages, fillTemplateMessages } from '../config/task-template.js';
import { MAIN_TASK_TOOLS, PLAN_TASK_TOOLS } from '../config/tools-config.js';
import { SessionHistory } from '../session/history.js';

// Context compression thresholds
const SOFT_THRESHOLD = 0.6;
const HARD_THRESHOLD = 0.8;
const DEFAULT_MAX_TOKENS = 128000;

export async function runReview(args: AgentArgs): Promise<CodeReviewResult> {
  const agent = new ReviewAgent(args);
  return agent.run();
}

class InMemoryCollector implements CommentCollector {
  comments: LlmComment[] = [];

  addComment(comment: LlmComment): void {
    this.comments.push(comment);
  }

  getComments(): LlmComment[] {
    return [...this.comments];
  }
}

export class ReviewAgent {
  private args: AgentArgs;
  private llm: LLMClient;
  private diffProvider: GitDiffProvider;
  private lineResolver: LineNumberResolver;
  private ruleResolver: SystemRuleResolver;
  private toolRegistry: ToolRegistry;
  private sessionHistory: SessionHistory;
  private tokenLimit: number;

  constructor(args: AgentArgs) {
    this.args = args;
    this.llm = new LLMClient(args.llmConfig);
    this.diffProvider = new GitDiffProvider(args.workspace);
    this.lineResolver = new LineNumberResolver();
    this.ruleResolver = new SystemRuleResolver();
    this.toolRegistry = new ToolRegistry();
    this.sessionHistory = new SessionHistory();
    this.tokenLimit = DEFAULT_MAX_TOKENS;

    this.registerTools();
  }

  private registerTools(): void {
    this.toolRegistry.register(new FileReadTool());
    this.toolRegistry.register(new FileFindTool());
    this.toolRegistry.register(new CodeSearchTool());
    this.toolRegistry.register(new CodeCommentTool());
    this.toolRegistry.register(new TaskDoneTool());
  }

  async run(): Promise<CodeReviewResult> {
    const diffs = await this.loadDiffs();
    const filteredDiffs = this.filterDiffs(diffs);

    if (filteredDiffs.length === 0) {
      return { comments: [] };
    }

    const sessionId = this.sessionHistory.createRecord(this.args);

    const limit = pLimit(this.args.concurrency);
    const results = await Promise.all(
      filteredDiffs.map((diff) =>
        limit(() => this.reviewFile(diff, sessionId)),
      ),
    );

    const allComments = results.flat();
    const finalComments = await this.resolveLineNumbers(allComments, filteredDiffs);

    const result: CodeReviewResult = { comments: finalComments };
    this.sessionHistory.setResults(sessionId, result);

    return result;
  }

  private async loadDiffs(): Promise<Diff[]> {
    const mode = this.args.commit ? 'commit' as const
      : this.args.from ? 'range' as const
      : 'workspace' as const;
    return this.diffProvider.getDiffs({
      mode,
      from: this.args.from,
      to: this.args.to,
      commit: this.args.commit,
    });
  }

  private filterDiffs(diffs: Diff[]): Diff[] {
    const allExtensions = [...(this.args.extensions || [])];
    const allExcludes = [...(this.args.excludePatterns || [])];

    return diffs.filter((d) => {
      const path = d.newPath || d.oldPath;
      if (!path) return false;
      if (isExcluded(path, allExcludes)) return false;
      if (!isAllowedExtension(path, allExtensions)) return false;
      return true;
    });
  }

  private async reviewFile(diff: Diff, sessionId: string): Promise<LlmComment[]> {
    const filePath = diff.newPath || diff.oldPath;
    const systemRule = this.ruleResolver.resolve(filePath);
    const language = detectLanguage(filePath);
    const changeFilesExcludingCurrent = this.buildChangeFilesExcept(filePath);

    const templateVars = {
      diff: diff.diff,
      file_path: filePath,
      language,
      system_rule: systemRule,
      change_files: changeFilesExcludingCurrent,
      requirement_background: this.args.background || '',
      review_guidelines: this.args.background ? `Business context: ${this.args.background}` : '',
    };

  const collector = new InMemoryCollector();

  if (diff.insertions + diff.deletions >= this.args.maxPlanPhaseDiffSize) {
      const planMessages = this.applyLanguageInstruction(
        fillTemplateMessages(buildPlanTaskMessages(templateVars), templateVars),
      );
      await this.executeToolLoop(
        planMessages,
        PLAN_TASK_TOOLS,
        collector,
        filePath,
        sessionId,
      );
}

  const mainMessages = this.applyLanguageInstruction(
    fillTemplateMessages(buildMainTaskMessages(templateVars), templateVars),
  );
    await this.executeToolLoop(
      mainMessages,
      MAIN_TASK_TOOLS,
      collector,
      filePath,
      sessionId,
    );

    return collector.getComments();
  }

  private async executeToolLoop(
    initialMessages: LLMMessage[],
    toolDefs: ToolDefinition[],
    collector: InMemoryCollector,
    filePath: string,
    sessionId: string,
  ): Promise<void> {
    const messages: LLMMessage[] = [...initialMessages];
    const ctx = this.buildToolContext(collector);

    for (const msg of initialMessages) {
      this.sessionHistory.appendMessage(sessionId, msg);
    }

    for (let round = 0; round < this.args.maxToolRound; round++) {
      this.checkCompression(messages);

      const response = await this.llm.chat(messages, toolDefs, {
        topP: this.args.topP,
        temperature: this.args.temperature,
      });

      if (response.usage) {
        this.sessionHistory.updateUsage(sessionId, response.usage);
      }

      const assistantMsg: LLMMessage = {
        role: 'assistant',
        content: response.content,
        tool_calls: response.tool_calls.length > 0 ? response.tool_calls : undefined,
      };
      messages.push(assistantMsg);
      this.sessionHistory.appendMessage(sessionId, assistantMsg);

      if (response.tool_calls.length === 0) {
        break;
      }

      for (const toolCall of response.tool_calls) {
        const result = await this.toolRegistry.execute(toolCall, ctx);

        const toolMsg: LLMMessage = {
          role: 'tool',
          content: JSON.stringify(result.data ?? result.error),
          tool_call_id: toolCall.id,
          name: toolCall.name,
        };
        messages.push(toolMsg);
        this.sessionHistory.appendMessage(sessionId, toolMsg);

        if (toolCall.name === 'task_done' && result.success) {
          const data = result.data as { status?: string; _done?: boolean };
          if (data?._done) {
            return;
          }
        }
      }
    }
  }

  private buildChangeFilesExcept(currentPath: string): string {
    if (!this.args.diffs) return '';
    return this.args.diffs
      .map((d) => d.newPath || d.oldPath)
      .filter((p): p is string => p !== null && p !== currentPath)
      .join('\n');
  }

  private checkCompression(messages: LLMMessage[]): void {
    const totalTokens = countMessageTokens(messages);
    const ratio = totalTokens / this.tokenLimit;

    if (ratio >= HARD_THRESHOLD) {
      const keepCount = Math.max(messages.length / 3, 10);
      messages.splice(0, messages.length - keepCount);

      messages.unshift({
        role: 'system',
        content: `[Context was compressed. Earlier messages were removed to fit token limits. Continuing review. Total tokens before compression: ~${totalTokens}]`,
      });
    } else if (ratio >= SOFT_THRESHOLD) {
      const keepCount = Math.max((messages.length * 2) / 3, 10);
      messages.splice(0, messages.length - keepCount);

      messages.unshift({
        role: 'system',
        content: `[Earlier conversation history was compressed for token efficiency. Continuing with recent context. Total tokens before compression: ~${totalTokens}]`,
      });
    }
  }

  private buildToolContext(collector: InMemoryCollector): ToolContext {
    return {
      workspace: this.args.workspace,
      blockedFiles: new Set(),
      git: simpleGit(this.args.workspace),
      commentCollector: collector,
    };
  }

  private applyLanguageInstruction(messages: LLMMessage[]): LLMMessage[] {
    const lang = this.args.language || 'Chinese';
    const instruction = `\n\nAlways respond in ${lang}.`;
    return messages.map(m =>
      m.role === 'system' ? { ...m, content: m.content + instruction } : m,
    );
  }

  private async resolveLineNumbers(
    comments: LlmComment[],
    diffs: Diff[],
  ): Promise<LlmComment[]> {
    const fileDiffMap = new Map<string, Diff>();
    for (const diff of diffs) {
      const path = diff.newPath;
      if (path) fileDiffMap.set(path, diff);
    }

    return Promise.all(
      comments.map(async (comment) => {
        const diff = fileDiffMap.get(comment.path);
        if (!diff || diff.hunks.length === 0) return comment;

        let resolved = false;
        for (const hunk of diff.hunks) {
          const range = this.lineResolver.resolveInHunk(hunk, comment.existingCode);
          if (range) {
            comment.startLine = range.startLine;
            comment.endLine = range.endLine;
            resolved = true;
            break;
          }
        }

      if (!resolved) {
        try {
            const fileContent = await this.diffProvider.getFileContent(comment.path);
            if (fileContent && diff.hunks.length > 0) {
              const range = this.lineResolver.resolveInFile(
                fileContent,
                comment.existingCode,
                diff.hunks[0].newStart,
              );
              if (range) {
                comment.startLine = range.startLine;
                comment.endLine = range.endLine;
              }
            }
      } catch {
      }
        }

        return comment;
      }),
    );
  }
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    ts: 'TypeScript',
    tsx: 'TypeScript React',
    js: 'JavaScript',
    jsx: 'JavaScript React',
    py: 'Python',
    go: 'Go',
    rs: 'Rust',
    java: 'Java',
    kt: 'Kotlin',
    rb: 'Ruby',
    php: 'PHP',
    c: 'C',
    cpp: 'C++',
    h: 'C/C++ Header',
    cs: 'C#',
    swift: 'Swift',
    scala: 'Scala',
    sql: 'SQL',
    sh: 'Shell',
    bash: 'Bash',
    yaml: 'YAML',
    yml: 'YAML',
    json: 'JSON',
    xml: 'XML',
    md: 'Markdown',
    css: 'CSS',
    scss: 'SCSS',
    html: 'HTML',
    vue: 'Vue',
    svelte: 'Svelte',
  };
  return langMap[ext] || 'Unknown';
}
