import { ItemSuggestionSchema, type SuggestionInput, type SuggestionProvider, type SuggestionResult } from "@/lib/ai/types";
import { ITEM_KINDS } from "@/lib/item-schema";

const ENDPOINT = "https://api.anthropic.com/v1/messages";

const INSTRUCTIONS = `You help catalogue a personal collection of books, movies, music, games and other items from a photo.
Reply with ONLY a JSON object, no prose. Include a field only when you can actually read or recognise it; omit anything you would be guessing.
Shape: {"name": string, "kind": one of ${ITEM_KINDS.join("|")}, "tags": string[] (max 5, short), "note": string (one short sentence about what is visible), "confidence": {"name": 0-1, "kind": 0-1, "tags": 0-1, "note": 0-1}}`;

export function createAnthropicProvider(options: { apiKey: string; model: string }): SuggestionProvider {
  return {
    id: "anthropic",
    async suggest(input: SuggestionInput): Promise<SuggestionResult> {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": options.apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: options.model,
          max_tokens: 600,
          system: INSTRUCTIONS,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: input.mimeType, data: Buffer.from(input.image).toString("base64") } },
              { type: "text", text: input.hint ? `User hint (may be wrong): ${input.hint.slice(0, 200)}` : "Identify this item." },
            ],
          }],
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`provider returned ${response.status}`);
      const body = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
      const text = body.content?.find((part) => part.type === "text")?.text ?? "";
      return { suggestion: parseSuggestionJson(text), provider: "anthropic", model: options.model };
    },
  };
}

/** Provider output is untrusted: extract the JSON object and validate it against the schema. */
export function parseSuggestionJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("provider returned no JSON");
  const parsed = ItemSuggestionSchema.safeParse(JSON.parse(text.slice(start, end + 1)));
  if (!parsed.success) throw new Error("provider output did not match the suggestion schema");
  return parsed.data;
}
