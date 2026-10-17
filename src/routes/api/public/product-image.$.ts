import { createFileRoute } from "@tanstack/react-router";

// Serves product photos from the private storage folder (public buckets are blocked in this workspace).
export const Route = createFileRoute("/api/public/product-image/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = params._splat ?? "";
        if (!/^[\w-]+\.(webp|png|jpg|jpeg)$/i.test(path)) return new Response("Not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("product-images").download(path);
        if (error || !data) return new Response("Not found", { status: 404 });
        return new Response(data, {
          headers: { "content-type": data.type || "image/jpeg", "cache-control": "public, max-age=31536000, immutable" },
        });
      },
    },
  },
});
