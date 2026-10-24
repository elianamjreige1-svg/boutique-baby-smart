import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.array(z.string().min(1).max(250));

// Deletes photo files from private storage using server admin permissions
export const deleteProductPhotos = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data: photoPaths }) => {
    if (!photoPaths.length) return { success: true };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage.from("product-images").remove(photoPaths);
    if (error) {
      console.error("Failed to delete photos from storage:", error);
      throw new Error("Could not delete photos from storage");
    }
    return { success: true };
  });
