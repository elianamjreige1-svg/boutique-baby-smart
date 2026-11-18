import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { needsAnswer, onConsentChange, readChoice, saveChoices, type Purpose } from "@/lib/consent";
import { syncMetaConsent } from "@/lib/meta-pixel";

const purposes: Purpose[] = ["analytics", "advertising"];

export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [advertising, setAdvertising] = useState(false);
  const [gpc, setGpc] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      syncMetaConsent();
      setGpc((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true);
      setAnalytics(readChoice("analytics") === "granted");
      setAdvertising(readChoice("advertising") === "granted");
      void needsAnswer(purposes).then((needed) => { if (active && needed) setOpen(true); });
    };
    refresh();
    const unsubscribe = onConsentChange(refresh);
    return () => { active = false; unsubscribe(); };
  }, []);

  useEffect(() => { if (open) panel.current?.focus(); }, [open, settings]);

  const save = (a: boolean, ad: boolean) => {
    const choices = { analytics: a && !gpc ? "granted" : "denied", advertising: ad && !gpc ? "granted" : "denied" } as const;
    // Retain earlier acceptance evidence when recording a later withdrawal.
    try {
      const history: unknown[] = JSON.parse(localStorage.getItem("ck_consent_evidence") ?? "[]");
      localStorage.setItem("ck_consent_evidence", JSON.stringify([...history, {
        at: new Date().toISOString(), choices, notice: "2026-11-18", privacyPolicy: "/privacy",
        coverage: "EU/EEA, UK, Switzerland, Canada; unknown regions require an answer",
        recipients: ["Lovable", "Meta"], purposes: ["visit and click analytics", "advertising measurement and optimization"],
      }]));
    } catch { /* Permission still applies if browser storage is unavailable. */ }
    saveChoices(choices);
    setOpen(false);
    setSettings(false);
    trigger.current?.focus();
  };

  return <>
    <Button ref={trigger} variant="link" onClick={() => {
      setAnalytics(readChoice("analytics") === "granted");
      setAdvertising(readChoice("advertising") === "granted");
      setSettings(true); setOpen(true);
    }}>Cookie settings</Button>
    <Button asChild variant="link"><Link to="/privacy">Privacy policy</Link></Button>
    {open && <section ref={panel} tabIndex={-1} aria-labelledby="cookie-title" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-h-[80dvh] max-w-xl overflow-y-auto rounded-lg border border-border bg-background p-5 text-left text-foreground shadow-lg sm:inset-x-6 sm:bottom-6">
      <h2 id="cookie-title" className="text-xl font-semibold">{settings ? "Cookie settings" : "Your privacy choices"}</h2>
      {settings ? <>
        {gpc && <p className="mt-3 text-sm text-muted-foreground">Your browser’s privacy signal applies. Optional tracking is off.</p>}
        <div className="mt-4 flex items-center justify-between gap-4 border-b border-border py-3"><span>Necessary</span><span className="text-sm text-muted-foreground">Always on</span></div>
        <div className="flex items-center justify-between gap-4 border-b border-border py-3"><label htmlFor="analytics-choice">Analytics, provided by Lovable</label><Switch id="analytics-choice" checked={analytics && !gpc} disabled={gpc} onCheckedChange={setAnalytics} /></div>
        <div className="flex items-center justify-between gap-4 py-3"><label htmlFor="advertising-choice">Advertising, provided by Meta</label><Switch id="advertising-choice" checked={advertising && !gpc} disabled={gpc} onCheckedChange={setAdvertising} /></div>
        <Button className="mt-4 w-full" onClick={() => save(analytics, advertising)}>Save settings</Button>
      </> : <>
        <p className="mt-3 text-sm text-muted-foreground">We count visits without cookies. If you accept analytics, we also measure clicks. Advertising cookies measure shopping activity and help improve ads.</p>
        <p className="mt-2 text-sm"><Link to="/privacy" className="text-primary underline">Privacy policy</Link></p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => save(true, true)}>Accept all</Button>
          <Button variant="outline" onClick={() => save(false, false)}>Reject all</Button>
        </div>
        <Button variant="link" className="mt-2 w-full" onClick={() => setSettings(true)}>Cookie settings</Button>
      </>}
    </section>}
  </>;
}