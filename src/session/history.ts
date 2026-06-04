/**
 * Session history manager.
 * Persists LLM conversation records to ~/.opencodereview/sessions/ for debugging.
 */
import { mkdirSync, existsSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { SessionRecord, LLMMessage, CodeReviewResult, TokenUsage, AgentArgs } from '../core/types.js';

const SESSIONS_DIR = join(homedir(), '.opencodereview', 'sessions');

function ensureDir(): void {
  if (!existsSync(SESSIONS_DIR)) {
    mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

function generateId(): string {
  return `ocr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export class SessionHistory {
  private records: SessionRecord[] = [];

  constructor() {
    ensureDir();
    this.loadExisting();
  }

  private loadExisting(): void {
    try {
      if (!existsSync(SESSIONS_DIR)) return;
      const files = readdirSync(SESSIONS_DIR)
        .filter((f) => f.endsWith('.json'))
        .sort()
        .slice(-50); // keep last 50 sessions

      for (const file of files) {
        try {
          const content = readFileSync(join(SESSIONS_DIR, file), 'utf-8');
          const record = JSON.parse(content) as SessionRecord;
          this.records.push(record);
        } catch {
          // skip corrupted files
        }
      }
    } catch {
      // directory might not exist yet
    }
  }

  createRecord(args: Partial<AgentArgs>): string {
    const id = generateId();
    const record: SessionRecord = {
      id,
      timestamp: new Date().toISOString(),
      args,
      messages: [],
      results: null,
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    };
    this.records.push(record);
    return id;
  }

  appendMessage(sessionId: string, message: LLMMessage): void {
    const record = this.getRecord(sessionId);
    if (record) {
      record.messages.push(message);
      this.persist(record);
    }
  }

  updateUsage(sessionId: string, usage: TokenUsage): void {
    const record = this.getRecord(sessionId);
    if (record) {
      record.tokenUsage = usage;
      this.persist(record);
    }
  }

  setResults(sessionId: string, results: CodeReviewResult): void {
    const record = this.getRecord(sessionId);
    if (record) {
      record.results = results;
      this.persist(record);
    }
  }

  getRecord(id: string): SessionRecord | undefined {
    return this.records.find((r) => r.id === id);
  }

  private persist(record: SessionRecord): void {
    try {
      ensureDir();
      const filePath = join(SESSIONS_DIR, `${record.id}.json`);
      writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8');
    } catch {
      // persistence failure is non-fatal
    }
  }
}
