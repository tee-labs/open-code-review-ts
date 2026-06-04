import { WriteStream } from 'node:tty';

/**
 * Silence stdout by redirecting to an intermediate stream.
 * Used to suppress LLM client chatter during review.
 */
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalStderrWrite = process.stderr.write.bind(process.stderr);
let silenced = false;

export function silenceStdout(): void {
  if (silenced) return;
  const devNull = (() => {
    const noop = () => true;
    return { write: noop } as unknown as WriteStream;
  })();
  (process.stdout as unknown as WriteStream).write = devNull.write;
  (process.stderr as unknown as WriteStream).write = devNull.write;
  silenced = true;
}

export function restoreStdout(): void {
  if (!silenced) return;
  (process.stdout as unknown as WriteStream).write = originalStdoutWrite;
  (process.stderr as unknown as WriteStream).write = originalStderrWrite;
  silenced = false;
}
