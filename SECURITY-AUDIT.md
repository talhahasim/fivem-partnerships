# Güvenlik Denetimi & Kod Review

Tarih: 2026-05-30 · Kapsam: V1 tam uygulama (Next.js + Supabase + Cloudflare worker)

## Webhook şifreleme modeli (E2EE notu)

**Gerçek E2EE bu sistemde mümkün değil:** çekirdek işlev, sen offline'ken bile worker'ın
partner kanalına otomatik mesaj göndermesi. Bu, sunucunun gönderim anında webhook URL'inin
açık halini bilmesini *zorunlu* kılar. Anahtar yalnız tarayıcıda olsaydı oto-onay / pending
kuyruğu / cron çalışamazdı.

Uygulanan model — **at-rest authenticated encryption**:
- AES-256-GCM (`lib/crypto.ts`), anahtar `WEBHOOK_ENC_KEY` (32 byte) sunucu/worker secret'ı.
- **AAD = store_id**: bir kaydın ciphertext'i başka mağaza satırına kopyalanamaz (ciphertext-swap koruması).
- Açık URL DB'de/clientta hiç tutulmaz; yalnız `decrypt` anında bellekte oluşur, yalnız sunucu/worker erişir.
- DB sızıntısı tek başına URL'leri açığa çıkarmaz (anahtar ayrı secret store'da).

Gelecekte sertleştirme: env anahtarı yerine KMS/Vault + per-store DEK (envelope encryption).

---

## Bulgular & uygulanan düzeltmeler

| # | Önem | Bulgu | Düzeltme |
|---|------|-------|----------|
| 1 | **Yüksek** | `sendWebhookMessage` default `allowed_mentions:{parse:[]}` payload spread'inden ÖNCE geliyordu → kötü niyetli payload ezip `@everyone` pingleyebilirdi. | `allowed_mentions` artık spread'den SONRA yazılıyor (ezilemez). Ayrıca payloadlar `messageSchema` ile parse edildiğinden bilinmeyen alanlar zaten strip ediliyor — iki kat savunma. |
| 2 | **Yüksek** | Cloudflare Queues at-least-once teslim eder → aynı delivery çift gönderilebilirdi. Worker ayrıca `pending` durumu da gönderiyordu (onay bypass). | Worker artık **atomik claim** yapıyor: yalnız `approved`→`sending` UPDATE'i kazanan işler; `pending` asla gönderilmez. Takılan `sending` kayıtlar 2 dk sonra sweeper ile kurtarılır. |
| 3 | Orta | `partnerships` UPDATE RLS politikasında `WITH CHECK` yoktu → bir taraf partnerliği başka mağazalara taşıyabilirdi. | `WITH CHECK (owns_store(...) )` eklendi. |
| 4 | Düşük | `discord.ts`'te ölü ifade (`status<500 ? false:false`). | Sadeleştirildi. |

---

## Doğrulanan kontroller (geçti)

- **SSRF:** `isValidWebhookUrl` yalnız `discord.com`/`discordapp.com` host + webhook path regex'ine izin verir; `validateWebhook` ve `sendWebhookMessage` her ikisi de doğrular. Cloudflare `global_fetch_strictly_public` flag'i ile özel IP'lere fetch engellenir.
- **Open redirect:** login `next` ve OAuth callback `next` yalnız site içi göreli yola (`/...`, `//` hariç) izin verir.
- **Yetkilendirme:** tüm server action'lar `requireUser`/`requireActiveStore` ile başlar; webhook/template/settings/delivery işlemleri RLS sahiplik politikalarıyla korunur.
- **RLS:** her tabloda aktif; store-scoped tablolar `owns_store()` ile; `deliveries` alıcı/gönderen ayrımıyla; `invites` token okuma yalnız service-role üzerinden.
- **Service-role anahtarı:** yalnız `lib/supabase/admin.ts` (server) ve worker secret'ında; `NEXT_PUBLIC` değil.
- **CSRF:** Next.js server action'ların yerleşik origin doğrulaması.
- **Davet token:** 24 byte rastgele (48 hex), tek kullanımlık, 14 gün expiry; listeleme/enumerasyon yok.
- **Mention abuse:** `allowed_mentions` zorla boş (bkz. #1).
- **Payload doğrulama:** tüm embed payloadları `messageSchema` (zod + Discord limitleri: 6000 char, 10 embed, alan limitleri) ile parse edilir; bilinmeyen alanlar strip edilir.

---

## Kalan riskler / öneriler (V1 sonrası)

- **Rate limiting yok:** davet oluşturma, webhook doğrulama (dış GET) ve broadcast için uygulama
  katmanı rate-limit eklenmeli (örn. Cloudflare Rate Limiting / Turnstile, ya da DB sayaç).
- **Bildirim gönderimi istek yolunda:** `notifyPendingDelivery` action içinde senkron Discord
  çağrısı yapar; çok partnerli broadcast'te yavaşlayabilir → bildirimleri de kuyruğa taşı.
- **Webhook geçerliliği bayatlayabilir:** partner kanalı silinirse webhook 404 olur; periyodik
  yeniden doğrulama + `is_valid=false` işaretleme job'u eklenebilir.
- **partnerships UPDATE** politikası taraflara kendi partnerliklerinin webhook/payload alanlarını
  değiştirme izni verir (yalnız kendilerini etkiler); kolon-bazlı kısıt/trigger ile daraltılabilir.
- **Audit log yok:** kritik işlemler (revoke, approve, broadcast) için denetim kaydı önerilir.
- **Anahtar rotasyonu:** `WEBHOOK_ENC_KEY` rotasyonu için key-id öneki + çift okuma stratejisi planlanmalı.
