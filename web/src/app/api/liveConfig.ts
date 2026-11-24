export const MODEL = "claude-haiku-5-5";
export const PROVIDER = "Anthropic";
export const MAX_INPUT_CHARS = 500;
export const MAX_OUTPUT_TOKENS = 256;
export const TIMEOUT_MS = 25_000;

export function claudeKey() {
  return process.env.CLAUDE_API_KEY?.trim();
}
