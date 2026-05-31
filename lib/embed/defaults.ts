import type { DiscordMessage } from "@/lib/embed/schema";

/** Default partnership intro template for a new store. */
export function defaultIntroMessage(storeName: string): DiscordMessage {
  return {
    embeds: [
      {
        title: `🤝 Partnership with ${storeName}!`,
        description:
          `**${storeName}** is now our partner! Be sure to visit their store for ` +
          `high-quality FiveM/RedM resources.`,
        color: 0x5865f2,
        footer: { text: "Partnership announcement" },
      },
    ],
  };
}
