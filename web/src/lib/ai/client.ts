import { spawn } from 'child_process';

const MODEL = 'claude-sonnet-4-6';
const MAX_CONCURRENT = 3;

// Concurrency semaphore
let activeRequests = 0;
const waitQueue: (() => void)[] = [];

async function acquireSemaphore(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT) {
    activeRequests++;
    return;
  }
  return new Promise<void>((resolve) => {
    waitQueue.push(() => {
      activeRequests++;
      resolve();
    });
  });
}

function releaseSemaphore(): void {
  activeRequests--;
  const next = waitQueue.shift();
  if (next) next();
}

/**
 * Call Claude CLI with a prompt via stdin.
 * Returns the text result from Claude.
 */
async function callClaude(prompt: string): Promise<string> {
  await acquireSemaphore();

  try {
    return await new Promise<string>((resolve, reject) => {
      const proc = spawn('claude', [
        '-p',
        '--output-format', 'json',
        '--no-session-persistence',
        '--model', MODEL,
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          const parsed = JSON.parse(stdout);
          // The JSON output format returns { result: "..." } or similar
          const text = parsed.result || parsed.content || parsed.text || stdout;
          resolve(typeof text === 'string' ? text : JSON.stringify(text));
        } catch {
          // If not valid JSON, return raw stdout
          resolve(stdout.trim());
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to spawn Claude CLI: ${err.message}. Is 'claude' installed and in PATH?`));
      });

      // Write prompt to stdin and close
      proc.stdin.write(prompt);
      proc.stdin.end();
    });
  } finally {
    releaseSemaphore();
  }
}

/**
 * Estimate token count for a string (rough approximation)
 * ~4 characters per token for English text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split text into chunks that fit within token limit
 */
export function chunkText(text: string, maxTokens: number): string[] {
  const maxChars = maxTokens * 4;
  const chunks: string[] = [];

  // Split by sentences/paragraphs first
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';

  for (const para of paragraphs) {
    if (currentChunk.length + para.length < maxChars) {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      // If single paragraph is too long, split by sentences
      if (para.length >= maxChars) {
        const sentences = para.split(/(?<=[.!?])\s+/);
        currentChunk = '';
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length < maxChars) {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
          } else {
            if (currentChunk) {
              chunks.push(currentChunk);
            }
            currentChunk = sentence;
          }
        }
      } else {
        currentChunk = para;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Make a chat completion request using Claude CLI.
 * Converts messages array to a single prompt string.
 */
export async function createChatCompletion(
  messages: { role: string; content: string }[],
  options: {
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<string> {
  // Convert messages array to a prompt string
  const parts: string[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      parts.push(`<system>\n${msg.content}\n</system>`);
    } else if (msg.role === 'user') {
      parts.push(`Human: ${msg.content}`);
    } else if (msg.role === 'assistant') {
      parts.push(`Assistant: ${msg.content}`);
    }
  }

  const prompt = parts.join('\n\n');
  return callClaude(prompt);
}
