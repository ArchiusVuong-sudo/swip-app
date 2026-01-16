import { createClient } from "@/lib/supabase/server";
import { ShipmentsClient } from "@/components/shipments/shipments-client";

export default async function ShipmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let shipments: any[] = [];

  if (user) {
    try {
      const { data } = await supabase
        .from("shipments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      shipments = data || [];
    } catch (error) {
      // Table may not exist yet
    }
  }

  return <ShipmentsClient shipments={shipments} />;
}
