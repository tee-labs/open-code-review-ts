import type { Rule } from '../core/types.js';

/**
 * Default review rules organized by file type.
 * These match the original system_rules.json structure from alibaba/open-code-review.
 */

export const DEFAULT_RULES: Rule[] = [
  {
    name: 'java',
    description: 'Java review rules',
    globPattern: '**/*.java',
    rules: [
      'Check for proper exception handling - avoid empty catch blocks, use specific exception types',
      'Ensure proper use of Java Optional - avoid .get() without isPresent() check',
      'Check for thread safety issues in shared mutable state',
      'Verify proper resource management with try-with-resources',
      'Check for proper equals() and hashCode() implementations',
      'Ensure consistent use of logging framework',
      'Check for potential NPE (Null Pointer Exception) risks',
      'Verify proper use of stream API - avoid nested streams for readability',
      'Check for proper synchronization in concurrent code',
    ],
  },
  {
    name: 'javascript',
    description: 'JavaScript review rules',
    globPattern: '**/*.js',
    rules: [
      'Check for potential undefined/null reference errors',
      'Ensure proper use of async/await with error handling (try/catch)',
      'Check for memory leaks from closures or event listeners',
      'Verify proper use of === over ==',
      'Check for unsafe object mutation',
      'Ensure consistent error handling patterns',
    ],
  },
  {
    name: 'typescript',
    description: 'TypeScript review rules',
    globPattern: '**/*.ts',
    rules: [
      'Check for potential undefined/null reference errors',
      'Ensure proper use of async/await with error handling (try/catch)',
      'Check for memory leaks from closures or event listeners',
      'Verify proper use of === over ==',
      'Check for unsafe type assertions (as any, type casting)',
      'Ensure proper use of strict TypeScript features (no implicit any)',
      'Check for proper error handling in async functions',
      'Verify consistent use of types/interfaces',
      'Check for proper null/undefined checking patterns',
    ],
  },
  {
    name: 'typescript-react',
    description: 'TypeScript React review rules',
    globPattern: '**/*.tsx',
    rules: [
      'Check for potential undefined/null reference errors',
      'Ensure proper use of async/await with error handling (try/catch)',
      'Check for memory leaks from closures or event listeners',
      'Verify proper use of === over ==',
      'Check for unsafe type assertions (as any, type casting)',
      'Ensure proper React hook dependencies (useEffect, useMemo, useCallback)',
      'Check for missing key props in lists',
      'Verify proper component cleanup in useEffect return functions',
      'Check for unnecessary re-renders and performance issues',
      'Ensure consistent error handling in async operations',
    ],
  },
  {
    name: 'python',
    description: 'Python review rules',
    globPattern: '**/*.py',
    rules: [
      'Check for proper exception handling with specific exception types',
      'Ensure proper resource management (with statements for files, connections)',
      'Check for potential None reference errors',
      'Verify proper use of list comprehensions vs loops for readability',
      'Check for proper async/await patterns with asyncio',
      'Ensure type hints are used consistently',
      'Check for mutable default argument issues',
    ],
  },
  {
    name: 'go',
    description: 'Go review rules',
    globPattern: '**/*.go',
    rules: [
      'Check for proper error handling - never ignore errors',
      'Ensure proper use of defer for resource cleanup',
      'Check for goroutine leak risks',
      'Verify proper use of sync primitives (Mutex, WaitGroup)',
      'Check for potential nil pointer dereferences',
      'Ensure consistent error wrapping with fmt.Errorf("%w")',
      'Check for proper context usage in API boundaries',
    ],
  },
  {
    name: 'rust',
    description: 'Rust review rules',
    globPattern: '**/*.rs',
    rules: [
      'Check for proper error handling with Result/Option',
      'Ensure proper use of the ? operator for error propagation',
      'Check for unnecessary clone() or to_owned() calls',
      'Verify proper use of borrowing and ownership',
      'Check for potential panic!() in library code',
      'Ensure proper Send + Sync trait implementations',
      'Check for unsafe code blocks and verify their correctness',
    ],
  },
  {
    name: 'sql',
    description: 'SQL review rules',
    globPattern: '**/*.sql',
    rules: [
      'Check for SQL injection vulnerabilities',
      'Ensure proper use of parameterized queries',
      'Check for missing indexes on foreign keys',
      'Verify proper transaction handling',
      'Check for large IN clause performance issues',
      'Ensure consistent naming conventions',
    ],
  },
  {
    name: 'yaml',
    description: 'YAML review rules',
    globPattern: '**/*.{yaml,yml}',
    rules: [
      'Check for proper indentation',
      'Ensure secure configuration values (no hardcoded secrets)',
      'Verify correct key names and structure',
    ],
  },
  {
    name: 'dockerfile',
    description: 'Dockerfile review rules',
    globPattern: '**/Dockerfile*',
    rules: [
      'Check for multi-stage build optimization opportunities',
      'Ensure proper layer caching (order of COPY and RUN commands)',
      'Check for unnecessary dependencies in final image',
      'Verify secure configuration (no root user, no hardcoded secrets)',
    ],
  },
  {
    name: 'markdown',
    description: 'Markdown review rules',
    globPattern: '**/*.md',
    rules: [
      'Check for broken links',
      'Ensure consistent heading structure',
      'Verify proper code block language tagging',
    ],
  },
  {
    name: 'default',
    description: 'Default review rules for any code',
    globPattern: '**/*',
    rules: [
      'Check for security vulnerabilities',
      'Check for potential bugs and logical errors',
      'Check for code readability and maintainability',
      'Check for performance issues',
      'Check for proper error handling',
      'Check for hardcoded secrets or sensitive information',
      'Check for proper testing patterns',
    ],
  },
];

/**
 * Get applicable rules for a given file path based on glob matching.
 */
export function getRulesForFile(filePath: string, customRules?: Rule[]): string[] {
  const rules = customRules ?? DEFAULT_RULES;
  // Sort by specificity (longest pattern first), then check each
  const sorted = [...rules].sort((a, b) => b.globPattern.length - a.globPattern.length);

  for (const rule of sorted) {
    if (micromatchMatch(filePath, rule.globPattern)) {
      return rule.rules;
    }
  }
  return [];
}

function micromatchMatch(filePath: string, pattern: string): boolean {
  // Direct micromatch import handled in src/rules/resolver.ts via ESM import
  // This fallback supports simple glob patterns when micromatch isn't available
  return simpleGlobMatch(filePath, pattern);
}

/**
 * Simple glob matching fallback without external dependencies.
 * Supports **, *, ? and {a,b} patterns.
 */
export function simpleGlobMatch(filePath: string, pattern: string): boolean {
  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, '/');
  const normalizedPattern = pattern.replace(/\\/g, '/');

  // Convert glob pattern to regex
  let regexStr = '';
  let i = 0;
  while (i < normalizedPattern.length) {
    const ch = normalizedPattern[i];
    if (ch === '*') {
      if (i + 1 < normalizedPattern.length && normalizedPattern[i + 1] === '*') {
        // ** matches everything including path separators
        regexStr += '.*';
        i += 2;
        if (i < normalizedPattern.length && normalizedPattern[i] === '/') {
          i++; // skip the following /
        }
      } else {
        // * matches anything except path separator
        regexStr += '[^/]*';
        i++;
      }
    } else if (ch === '?') {
      regexStr += '[^/]';
      i++;
    } else if (ch === '.') {
      regexStr += '\\.';
      i++;
    } else if (ch === '{') {
      // Simple brace expansion not implemented in fallback
      regexStr += '(';
      i++;
      let braceContent = '';
      while (i < normalizedPattern.length && normalizedPattern[i] !== '}') {
        braceContent += normalizedPattern[i];
        i++;
      }
      if (i < normalizedPattern.length) i++; // skip }
      const parts = braceContent.split(',').map((p) => p.trim()).filter(Boolean);
      regexStr += parts.join('|') + ')';
    } else {
      regexStr += ch;
      i++;
    }
  }

  const regex = new RegExp(`^${regexStr}$`);
  return regex.test(normalizedPath);
}

/**
 * Flatten all rules into a single string for prompt injection.
 */
