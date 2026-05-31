/**
 * Delivery'yi Cloudflare Queue'ya basar. Binding yoksa (lokal/dev) sessizce false döner;
 * cron sweeper 'approved' delivery'leri zaten 1 dk içinde toplar (güvenlik ağı).
 */
export async function enqueueDelivery(deliveryId: string): Promise<boolean> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    const queue = (ctx.env as Record<string, unknown>).DELIVERY_QUEUE as
      | { send: (msg: unknown) => Promise<void> }
      | undefined;
    if (queue) {
      await queue.send({ deliveryId });
      return true;
    }
  } catch {
    // dev ortamı / binding yok → cron sweeper devralır
  }
  return false;
}
