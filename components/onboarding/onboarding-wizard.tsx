"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { obCreateStore, obCreateTemplate } from "@/app/actions/onboarding";
import { addProfile } from "@/app/actions/profiles";
import { addWebhook } from "@/app/actions/webhooks";
import { EmbedEditor } from "@/components/embed-editor/editor";
import { defaultIntroMessage } from "@/lib/embed/defaults";
import type { DiscordMessage } from "@/lib/embed/schema";

const STEPS = ["Store", "Sender profile", "Webhook", "Template"] as const;

// Arka plan üzerinde, kenarlıksız büyük input — kart/section yok.
const BIG =
  "w-full bg-transparent border-0 border-b-2 border-border px-0 py-3 text-2xl sm:text-3xl " +
  "text-foreground outline-none transition-colors placeholder:text-zinc-700 focus:border-primary";

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [storeState, storeAction, storePending] = useActionState(obCreateStore, {});
  const [profileState, profileAction, profilePending] = useActionState(addProfile, {});
  const [webhookState, webhookAction, webhookPending] = useActionState(addWebhook, {});
  const [templateState, templateAction, templatePending] = useActionState(obCreateTemplate, {});

  // Tüm alanlar kontrollü → Back/İleri yapınca girilen değerler korunur.
  const [storeName, setStoreName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookThread, setWebhookThread] = useState("");
  // Template embed'i — Back/İleri'de korunması için wizard state'inde tutulur.
  const [templatePayload, setTemplatePayload] = useState<DiscordMessage | undefined>(undefined);

  useEffect(() => {
    if (storeState.ok) {
      // Sender name'i mağaza adıyla otomatik doldur (boşsa) — yine düzenlenebilir.
      setDisplayName((cur) => cur || storeName);
      setStep(1);
    }
    // storeName'i kasıtlı olarak deps'e koymuyoruz: yalnız adım geçişinde 1 kez doldursun.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeState.ok]);
  useEffect(() => {
    if (profileState.ok) setStep(2);
  }, [profileState.ok]);
  useEffect(() => {
    if (webhookState.ok) setStep(3);
  }, [webhookState.ok]);
  useEffect(() => {
    if (templateState.ok) setStep(4);
  }, [templateState.ok]);

  // Her adımda ilk (gizli olmayan) input'a otomatik focus — kullanıcı tıklamak zorunda kalmasın.
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = contentRef.current?.querySelector<HTMLElement>(
      'input:not([type="hidden"]), textarea',
    );
    el?.focus();
  }, [step]);

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* İlerleme çubuğu */}
      <div className="flex items-center gap-2 px-6 pt-6 sm:px-12">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 flex-col gap-1.5">
            <div
              className={`h-1 rounded-full transition-colors ${
                i < step ? "bg-primary" : i === step ? "bg-primary/60" : "bg-border"
              }`}
            />
            <span
              className={`hidden text-[11px] sm:block ${
                i <= step ? "text-zinc-300" : "text-zinc-600"
              }`}
            >
              {i + 1}. {label}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-12">
        <div ref={contentRef} className="w-full max-w-2xl">
          {/* 1) STORE */}
          {step === 0 && (
            <form action={storeAction}>
              <Eyebrow>Step 1 of 4</Eyebrow>
              <Title>What&apos;s your store called?</Title>
              <Subtitle>This is the name partners will see. You can change it later.</Subtitle>
              <input
                name="name"
                autoFocus
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="e.g. Nova Scripts"
                className={`mt-8 ${BIG}`}
              />
              <ErrorText>{storeState.error}</ErrorText>
              <Actions>
                <Submit pending={storePending}>Continue →</Submit>
              </Actions>
            </form>
          )}

          {/* 2) SENDER PROFILE */}
          {step === 1 && (
            <form action={profileAction}>
              <Eyebrow>Step 2 of 4</Eyebrow>
              <Title>Create your first sender profile</Title>
              <Subtitle>
                The name &amp; avatar your messages are posted under in Discord.
              </Subtitle>
              <input type="hidden" name="name" value={displayName || "Sender"} />
              <input
                name="username"
                autoFocus
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name — e.g. Nova Partnerships"
                className={`mt-8 ${BIG}`}
              />
              <input
                name="avatar_url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="Avatar image URL (optional)"
                className={`mt-6 ${BIG} text-lg sm:text-xl`}
              />

              {/* Canlı önizleme — Discord'da nasıl görüneceği */}
              <div className="mt-8">
                <p className="mb-2 text-xs uppercase tracking-widest text-faint">Preview</p>
                <div className="flex items-center gap-3">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-indigo-600" />
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-white">
                      {displayName || "Sender"}
                    </span>
                    <span className="rounded bg-indigo-600 px-1 text-[10px] font-bold text-white">
                      BOT
                    </span>
                  </div>
                </div>
              </div>

              <ErrorText>{profileState.error}</ErrorText>
              <Actions onSkip={() => setStep(2)} onBack={() => setStep(0)}>
                <Submit pending={profilePending}>Continue →</Submit>
              </Actions>
            </form>
          )}

          {/* 3) WEBHOOK */}
          {step === 2 && (
            <form action={webhookAction}>
              <Eyebrow>Step 3 of 4</Eyebrow>
              <Title>Connect your first channel</Title>
              <Subtitle>
                Paste a Discord webhook URL — this is the channel where your partners&apos; messages
                will land. (Server Settings → Integrations → Webhooks → New Webhook.)
              </Subtitle>
              <input type="hidden" name="label" value="Main channel" />
              <input
                name="url"
                autoFocus
                required
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/…"
                className={`mt-8 ${BIG} font-mono text-lg sm:text-xl`}
              />
              <input
                name="thread_id"
                value={webhookThread}
                onChange={(e) => setWebhookThread(e.target.value)}
                placeholder="Forum post link or thread ID (optional)"
                className={`mt-6 ${BIG} font-mono text-base sm:text-lg`}
              />
              <p className="mt-2 text-sm text-amber-400/90">
                Leave empty for a normal text channel. If this webhook points to a{" "}
                <strong>forum / posts channel</strong>, you <strong>must</strong> enter an existing
                post&apos;s link or thread ID here — otherwise messages can&apos;t be delivered (we
                never create a new post).
              </p>
              <ErrorText>{webhookState.error}</ErrorText>
              <Actions onSkip={() => setStep(3)} onBack={() => setStep(1)}>
                <Submit pending={webhookPending}>Continue →</Submit>
              </Actions>
            </form>
          )}

          {/* 4) TEMPLATE — embed editörüyle düzenlenir */}
          {step === 3 && (
            <form action={templateAction}>
              <Eyebrow>Step 4 of 4</Eyebrow>
              <Title>Design your partnership message</Title>
              <Subtitle>
                The embed we&apos;ll post to a partner&apos;s channel when you team up. Click any
                text to edit it. Saved as a reusable template.
              </Subtitle>
              <div className="mt-8">
                <EmbedEditor
                  name="payload"
                  defaultValue={
                    templatePayload ?? {
                      ...defaultIntroMessage(storeName || "your store"),
                      // Sender'ı önceki adımda girilen profil bilgisiyle doldur.
                      username: displayName || undefined,
                      avatar_url: avatarUrl || undefined,
                    }
                  }
                  onChange={setTemplatePayload}
                />
              </div>
              <ErrorText>{templateState.error}</ErrorText>
              <Actions onSkip={() => setStep(4)} onBack={() => setStep(2)}>
                <Submit pending={templatePending}>Continue →</Submit>
              </Actions>
            </form>
          )}

          {/* 5) FINISH */}
          {step === 4 && (
            <div className="text-center">
              <Title>You&apos;re all set!</Title>
              <Subtitle>
                Your store is ready. Invite partners, send announcements, and manage everything from
                your dashboard.
              </Subtitle>
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-base font-medium text-white transition-colors hover:bg-primary-hover"
                >
                  Go to dashboard →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-primary-2">{children}</p>
  );
}
function Title({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
      {children}
    </h1>
  );
}
function Subtitle({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 max-w-xl text-base text-zinc-400">{children}</p>;
}
function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="mt-4 text-sm text-red-400">{children}</p>;
}

function Actions({
  children,
  onSkip,
  onBack,
}: {
  children: React.ReactNode;
  onSkip?: () => void;
  onBack?: () => void;
}) {
  return (
    <div className="mt-10 flex items-center gap-4">
      {children}
      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-faint transition-colors hover:text-zinc-300"
        >
          Skip for now
        </button>
      )}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="ml-auto text-sm text-faint transition-colors hover:text-zinc-300"
        >
          ← Back
        </button>
      )}
    </div>
  );
}

function Submit({ children, pending }: { children: React.ReactNode; pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-base font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Saving…" : children}
    </button>
  );
}
