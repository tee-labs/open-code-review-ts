// ============================================================
// Core Types for open-code-review-ts
// ============================================================

// ---- Diff Types ----

export interface Diff {
  oldPath: string;
  newPath: string;
  diff: string;
  insertions: number;
  deletions: number;
  oldMode?: string;
  newMode?: string;
  status?: DiffStatus;
  hunks: Hunk[];
}

export type DiffStatus = 'added' | 'deleted' | 'modified' | 'renamed';

export interface Hunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  header: string;
  lines: HunkLine[];
}

export interface HunkLine {
  type: 'context' | 'added' | 'deleted';
  content: string;
  oldLineNo: number | null;
  newLineNo: number | null;
}

// ---- Review Comment Types ----

export interface LlmComment {
  path: string;
  content: string;
  suggestionCode: string;
  existingCode: string;
  startLine: number;
  endLine: number;
  thinking: string;
}

export interface CodeReviewResult {
  comments: LlmComment[];
}

// ---- LLM Types ----

export enum LLMProtocol {
  OpenAI = 'openai',
}

export interface LLMConfig {
  url: string;
  token: string;
  model: string;
  protocol: LLMProtocol;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface LLMResponse {
  content: string | null;
  tool_calls: ToolCall[];
  usage: TokenUsage | null;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// ---- Agent Types ----

export interface AgentArgs {
  workspace: string;
  /** Source ref for range diff mode (e.g. 'main'). Requires `to`. */
  from?: string;
  /** Target ref for range diff mode (e.g. 'feature-branch'). Requires `from`. */
  to?: string;
  /** Single commit hash/tag to review (vs its parent). Mutually exclusive with from/to. */
  commit?: string;
  rules: Rule[];
  template: TaskTemplate;
  tools: ToolDefinition[];
  llmConfig: LLMConfig;
  model: string;
  extensions: string[];
  excludePatterns: string[];
  maxToolRound: number;
  topP: number;
  temperature: number;
  outputPath?: string;
  maxPlanPhaseDiffSize: number;
  /** Business context / requirements for the review (--background). */
  background?: string;
  /** If true, list files that would be reviewed without running LLM. */
  preview?: boolean;
  /** Max concurrent file reviews (default 8). */
  concurrency: number;
}

export interface Rule {
  name: string;
  description: string;
  globPattern: string;
  rules: string[];
}

export interface TaskTemplate {
  mainTask: TemplateMessage[];
  planTask: TemplateMessage[];
  memoryCompressionTask: TemplateMessage[];
  reLocationTask: TemplateMessage[];
}

export interface TemplateMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ---- Tool Execution Types ----

export interface ToolContext {
  workspace: string;
  blockedFiles: Set<string>;
  git: import('simple-git').SimpleGit;
  commentCollector: CommentCollector;
}

export interface ToolResult {
  success: boolean;
  data: unknown;
  error?: string;
}

export interface CommentCollector {
  comments: LlmComment[];
  addComment(comment: LlmComment): void;
  getComments(): LlmComment[];
}

// ---- Session Types ----

export interface SessionRecord {
  id: string;
  timestamp: string;
  args: Partial<AgentArgs>;
  messages: LLMMessage[];
  results: CodeReviewResult | null;
  tokenUsage: TokenUsage;
}

// ---- Config Types ----

export interface UserConfig {
  llm?: {
    url: string;
    token: string;
    model: string;
  };
  rules?: string;
  extensions?: string[];
  excludePatterns?: string[];
  maxToolRound?: number;
  model?: string;
  topP?: number;
  temperature?: number;
}

// ---- Context Compression Types ----

export interface CompressionState {
  messages: LLMMessage[];
  totalTokens: number;
  compressedRanges: Array<{ start: number; end: number; summary: string }>;
}
