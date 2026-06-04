// Global type declarations for Node.js built-ins
// This avoids needing @types/node for development

declare var process: {
  stdin: any;
  stdout: any;
  stderr: any;
  exit(code?: number): never;
  cwd(): string;
  argv: string[];
  env: Record<string, string | undefined>;
  on(event: string, listener: (...args: any[]) => void): void;
};

declare var require: (module: string) => any;
