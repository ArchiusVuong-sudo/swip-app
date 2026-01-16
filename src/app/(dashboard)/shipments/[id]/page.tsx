import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ShipmentDetailClient } from "@/components/shipments/shipment-detail-client";

interface ShipmentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ShipmentDetailPage({ params }: ShipmentDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // Fetch shipment with packages
  const { data: shipment, error } = await supabase
    .from("shipments")
    .select(`
      *,
      packages (
        id,
        external_id,
        house_bill_number,
        barcode,
        consignee_name,
        status,
        screening_status,
        label_qr_code
      )
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !shipment) {
    notFound();
  }

  return <ShipmentDetailClient shipment={shipment} />;
}
