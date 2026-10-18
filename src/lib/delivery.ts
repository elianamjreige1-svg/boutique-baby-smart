import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDeliveryFee() {
  return useQuery({
    queryKey: ["delivery-fee"],
    queryFn: async () => {
      const { data } = await supabase.from("store_settings").select("delivery_fee").eq("id", 1).maybeSingle();
      return Number(data?.delivery_fee ?? 0);
    },
  });
}
