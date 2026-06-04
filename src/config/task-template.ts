import type { TaskTemplate, TemplateMessage } from '../core/types.js';

/**
 * Built-in task templates. These are the default templates used when no
 * external template file is provided.
 *
 * Placeholders are replaced at runtime:
 *   {{diff}}           - the unified diff text
 *   {{file_path}}      - the file being reviewed
 *   {{language}}       - detected language
 *   {{rules}}          - flattened review rules
 *   {{os_platform}}    - OS platform info
 *   {{open_jdk_version}} - JDK version (can be empty)
 *   {{review_guidelines}} - additional guidelines
 */

function fillTemplate(content: string, vars: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export function buildMainTaskMessages(vars: Record<string, string>): TemplateMessage[] {
  return [
    {
      role: 'system',
      content: `You are an expert code reviewer. Your task is to review code changes and provide constructive feedback.

Review Guidelines:
{{review_guidelines}}

Rules to apply:
{{rules}}

When providing code suggestions, use the code_comment tool to submit each finding.
Each comment should include:
- The file path
- Your review comment
- The existing code that needs to change (existingCode)
- Your suggested code (suggestionCode)
- Your reasoning (thinking)

Important:
1. Focus on real issues: bugs, security, performance, maintainability
2. Be specific and actionable
3. Use existingCode to reference exact code that needs to change
4. Provide complete suggestionCode replacements
5. Use the code_search and file_read tools to gather more context when needed
6. When you are done, use the task_done tool to signal completion`,
    },
    {
      role: 'user',
      content: `Please review the following diff for file: {{file_path}}

Language: {{language}}

\`\`\`diff
{{diff}}
\`\`\`

Review the changes and provide feedback using the available tools.`,
    },
  ];
}

export function buildPlanTaskMessages(vars: Record<string, string>): TemplateMessage[] {
  return [
    {
      role: 'system',
      content: `You are an expert code reviewer. Before performing the detailed review, create a review plan.

Rules to apply:
{{rules}}

Outline what aspects you will check and what files you need to read. Be specific.

When you have created the plan, use the task_done tool to signal completion of the planning phase. The main review will begin separately.`,
    },
    {
      role: 'user',
      content: `Create a review plan for the following diff of file: {{file_path}}

Language: {{language}}

\`\`\`diff
{{diff}}
\`\`\`

Outline your review approach.`,
    },
  ];
}

export function buildMemoryCompressionMessages(
  summary: string,
): TemplateMessage[] {
  return [
    {
      role: 'system',
      content: `You are a precise summarization assistant. Your task is to compress the code review conversation history into a concise summary while preserving all important context.`,
    },
    {
      role: 'user',
      content: `Please summarize the following code review conversation. Preserve all review findings, decisions, and context that are still relevant.

Previous summary: ${summary}

Compress this into a concise summary:`,
    },
  ];
}

export function buildReLocationMessages(
  existingCode: string,
  filePath: string,
  fileContent: string,
): TemplateMessage[] {
  return [
    {
      role: 'system',
      content: `You are a code analysis assistant. Your task is to locate a specific code snippet in a source file and return its line numbers.`,
    },
    {
      role: 'user',
      content: `Find the following code snippet in the file "${filePath}" and return its start and end line numbers.

Code to find:
\`\`\`
${existingCode}
\`\`\`

File content:
\`\`\`
${fileContent}
\`\`\`

Return the result as a JSON object with "startLine" and "endLine" properties.
If the exact code cannot be found, return the closest match or null.`,
    },
  ];
}

export function fillTemplateMessages(
  messages: TemplateMessage[],
  vars: Record<string, string>,
): TemplateMessage[] {
  return messages.map((msg) => ({
    ...msg,
    content: fillTemplate(msg.content, vars),
  }));
}

// Default template
export const DEFAULT_TEMPLATE: TaskTemplate = {
  mainTask: [
    {
      role: 'system',
      content: `You are an expert code reviewer. Your task is to review code changes and provide constructive feedback.

Review Guidelines:
{{review_guidelines}}

Rules to apply:
{{rules}}

When providing code suggestions, use the code_comment tool to submit each finding.
Each comment should include:
- The file path
- Your review comment
- The existing code that needs to change (existingCode)
- Your suggested code (suggestionCode)
- Your reasoning (thinking)

Important:
1. Focus on real issues: bugs, security, performance, maintainability
2. Be specific and actionable
3. Use existingCode to reference exact code that needs to change
4. Provide complete suggestionCode replacements
5. Use the code_search and file_read tools to gather more context when needed
6. When you are done, use the task_done tool to signal completion`,
    },
    {
      role: 'user',
      content: `Please review the following diff for file: {{file_path}}

Language: {{language}}

\`\`\`diff
{{diff}}
\`\`\`

Review the changes and provide feedback using the available tools.`,
    },
  ],
  planTask: [
    {
      role: 'system',
      content: `You are an expert code reviewer. Before performing the detailed review, create a review plan.

Rules to apply:
{{rules}}

Outline what aspects you will check and what files you need to read. Be specific.

When you have created the plan, use the task_done tool to signal completion of the planning phase. The main review will begin separately.`,
    },
    {
      role: 'user',
      content: `Create a review plan for the following diff of file: {{file_path}}

Language: {{language}}

\`\`\`diff
{{diff}}
\`\`\`

Outline your review approach.`,
    },
  ],
  memoryCompressionTask: [
    {
      role: 'system',
      content: `You are a precise summarization assistant. Your task is to compress the code review conversation history into a concise summary while preserving all important context.`,
    },
    {
      role: 'user',
      content: `Please summarize the following code review conversation. Preserve all review findings, decisions, and context that are still relevant.

Previous summary: ${''}

Compress this into a concise summary:`,
    },
  ],
  reLocationTask: [
    {
      role: 'system',
      content: `You are a code analysis assistant. Your task is to locate a specific code snippet in a source file and return its line numbers.`,
    },
    {
      role: 'user',
      content: `Find the following code snippet in the file "${''}" and return its start and end line numbers.

Code to find:
\`\`\`
${''}
\`\`\`

File content:
\`\`\`
${''}
\`\`\`

Return the result as a JSON object with "startLine" and "endLine" properties.
If the exact code cannot be found, return the closest match or null.`,
    },
  ],
};
