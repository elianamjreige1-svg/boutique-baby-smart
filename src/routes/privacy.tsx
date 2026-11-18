import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [
    { title: "Privacy & Cookie Choices — cuddlekids.lb" },
    { name: "description", content: "How cuddlekids.lb handles order information, visit analytics, advertising cookies and privacy choices." },
    { property: "og:title", content: "Privacy & Cookie Choices — cuddlekids.lb" },
    { property: "og:description", content: "Order information, analytics and advertising privacy choices for cuddlekids.lb." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Privacy,
});

function Privacy() {
  return <article className="mx-auto max-w-3xl space-y-6 px-4 py-12">
    <h1 className="text-3xl font-semibold">Privacy policy</h1>
    <p className="text-sm text-muted-foreground">Updated November 18, 2026</p>
    <section className="space-y-2"><h2 className="text-xl font-semibold">Orders</h2><p>We use your name, phone number, delivery address and order details to process and deliver your purchase. Order information is stored in Lovable Cloud and available to store administrators. The cart uses browser storage to keep your chosen items.</p></section>
    <section className="space-y-2"><h2 className="text-xl font-semibold">Visit analytics</h2><p>Lovable provides analytics without cookies and without identifying you. Page visits, time on page, loading speed and errors are counted before a choice. Analytics permission controls click measurement. Detailed analytics are kept for 90 days and daily summaries for one year.</p></section>
    <section className="space-y-2"><h2 className="text-xl font-semibold">Advertising</h2><p>When permitted, Meta receives page visits, product views, cart visits, checkout activity and successful purchases, including product identifiers, names, prices, order value and USD currency. Meta also receives browser and network information and may set advertising cookies. This information is used for ad measurement, attribution, audience building and advertising optimization. We do not send your checkout name, phone number or delivery address to the Meta Pixel, and automatic form matching is disabled.</p></section>
    <section className="space-y-2"><h2 className="text-xl font-semibold">Your choices</h2><p>Visitors in the EU/EEA, UK, Switzerland and Canada, or whose region cannot be determined, are asked before optional tracking. Meta tracking stays off there until advertising is accepted. Elsewhere it may run unless you reject it. Analytics and advertising choices are separate.</p><p>Use Cookie settings at the bottom of any page to accept or withdraw permission without reloading. Refusal stops future Meta events, including in other open tabs. Previously blocked events are not replayed. A browser Global Privacy Control signal disables optional tracking even if you previously accepted. Withdrawal does not undo information already shared with Meta.</p><p>Choices are stored on this browser, with a dated record of the notice and choices. Acceptance expires after one year; refusal can be requested again after 183 days but remains in force until changed.</p></section>
    <section className="space-y-2"><h2 className="text-xl font-semibold">Contact</h2><p>For questions about your order information or privacy choices, contact the store using Call Us or WhatsApp on the shop page.</p></section>
  </article>;
}