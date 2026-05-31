import type { DiscordMessage, Embed } from "@/lib/embed/schema";

function intToHex(color?: number): string {
  if (color == null) return "#4f545c";
  return `#${color.toString(16).padStart(6, "0")}`;
}

function EmbedView({ embed }: { embed: Embed }) {
  return (
    <div
      className="mt-1 max-w-md rounded border-l-4 bg-[#2b2d31] p-3 text-sm"
      style={{ borderColor: intToHex(embed.color) }}
    >
      {embed.thumbnail?.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={embed.thumbnail.url}
          alt=""
          className="float-right ml-3 max-h-20 max-w-20 rounded object-cover"
        />
      )}
      {embed.author?.name && (
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-zinc-200">
          {embed.author.icon_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={embed.author.icon_url} alt="" className="h-5 w-5 rounded-full" />
          )}
          {embed.author.name}
        </div>
      )}
      {embed.title && (
        <div className="font-semibold text-indigo-300">{embed.title}</div>
      )}
      {embed.description && (
        <div className="mt-1 whitespace-pre-wrap text-zinc-300">{embed.description}</div>
      )}
      {embed.fields && embed.fields.length > 0 && (
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {embed.fields.map((f, i) => (
            <div key={i} className={f.inline ? "" : "sm:col-span-2"}>
              <div className="text-xs font-semibold text-zinc-200">{f.name}</div>
              <div className="whitespace-pre-wrap text-xs text-zinc-400">{f.value}</div>
            </div>
          ))}
        </div>
      )}
      {embed.image?.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={embed.image.url} alt="" className="mt-2 max-h-60 clear-both rounded" />
      )}
      {embed.footer?.text && (
        <div className="mt-2 clear-both text-xs text-zinc-500">{embed.footer.text}</div>
      )}
    </div>
  );
}

/** Discord benzeri canlı önizleme. */
export function DiscordPreview({ message }: { message: DiscordMessage }) {
  return (
    <div className="rounded-lg bg-[#313338] p-4">
      <div className="flex gap-3">
        {message.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={message.avatar_url} alt="" className="h-10 w-10 rounded-full" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-indigo-600" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{message.username || "Webhook"}</span>
            <span className="rounded bg-indigo-600 px-1 text-[10px] font-bold text-white">BOT</span>
          </div>
          {message.content && (
            <div className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-200">{message.content}</div>
          )}
          {(message.embeds ?? []).map((e, i) => (
            <EmbedView key={i} embed={e} />
          ))}
        </div>
      </div>
    </div>
  );
}
