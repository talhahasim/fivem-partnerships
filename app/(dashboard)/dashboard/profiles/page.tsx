import { createClient } from "@/lib/supabase/server";
import { requireActiveStore } from "@/lib/stores";
import { deleteProfile, setDefaultProfile } from "@/app/actions/profiles";
import { AddProfileForm } from "@/components/profiles/add-form";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { DeleteButton } from "@/components/delete-button";
import type { SenderProfile } from "@/lib/types/db";

export default async function ProfilesPage() {
  const { store } = await requireActiveStore();
  const supabase = await createClient();
  const { data } = await supabase
    .from("sender_profiles")
    .select("*")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });
  const profiles = (data ?? []) as SenderProfile[];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Identity"
        title="Sender profiles"
        description="Save a webhook name and avatar once, then reuse it on every message. The default profile is applied automatically to new messages."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {profiles.length === 0 ? (
            <EmptyState
              title="No profiles yet"
              hint="Create a profile so you don't have to retype your webhook name and avatar."
              icon="👤"
            />
          ) : (
            profiles.map((p) => (
              <Card key={p.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary/20" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{p.name}</span>
                      {p.is_default && <Badge tone="green">default</Badge>}
                    </div>
                    <div className="text-xs text-muted">{p.username || "no username"}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!p.is_default && (
                    <form action={setDefaultProfile}>
                      <input type="hidden" name="id" value={p.id} />
                      <Button type="submit" variant="secondary">
                        Make default
                      </Button>
                    </form>
                  )}
                  <form action={deleteProfile}>
                    <input type="hidden" name="id" value={p.id} />
                    <DeleteButton label="Delete profile" />
                  </form>
                </div>
              </Card>
            ))
          )}
        </div>
        <Card className="h-fit">
          <h2 className="mb-3 font-medium text-foreground">New profile</h2>
          <AddProfileForm />
        </Card>
      </div>
    </div>
  );
}
