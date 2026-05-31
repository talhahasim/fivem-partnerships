/**
 * Discord webhook mesaj payload'ı için zod şeması + resmi limitler.
 * Editör çıktısı ve gönderim öncesi bu şemayla doğrulanır.
 * https://discord.com/developers/docs/resources/webhook
 */
import { z } from "zod";

const colorSchema = z.number().int().min(0).max(0xffffff).optional();

const fieldSchema = z.object({
  name: z.string().min(1).max(256),
  value: z.string().min(1).max(1024),
  inline: z.boolean().optional(),
});

const footerSchema = z.object({
  text: z.string().min(1).max(2048),
  icon_url: z.string().url().optional(),
});

const authorSchema = z.object({
  name: z.string().min(1).max(256),
  url: z.string().url().optional(),
  icon_url: z.string().url().optional(),
});

const imageSchema = z.object({ url: z.string().url() });

export const embedSchema = z.object({
  title: z.string().max(256).optional(),
  description: z.string().max(4096).optional(),
  url: z.string().url().optional(),
  color: colorSchema,
  timestamp: z.string().optional(),
  author: authorSchema.optional(),
  footer: footerSchema.optional(),
  image: imageSchema.optional(),
  thumbnail: imageSchema.optional(),
  fields: z.array(fieldSchema).max(25).optional(),
});

export type Embed = z.infer<typeof embedSchema>;

export const messageSchema = z
  .object({
    content: z.string().max(2000).optional(),
    username: z.string().max(80).optional(),
    avatar_url: z.string().url().optional(),
    embeds: z.array(embedSchema).max(10).optional(),
  })
  .refine((m) => Boolean(m.content?.trim()) || (m.embeds?.length ?? 0) > 0, {
    message: "A message must have at least content or one embed",
  })
  .refine((m) => totalEmbedChars(m.embeds ?? []) <= 6000, {
    message: "Total text across all embeds cannot exceed 6000 characters",
  });

export type DiscordMessage = z.infer<typeof messageSchema>;

/** Discord'un 6000 karakter toplam embed limiti için sayım. */
export function totalEmbedChars(embeds: Embed[]): number {
  let total = 0;
  for (const e of embeds) {
    total += e.title?.length ?? 0;
    total += e.description?.length ?? 0;
    total += e.footer?.text.length ?? 0;
    total += e.author?.name.length ?? 0;
    for (const f of e.fields ?? []) {
      total += f.name.length + f.value.length;
    }
  }
  return total;
}
