// Meta Pixel (Facebook) — browser-only. Call these from useEffect or event handlers.
import { canTrack, readChoice } from "./consent";
export const META_PIXEL_ID = "1634787368429513";

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue: unknown[]; loaded: boolean; version: string; push: unknown };

declare global {
  interface Window { fbq?: Fbq; _fbq?: Fbq }
}

export async function initMetaPixel() {
  if (typeof window === "undefined" || !(await canTrack("advertising"))) return false;
  if (readChoice("advertising") === "denied") return false;
  if (window.fbq) {
    window.fbq("consent", "grant");
    return true;
  }
  const n = function (...args: unknown[]) {
    n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
  } as Fbq;
  n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
  window.fbq = n; window._fbq = n;
  const t = document.createElement("script");
  t.async = true;
  t.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(t);
  window.fbq("set", "autoConfig", false, META_PIXEL_ID);
  window.fbq("init", META_PIXEL_ID, {}, { agent: "lovable" });
  return true;
}

export async function trackPixel(event: string, params?: Record<string, unknown>) {
  if (!(await initMetaPixel()) || readChoice("advertising") === "denied") return;
  if (params) window.fbq?.("track", event, params);
  else window.fbq?.("track", event);
}

export function syncMetaConsent() {
  if (readChoice("advertising") === "denied") window.fbq?.("consent", "revoke");
  else void initMetaPixel();
}
