import type { DiscordMessage } from "@/lib/embed/schema";
import type { TemplateType } from "@/lib/types/db";

export type EmbedPreset = {
  id: string;
  name: string;
  category: string;
  type: TemplateType;
  payload: DiscordMessage;
};

/** Ready-made FiveM/RedM style embed templates — as a starting point. */
export const PRESETS: EmbedPreset[] = [
  {
    id: "partnership",
    name: "Partnership Announcement",
    category: "Partnership",
    type: "partnership_intro",
    payload: {
      embeds: [
        {
          title: "🤝 New Partnership — [Store Name]",
          description:
            "A new partner just joined our community! **[Store Name]** offers high-quality FiveM resources. Be sure to check out their Discord.",
          color: 0x5865f2,
          fields: [
            { name: "🌐 Discord", value: "discord.gg/example", inline: true },
            { name: "🛒 Store", value: "[store link]", inline: true },
          ],
          image: { url: "https://placehold.co/600x200/5865f2/ffffff/png?text=PARTNERSHIP" },
          footer: { text: "Partnership • [Store Name]" },
        },
      ],
    },
  },
  {
    id: "product",
    name: "New Script Release",
    category: "Product",
    type: "product",
    payload: {
      embeds: [
        {
          title: "🆕 New Release: [Script Name]",
          description: "[Short description — what does the script do, why should they buy it?]",
          color: 0x57f287,
          fields: [
            { name: "💰 Price", value: "€XX", inline: true },
            { name: "📦 Category", value: "[Category]", inline: true },
            { name: "✨ Highlights", value: "• Feature one\n• Feature two\n• Feature three" },
          ],
          thumbnail: { url: "https://placehold.co/120/57f287/ffffff/png?text=NEW" },
          footer: { text: "[Store Name]" },
        },
      ],
    },
  },
  {
    id: "sale",
    name: "Sale / Promo",
    category: "Product",
    type: "product",
    payload: {
      embeds: [
        {
          title: "🔥 Up to 50% Off!",
          description: "Limited time — huge discounts on all scripts. Don't miss out!",
          color: 0xed4245,
          fields: [
            { name: "⏰ Ends", value: "[Date/Time]", inline: true },
            { name: "🏷️ Coupon", value: "`SALE50`", inline: true },
          ],
          image: { url: "https://placehold.co/600x200/ed4245/ffffff/gif?text=SALE" },
          footer: { text: "[Store Name] • Promo" },
        },
      ],
    },
  },
  {
    id: "server",
    name: "Server Showcase",
    category: "Showcase",
    type: "partnership_intro",
    payload: {
      embeds: [
        {
          title: "🎮 [Server Name]",
          description: "[A short pitch about your server — theme, community, what stands out.]",
          color: 0xfaa61a,
          fields: [
            { name: "👥 Slots", value: "128", inline: true },
            { name: "🗺️ Type", value: "Roleplay", inline: true },
            { name: "🔗 Connect", value: "`connect [ip]`" },
          ],
          image: { url: "https://placehold.co/600x200/faa61a/ffffff/png?text=SERVER" },
          footer: { text: "[Server Name]" },
        },
      ],
    },
  },
  {
    id: "event",
    name: "Event Announcement",
    category: "Event",
    type: "custom",
    payload: {
      embeds: [
        {
          title: "🎉 Event: [Event Name]",
          description: "[Event details and how to join.]",
          color: 0xf1c40f,
          fields: [
            { name: "📅 Date", value: "[Date/Time]", inline: true },
            { name: "🎁 Reward", value: "[Reward]", inline: true },
          ],
          image: { url: "https://placehold.co/600x200/f1c40f/000000/gif?text=EVENT" },
          footer: { text: "[Store Name]" },
        },
      ],
    },
  },
  {
    id: "minimal",
    name: "Simple Announcement",
    category: "General",
    type: "custom",
    payload: {
      embeds: [
        {
          title: "[Title]",
          description: "[Write your message here.]",
          color: 0x2b2d31,
          thumbnail: { url: "https://placehold.co/120/2b2d31/ffffff/png?text=LOGO" },
          footer: { text: "[Store Name]" },
        },
      ],
    },
  },
];
