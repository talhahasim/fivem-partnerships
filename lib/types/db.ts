/** Elle tutulan DB satır tipleri (supabase/migrations/0001_init.sql ile uyumlu). */
import type { DiscordMessage } from "@/lib/embed/schema";

export type ApprovalMode = "auto" | "manual";
export type NotifyMode = "channel" | "none";
export type TemplateType = "partnership_intro" | "product" | "custom";
export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";
export type PartnerStatus = "accepted" | "revoked";
export type AnnounceTarget = "all" | "selected" | "own";
export type DeliverySource = "intro" | "announcement";
export type DeliveryStatus = "pending" | "approved" | "sent" | "failed" | "rejected";

export type Profile = {
  id: string;
  discord_id: string | null;
  username: string | null;
  avatar_url: string | null;
};

export type Store = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  discord_guild_id: string | null;
  created_at: string;
};

export type Webhook = {
  id: string;
  store_id: string;
  label: string;
  url_encrypted: string;
  thread_id: string | null;
  guild_name: string | null;
  channel_name: string | null;
  is_valid: boolean;
  last_checked_at: string | null;
  created_at: string;
};

export type Template = {
  id: string;
  store_id: string;
  name: string;
  type: TemplateType;
  payload_json: DiscordMessage;
  created_at: string;
};

export type StoreSettings = {
  store_id: string;
  approval_mode: ApprovalMode;
  notify_mode: NotifyMode;
  notify_webhook_id: string | null;
  default_intro_template_id: string | null;
};

export type Invite = {
  id: string;
  token: string;
  inviter_store_id: string;
  inviter_webhook_id: string | null;
  inviter_intro_template_id: string | null;
  inviter_thread_id: string | null;
  status: InviteStatus;
  expires_at: string | null;
  used_at: string | null;
  created_at: string;
};

export type Partnership = {
  id: string;
  inviter_store_id: string;
  invitee_store_id: string;
  status: PartnerStatus;
  inviter_webhook_id: string | null;
  invitee_webhook_id: string | null;
  inviter_thread_id: string | null;
  invitee_thread_id: string | null;
  inviter_intro_payload: DiscordMessage | null;
  invitee_intro_payload: DiscordMessage | null;
  accepted_at: string;
  created_at: string;
};

export type Announcement = {
  id: string;
  store_id: string;
  title: string;
  payload_json: DiscordMessage;
  target: AnnounceTarget;
  created_at: string;
};

export type Delivery = {
  id: string;
  sender_store_id: string;
  recipient_store_id: string;
  partnership_id: string | null;
  webhook_id: string;
  thread_id: string | null;
  source_type: DeliverySource;
  source_id: string | null;
  payload_json: DiscordMessage;
  status: DeliveryStatus;
  approved_at: string | null;
  sent_at: string | null;
  discord_message_id: string | null;
  error: string | null;
  attempts: number;
  created_at: string;
};

export type SenderProfile = {
  id: string;
  store_id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  is_default: boolean;
  created_at: string;
};

export type AppNotification = {
  id: string;
  store_id: string;
  type: string;
  data_json: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};
