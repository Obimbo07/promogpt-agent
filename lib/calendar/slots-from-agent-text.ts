import { z } from "zod";

const slotSchema = z.object({
  title: z.string().min(1).max(500),
  starts_at: z.string().min(8),
  channel: z.enum(["tiktok", "instagram", "facebook", "mixed", "internal"]),
  notes: z.string().max(4000).optional(),
});

export type CalendarSlotParsed = z.infer<typeof slotSchema>;

/**
 * Split agent Markdown from optional ```calendar_slots JSON block for persistence + UI.
 */
export function splitMarkdownAndCalendarSlots(fullText: string): {
  markdown: string;
  slots: CalendarSlotParsed[];
} {
  const trimmed = fullText.trim();
  const fence = trimmed.match(/```calendar_slots\s*\n([\s\S]*?)```/i);
  let markdown = trimmed;
  const slots: CalendarSlotParsed[] = [];

  if (!fence) {
    return { markdown: trimmed, slots };
  }

  markdown = trimmed.replace(fence[0], "").trim();

  try {
    const raw = JSON.parse(fence[1].trim()) as unknown;
    if (!Array.isArray(raw)) {
      return { markdown, slots };
    }
    for (const row of raw) {
      const parsed = slotSchema.safeParse(row);
      if (!parsed.success) {
        continue;
      }
      const d = new Date(parsed.data.starts_at);
      if (Number.isNaN(d.getTime())) {
        continue;
      }
      slots.push(parsed.data);
    }
  } catch {
    /* ignore parse errors */
  }

  return { markdown, slots };
}

