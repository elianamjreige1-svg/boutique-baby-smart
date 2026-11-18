import { afterEach, beforeEach, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => `h=${location.hostname}\nloc=FR\n` }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  Object.defineProperty(navigator, "globalPrivacyControl", { configurable: true, value: false });
});

it.each(["FR", "GB", "CH", "CA"])("requires an answer and blocks Meta in %s", async (country) => {
  vi.mocked(fetch).mockResolvedValue({ ok: true, text: async () => `h=${location.hostname}\nloc=${country}\n` } as Response);
  const { canTrack, needsAnswer } = await import("./consent");
  expect(await canTrack("advertising")).toBe(false);
  expect(await needsAnswer(["analytics", "advertising"])).toBe(true);
});

it("analytics acceptance never grants advertising", async () => {
  const { saveChoices, canTrack } = await import("./consent");
  saveChoices({ analytics: "granted" });
  expect(await canTrack("analytics")).toBe(true);
  expect(await canTrack("advertising")).toBe(false);
});

it("a later refusal overrides acceptance", async () => {
  const { saveChoices, canTrack } = await import("./consent");
  saveChoices({ advertising: "granted" });
  expect(await canTrack("advertising")).toBe(true);
  saveChoices({ advertising: "denied" });
  expect(await canTrack("advertising")).toBe(false);
});

it("Global Privacy Control overrides stored acceptance without a banner", async () => {
  const { saveChoices, canTrack, needsAnswer } = await import("./consent");
  saveChoices({ advertising: "granted" });
  Object.defineProperty(navigator, "globalPrivacyControl", { configurable: true, value: true });
  expect(await canTrack("advertising")).toBe(false);
  expect(await needsAnswer(["analytics", "advertising"])).toBe(false);
});

it("blocks Meta when the region lookup fails", async () => {
  vi.mocked(fetch).mockRejectedValue(new Error("Unavailable"));
  const { canTrack } = await import("./consent");
  expect(await canTrack("advertising")).toBe(false);
});

it("permits ordinary tracking in Lebanon unless the visitor refuses", async () => {
  vi.mocked(fetch).mockResolvedValue({ ok: true, text: async () => `h=${location.hostname}\nloc=LB\n` } as Response);
  const { canTrack, saveChoices, needsAnswer } = await import("./consent");
  expect(await needsAnswer(["analytics", "advertising"])).toBe(false);
  expect(await canTrack("advertising")).toBe(true);
  saveChoices({ advertising: "denied" });
  expect(await canTrack("advertising")).toBe(false);
});

it("rechecks a refusal saved while the regional lookup is pending", async () => {
  let resolveTrace: ((response: Response) => void) | undefined;
  vi.mocked(fetch).mockReturnValue(new Promise<Response>((resolve) => { resolveTrace = resolve; }));
  const { canTrack, saveChoices } = await import("./consent");
  const permission = canTrack("advertising");
  saveChoices({ advertising: "denied" });
  resolveTrace?.({ ok: true, text: async () => `h=${location.hostname}\nloc=LB\n` } as Response);
  expect(await permission).toBe(false);
});