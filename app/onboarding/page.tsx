import { requireUser } from "@/lib/auth";
import { createStore } from "@/app/actions/store";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";

export default async function OnboardingPage() {
  await requireUser();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center p-8">
      <Card>
        <h1 className="text-xl font-semibold text-zinc-100">Create your store</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Set up the store profile you&apos;ll manage partnerships from.
        </p>
        <form action={createStore} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="name">Store name *</Label>
            <Input id="name" name="name" required placeholder="e.g. Nova Scripts" />
          </div>
          <div>
            <Label htmlFor="logo_url">Logo URL</Label>
            <Input id="logo_url" name="logo_url" placeholder="https://..." />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} placeholder="Short description" />
          </div>
          <Button type="submit" className="w-full">
            Create and continue
          </Button>
        </form>
      </Card>
    </main>
  );
}
