import { z } from "zod";
import { ItemKindSchema, type ItemKind } from "@/lib/item-schema";

const Confidence = z.number().min(0).max(1);

/** What a provider may propose. Every field is optional: a provider can decline any of them. */
export const ItemSuggestionSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  kind: ItemKindSchema.optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  note: z.string().max(5000).optional(),
  confidence: z.object({ name: Confidence, kind: Confidence, tags: Confidence, note: Confidence }).partial().optional(),
});
export type ItemSuggestion = z.infer<typeof ItemSuggestionSchema>;

export type SuggestionResult = { suggestion: ItemSuggestion; provider: string; model: string };

export type SuggestionInput = { image: Uint8Array; mimeType: "image/jpeg" | "image/png" | "image/webp"; hint?: string };

/** Provider-specific code lives behind this boundary; nothing else imports a vendor SDK or URL. */
export interface SuggestionProvider {
  readonly id: string;
  suggest(input: SuggestionInput): Promise<SuggestionResult>;
}

export type SuggestionField = "name" | "kind" | "tags" | "note";

export type CurrentValues = { name: string; kind: ItemKind; tags: string[]; note: string };

export type FieldProposal = {
  field: SuggestionField;
  proposed: string;
  current: string;
  confidence: number | null;
  /** True when the form already holds a value that accepting would replace. */
  replaces: boolean;
};

const DEFAULT_KIND: ItemKind = "other";

/**
 * Turns a suggestion into per-field proposals for the review screen.
 * Fields the provider left out, or that equal the current value, produce no proposal.
 * Nothing is written here: the caller applies only the fields the user explicitly accepts.
 */
export function buildProposals(suggestion: ItemSuggestion, current: CurrentValues): FieldProposal[] {
  const proposals: FieldProposal[] = [];
  const confidence = (field: SuggestionField) => suggestion.confidence?.[field] ?? null;

  if (suggestion.name && suggestion.name !== current.name.trim()) {
    proposals.push({ field: "name", proposed: suggestion.name, current: current.name, confidence: confidence("name"), replaces: current.name.trim() !== "" });
  }
  if (suggestion.kind && suggestion.kind !== current.kind) {
    proposals.push({ field: "kind", proposed: suggestion.kind, current: current.kind, confidence: confidence("kind"), replaces: current.kind !== DEFAULT_KIND });
  }
  if (suggestion.tags && suggestion.tags.length > 0) {
    const proposed = suggestion.tags.join(", ");
    const currentText = current.tags.join(", ");
    if (proposed !== currentText) proposals.push({ field: "tags", proposed, current: currentText, confidence: confidence("tags"), replaces: current.tags.length > 0 });
  }
  if (suggestion.note && suggestion.note !== current.note.trim()) {
    proposals.push({ field: "note", proposed: suggestion.note, current: current.note, confidence: confidence("note"), replaces: current.note.trim() !== "" });
  }
  return proposals;
}

/** Fields that overwrite existing input start unchecked; filling an empty field starts checked. */
export function defaultAccepted(proposals: FieldProposal[]): Record<SuggestionField, boolean> {
  const accepted = { name: false, kind: false, tags: false, note: false };
  for (const proposal of proposals) accepted[proposal.field] = !proposal.replaces;
  return accepted;
}
