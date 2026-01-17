import { createClient } from "@/lib/supabase/server";
import { ShipmentsClient } from "@/components/shipments/shipments-client";

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const resolvedParams = await searchParams;
  const page = Math.max(1, parseInt((resolvedParams.page as string) || "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt((resolvedParams.pageSize as string) || "10", 10)));

  let shipments: any[] = [];
  let pagination = {
    page,
    pageSize,
    totalCount: 0,
    totalPages: 0,
    hasMore: false,
  };

  if (user) {
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Get total count
      const { count } = await supabase
        .from("shipments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      // Get paginated data
      const { data } = await supabase
        .from("shipments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(from, to);

      shipments = data || [];

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      pagination = {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasMore: page < totalPages,
      };
    } catch (error) {
      // Table may not exist yet
    }
  }

  return <ShipmentsClient initialShipments={shipments} initialPagination={pagination} />;
}
