import { afterEach, describe, expect, it, vi } from "vitest";
import { initMetaPixel, META_PIXEL_ID, trackPixel } from "./meta-pixel";

afterEach(() => {
  delete window.fbq;
  delete window._fbq;
  document.querySelectorAll('script[src="https://connect.facebook.net/en_US/fbevents.js"]').forEach((script) => script.remove());
});

describe("Meta Pixel", () => {
  it("initializes pixel 1634787368429513 only once", () => {
    initMetaPixel();
    initMetaPixel();
    expect(META_PIXEL_ID).toBe("1634787368429513");
    expect(window.fbq?.queue).toEqual([["init", "1634787368429513"]]);
    expect(document.querySelectorAll('script[src="https://connect.facebook.net/en_US/fbevents.js"]')).toHaveLength(1);
  });

  it.each(["ViewContent", "AddToCart", "InitiateCheckout", "AddPaymentInfo"])("sends %s through fbq track", (event) => {
    trackPixel(event);
    expect(window.fbq?.queue).toContainEqual(["track", event]);
  });

  it("sends Purchase value in USD", () => {
    initMetaPixel();
    const call = vi.fn();
    if (window.fbq) window.fbq.callMethod = call;
    trackPixel("Purchase", { value: 24.5, currency: "USD" });
    expect(call).toHaveBeenCalledWith("track", "Purchase", { value: 24.5, currency: "USD" });
  });
});