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
import { GuestAcceptForm } from "@/components/invite/guest-accept-form";

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

  // Webhook sender = inviter'ın VARSAYILAN gönderen profili (varsa). Yoksa generic kalır.
  const { data: defaultProfile } = await admin
    .from("sender_profiles")
    .select("username,avatar_url")
    .eq("store_id", invite.inviter_store_id)
    .eq("is_default", true)
    .maybeSingle();
  if (defaultProfile) {
    introPayload = {
      ...introPayload,
      username: introPayload.username ?? defaultProfile.username ?? undefined,
      avatar_url: introPayload.avatar_url ?? defaultProfile.avatar_url ?? undefined,
    };
  }

  // Davetli oturumu
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { store } = user ? await getActiveStore() : { store: null };

  const header = (
    <div className="flex items-center gap-3">
      {inviterStore?.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={inviterStore.logo_url}
          alt=""
          className="h-12 w-12 shrink-0 rounded-lg bg-card object-contain"
        />
      ) : (
        <div className="h-12 w-12 shrink-0 rounded-lg bg-indigo-600" />
      )}
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">
          {inviterStore?.name ?? "A store"} is inviting you to partner up
        </h1>
        <p className="text-sm text-zinc-400">
          If you accept, your messages will be posted to each other's channels.
        </p>
      </div>
    </div>
  );

  const preview = (
    <div className="mt-5">
      <Label>The partnership message you'll receive</Label>
      <div className="mt-2">
        <DiscordPreview message={introPayload} />
      </div>
    </div>
  );

  // Kayıtlı kullanıcı + mağaza → mevcut dropdown akışı. Aksi halde → misafir (text) akışı.
  if (store) {
    return (
      <Centered>
        <Card className="w-full max-w-2xl">
          {header}
          {preview}
          <div className="mt-6">
            <RegisteredAcceptSection token={token} storeId={store.id} storeName={store.name} />
          </div>
        </Card>
      </Centered>
    );
  }

  return (
    <main className="flex flex-1 items-start justify-center p-6">
      <div className="flex w-full max-w-5xl flex-col gap-5 lg:flex-row lg:items-start">
        <Card className="w-full lg:max-w-2xl lg:flex-1">
          {header}
          {preview}
          <div className="mt-6">
            <GuestAcceptForm token={token} />
          </div>
        </Card>
        <SignupPromo token={token} />
      </div>
    </main>
  );
}

async function RegisteredAcceptSection({
  token,
  storeId,
  storeName,
}: {
  token: string;
  storeId: string;
  storeName: string;
}) {
  const supabase = await createClient();
  const [webhooksRes, templatesRes] = await Promise.all([
    supabase.from("webhooks").select("id,label").eq("store_id", storeId),
    supabase
      .from("templates")
      .select("id,name")
      .eq("store_id", storeId)
      .in("type", ["partnership_intro", "custom"]),
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
        Accepting as <strong className="text-zinc-200">{storeName}</strong>.
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

/** Kayıt olmaya teşvik eden statik yan panel. */
function SignupPromo({ token }: { token: string }) {
  return (
    <aside className="w-full lg:w-72 lg:shrink-0">
      <Card className="border-primary/30 bg-primary/5 lg:sticky lg:top-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-primary-2">
          Have your own store?
        </div>
        <h2 className="mt-1 text-base font-semibold text-zinc-100">Create a free account</h2>
        <p className="mt-2 text-sm text-zinc-400">
          You can accept this without signing up. But with a free account you also get:
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-zinc-300">
          <li>• Reusable webhooks &amp; sender profiles</li>
          <li>• Saved message templates &amp; embeds</li>
          <li>• Approve incoming partner posts</li>
          <li>• Broadcast announcements to all partners</li>
        </ul>
        <Link
          href={`/login?next=/invite/${token}`}
          className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          Sign in with Discord
        </Link>
        <p className="mt-2 text-center text-xs text-faint">Free • takes 30 seconds</p>
      </Card>
    </aside>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="flex flex-1 items-center justify-center p-6">{children}</main>;
}
