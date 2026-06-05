import type { TaskTemplate, TemplateMessage } from '../core/types.js';

function fillTemplate(content: string, vars: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export function buildMainTaskMessages(vars: Record<string, string>): TemplateMessage[] {
  return [
    {
      role: 'system',
      content: `## Role
You are an expert code reviewer. Your task is to review code changes and provide constructive feedback.

Review Guidelines:
{{review_guidelines}}

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
      content: `// The following is the list of other files changed in this update.
<other_changed_files>
{{change_files}}
</other_changed_files>

<current_file_path>{{file_path}}</current_file_path>

<current_file_diff>
{{diff}}
</current_file_diff>

<user_task>
### Requirement Background (Optional)
{{requirement_background}}

### Review Checklist
{{system_rule}}

Now please review the code changes in <current_file_diff>
</user_task>`,
    },
  ];
}

export function buildPlanTaskMessages(vars: Record<string, string>): TemplateMessage[] {
  return [
    {
      role: 'system',
      content: `You are an expert code reviewer. Before performing the detailed review, create a review plan.

### Review Checklist
{{system_rule}}

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

Plan your approach based on the Review Checklist above.`,
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
      content: `You are a code locator assistant. Given a piece of code and a file, find the exact line numbers where the code appears. Return ONLY a JSON object with startLine and endLine.`,
    },
    {
      role: 'user',
      content: `I need to locate the following code in the file:

\`\`\`
${existingCode}
\`\`\`

File: ${filePath}

File content:
\`\`\`
${fileContent}
\`\`\`

Please find the exact line numbers where this code appears.`,
    },
  ];
}

export function buildTemplateVars(
  overrides: Record<string, string>,
): Record<string, string> {
  const defaults: Record<string, string> = {
    diff: '',
    file_path: '',
    language: '',
    change_files: '',
    system_rule: '',
    review_guidelines: '',
    requirement_background: '',
    plan_guidance: '',
    current_system_date_time: new Date().toISOString(),
    os_platform: 'linux',
  };
  return { ...defaults, ...overrides };
}

export function fillTemplateMessages(
  messages: TemplateMessage[],
  vars: Record<string, string>,
): TemplateMessage[] {
  const filled = buildTemplateVars(vars);
  return messages.map((msg) => ({
    ...msg,
    content: fillTemplate(msg.content, filled),
  }));
}
