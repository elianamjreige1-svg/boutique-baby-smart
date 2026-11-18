import { afterEach, describe, expect, it, vi } from "vitest";
import { initMetaPixel, META_PIXEL_ID, trackPixel } from "./meta-pixel";
import { canTrack, readChoice } from "./consent";
import { syncMetaConsent } from "./meta-pixel";

vi.mock("./consent", () => ({ canTrack: vi.fn().mockResolvedValue(true), readChoice: vi.fn().mockReturnValue(null) }));

afterEach(() => {
  vi.mocked(canTrack).mockResolvedValue(true);
  vi.mocked(readChoice).mockReturnValue(null);
  vi.clearAllMocks();
  delete window.fbq;
  delete window._fbq;
  document.querySelectorAll('script[src="https://connect.facebook.net/en_US/fbevents.js"]').forEach((script) => script.remove());
});

describe("Meta Pixel", () => {
  it("initializes pixel 1634787368429513 only once", async () => {
    await initMetaPixel();
    await initMetaPixel();
    expect(META_PIXEL_ID).toBe("1634787368429513");
    expect(window.fbq?.queue.filter((call) => Array.isArray(call) && call[0] === "init")).toEqual([["init", "1634787368429513", {}, { agent: "lovable" }]]);
    expect(document.querySelectorAll('script[src="https://connect.facebook.net/en_US/fbevents.js"]')).toHaveLength(1);
  });

  it.each(["ViewContent", "AddToCart", "InitiateCheckout", "AddPaymentInfo"])("sends %s through fbq track", async (event) => {
    await trackPixel(event);
    expect(window.fbq?.queue).toContainEqual(["track", event]);
  });

  it("sends Purchase value in USD", async () => {
    await initMetaPixel();
    const call = vi.fn();
    if (window.fbq) window.fbq.callMethod = call;
    await trackPixel("Purchase", { value: 24.5, currency: "USD" });
    expect(call).toHaveBeenCalledWith("track", "Purchase", { value: 24.5, currency: "USD" });
  });

  it("does not load or send Meta when advertising permission is absent", async () => {
    vi.mocked(canTrack).mockResolvedValue(false);
    await trackPixel("ViewContent");
    expect(window.fbq).toBeUndefined();
    expect(document.querySelector('script[src="https://connect.facebook.net/en_US/fbevents.js"]')).toBeNull();
  });

  it("revokes immediately and stops future events after withdrawal", async () => {
    await initMetaPixel();
    const call = vi.fn();
    if (window.fbq) window.fbq.callMethod = call;
    vi.mocked(readChoice).mockReturnValue("denied");
    vi.mocked(canTrack).mockResolvedValue(false);
    syncMetaConsent();
    await trackPixel("Purchase", { value: 24.5, currency: "USD" });
    expect(call).toHaveBeenCalledWith("consent", "revoke");
    expect(call).not.toHaveBeenCalledWith("track", "Purchase", expect.anything());
  });
});