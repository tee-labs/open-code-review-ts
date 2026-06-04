/**
 * Default file extension whitelist and exclude patterns.
 */

export const DEFAULT_ALLOWED_EXTENSIONS = [
  '.java', '.kt', '.kts',             // JVM
  '.js', '.jsx', '.ts', '.tsx',        // TypeScript/JavaScript
  '.py',                                // Python
  '.go',                                // Go
  '.rs',                                // Rust
  '.rb',                                // Ruby
  '.php',                               // PHP
  '.c', '.h', '.cpp', '.hpp', '.cc',   // C/C++
  '.cs',                                // C#
  '.swift',                             // Swift
  '.scala',                             // Scala
  '.sql',                               // SQL
  '.sh', '.bash', '.zsh',              // Shell
  '.yaml', '.yml',                      // YAML
  '.json', '.jsonc',                    // JSON
  '.xml', '.xsd', '.xsl',              // XML
  '.md', '.mdx',                        // Markdown
  '.css', '.scss', '.less',            // Stylesheets
  '.html', '.htm',                     // HTML
  '.tf', '.tfvars',                     // Terraform
  '.dockerfile', 'Dockerfile',          // Docker
  '.gradle', '.gradle.kts',            // Gradle
  '.toml',                              // TOML
  '.proto',                             // Protobuf
  '.vue',                               // Vue
  '.svelte',                            // Svelte
];

export const DEFAULT_EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/target/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/__pycache__/**',
  '**/.venv/**',
  '**/venv/**',
  '**/.gradle/**',
  '**/.idea/**',
  '**/.vscode/**',
  '**/*.min.js',
  '**/*.min.css',
  '**/*.bundle.js',
  '**/vendor/**',
  '**/third_party/**',
  '**/generated/**',
  '**/*.generated.*',
  '**/*.pb.go',           // Generated protobuf
  '**/yarn.lock',
  '**/package-lock.json',
  '**/pnpm-lock.yaml',
  '**/Gemfile.lock',
  '**/Cargo.lock',
  '**/go.sum',
  '**/*.svg',
  '**/*.ico',
  '**/*.png',
  '**/*.jpg',
  '**/*.jpeg',
  '**/*.gif',
  '**/*.webp',
  '**/*.woff',
  '**/*.woff2',
  '**/*.eot',
  '**/*.ttf',
  '**/*.otf',
];

/**
 * Check if a file path matches any exclude pattern.
 */
export function isExcluded(filePath: string, extraPatterns: string[] = []): boolean {
  const patterns = [...DEFAULT_EXCLUDE_PATTERNS, ...extraPatterns];
  const normalizedPath = filePath.replace(/\\/g, '/');
  // Simple path-based exclude check
  const basicExcludes = ['node_modules', '.git', 'dist', 'build', 'target', '.next', '.venv', 'venv', '__pycache__', 'vendor', 'third_party'];
  return patterns.some((pattern) => simpleGlobMatch(normalizedPath, pattern)) ||
    basicExcludes.some((dir) => normalizedPath.includes(`/${dir}/`) || normalizedPath.startsWith(`${dir}/`));
}

function simpleGlobMatch(filePath: string, pattern: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const normalizedPattern = pattern.replace(/\\/g, '/');
  let regexStr = '';
  let i = 0;
  while (i < normalizedPattern.length) {
    const ch = normalizedPattern[i];
    if (ch === '*') {
      if (i + 1 < normalizedPattern.length && normalizedPattern[i + 1] === '*') {
        regexStr += '.*';
        i += 2;
        if (i < normalizedPattern.length && normalizedPattern[i] === '/') i++;
      } else {
        regexStr += '[^/]*';
        i++;
      }
    } else if (ch === '.') {
      regexStr += '\\.';
      i++;
    } else {
      regexStr += ch;
      i++;
    }
  }
  try {
    return new RegExp(`^${regexStr}$`).test(normalizedPath);
  } catch {
    return false;
  }
}

/**
 * Check if a file extension is allowed.
 */
export function isAllowedExtension(filePath: string, extraExtensions: string[] = []): boolean {
  const extensions = [...DEFAULT_ALLOWED_EXTENSIONS, ...extraExtensions];
  const lowerPath = filePath.toLowerCase();
  return extensions.some((ext) => lowerPath.endsWith(ext));
}
