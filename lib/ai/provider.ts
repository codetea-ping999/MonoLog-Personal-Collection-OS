import { createAnthropicProvider } from "@/lib/ai/anthropic";
import type { SuggestionProvider } from "@/lib/ai/types";

/**
 * AI assistance is off unless the operator configures a provider.
 *   AI_PROVIDER=anthropic, ANTHROPIC_API_KEY=..., AI_MODEL=...
 * Returns null when disabled or misconfigured, and core CRUD never depends on it.
 */
export function getSuggestionProvider(env: Record<string, string | undefined> = process.env): SuggestionProvider | null {
  if (env.AI_PROVIDER === "anthropic" && env.ANTHROPIC_API_KEY && env.AI_MODEL) {
    return createAnthropicProvider({ apiKey: env.ANTHROPIC_API_KEY, model: env.AI_MODEL });
  }
  return null;
}
