// Meta Pixel (Facebook) — browser-only. Call these from useEffect or event handlers.
export const META_PIXEL_ID = "1634787368429513";

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue: unknown[]; loaded: boolean; version: string; push: unknown };

declare global {
  interface Window { fbq?: Fbq; _fbq?: Fbq }
}

export function initMetaPixel() {
  if (typeof window === "undefined" || window.fbq) return;
  const n = function (...args: unknown[]) {
    n.callMethod ? n.callMethod(...args) : n.queue.push(args);
  } as Fbq;
  n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
  window.fbq = n; window._fbq = n;
  const t = document.createElement("script");
  t.async = true;
  t.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(t);
  window.fbq("init", META_PIXEL_ID);
}

export function trackPixel(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  initMetaPixel();
  if (params) window.fbq?.("track", event, params);
  else window.fbq?.("track", event);
}
