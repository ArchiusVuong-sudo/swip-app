import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Get a single shipment with packages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: shipment, error } = await supabase
      .from("shipments")
      .select(`
        *,
        packages:packages(
          id,
          external_id,
          house_bill_number,
          barcode,
          status,
          consignee_name,
          consignee_city,
          consignee_state
        )
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    return NextResponse.json({ shipment });
  } catch (error) {
    console.error("Error fetching shipment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete a shipment (only if pending)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First check if shipment exists and is pending
    const { data: shipment, error: fetchError } = await supabase
      .from("shipments")
      .select("status")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    if ((shipment as { status: string }).status !== "pending") {
      return NextResponse.json(
        { error: "Only pending shipments can be deleted" },
        { status: 400 }
      );
    }

    // Unlink packages
    await (supabase.from("packages") as ReturnType<typeof supabase.from>)
      .update({ shipment_id: null } as Record<string, unknown>)
      .eq("shipment_id", id);

    // Delete shipment
    const { error: deleteError } = await supabase
      .from("shipments")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting shipment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
