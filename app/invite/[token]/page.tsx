import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getActiveStore } from "@/lib/stores";
import { acceptInvite } from "@/app/actions/invites";
import { defaultIntroMessage } from "@/lib/embed/defaults";
import { messageSchema } from "@/lib/embed/schema";
import { DiscordPreview } from "@/components/embed-editor/preview";
import { Button, Card, Input, Label } from "@/components/ui";
import { Select } from "@/components/select";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: invite } = await admin.from("invites").select("*").eq("token", token).maybeSingle();

  const invalid =
    !invite ||
    invite.status !== "pending" ||
    (invite.expires_at && new Date(invite.expires_at) < new Date());

  if (invalid) {
    return (
      <Centered>
        <Card className="max-w-md text-center">
          <h1 className="text-lg font-semibold text-zinc-100">Invalid invite</h1>
          <p className="mt-2 text-sm text-zinc-400">
            This invite link may have been used, revoked, or expired.
          </p>
        </Card>
      </Centered>
    );
  }

  // Inviter mağaza + intro önizleme
  const { data: inviterStore } = await admin
    .from("stores")
    .select("name,logo_url")
    .eq("id", invite.inviter_store_id)
    .single();

  let introPayload = defaultIntroMessage(inviterStore?.name ?? "Partner");
  if (invite.inviter_intro_template_id) {
    const { data: tpl } = await admin
      .from("templates")
      .select("payload_json")
      .eq("id", invite.inviter_intro_template_id)
      .maybeSingle();
    const parsed = messageSchema.safeParse(tpl?.payload_json);
    if (parsed.success) introPayload = parsed.data;
  }

  // Davetli oturumu
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Centered>
      <Card className="w-full max-w-2xl">
        <div className="flex items-center gap-3">
          {inviterStore?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={inviterStore.logo_url} alt="" className="h-12 w-12 rounded-lg" />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-indigo-600" />
          )}
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">
              {inviterStore?.name ?? "A store"} is inviting you to partner up
            </h1>
            <p className="text-sm text-zinc-400">
              If you accept, your messages will be posted to each other&apos;s channels.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <Label>The partnership message you&apos;ll receive</Label>
          <div className="mt-2">
            <DiscordPreview message={introPayload} />
          </div>
        </div>

        <div className="mt-6">
          {!user ? (
            <Link
              href={`/login?next=/invite/${token}`}
              className="inline-flex rounded-lg bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-primary-hover"
            >
              Sign in with Discord to accept
            </Link>
          ) : (
            <AcceptSection token={token} />
          )}
        </div>
      </Card>
    </Centered>
  );
}

async function AcceptSection({ token }: { token: string }) {
  const { store } = await getActiveStore();
  if (!store) {
    return (
      <p className="text-sm text-warning">
        Create a store first to accept the invite.{" "}
        <Link href="/onboarding" className="underline">
          Create store
        </Link>
      </p>
    );
  }

  const supabase = await createClient();
  const [webhooksRes, templatesRes] = await Promise.all([
    supabase.from("webhooks").select("id,label").eq("store_id", store.id),
    supabase.from("templates").select("id,name").eq("store_id", store.id).in("type", ["partnership_intro", "custom"]),
  ]);
  const webhooks = webhooksRes.data ?? [];
  const templates = templatesRes.data ?? [];

  if (webhooks.length === 0) {
    return (
      <p className="text-sm text-warning">
        You need to add a webhook first to accept the invite.{" "}
        <Link href="/dashboard/webhooks" className="underline">
          Add webhook
        </Link>
      </p>
    );
  }

  return (
    <form action={acceptInvite} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <p className="text-sm text-zinc-400">
        Accepting as <strong className="text-zinc-200">{store.name}</strong>.
      </p>
      <div>
        <Label htmlFor="webhook_id">Your channel (webhook) that receives their message *</Label>
        <Select
          id="webhook_id"
          name="webhook_id"
          placeholder="— Select channel —"
          options={webhooks.map((w) => ({ value: w.id, label: w.label }))}
        />
      </div>
      <div>
        <Label htmlFor="thread_id">Forum post (optional)</Label>
        <Input
          id="thread_id"
          name="thread_id"
          placeholder="https://discord.com/channels/… or thread ID"
          className="font-mono text-xs"
        />
        <p className="mt-1 text-xs text-faint">
          Only if your channel is a forum/post channel — messages go into that post, never a new one.
        </p>
      </div>
      <div>
        <Label htmlFor="template_id">Your partnership message</Label>
        <Select
          id="template_id"
          name="template_id"
          defaultValue=""
          options={[
            { value: "", label: "Default message" },
            ...templates.map((t) => ({ value: t.id, label: t.name })),
          ]}
        />
      </div>
      <Button type="submit">Accept partnership</Button>
    </form>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="flex flex-1 items-center justify-center p-6">{children}</main>;
}
