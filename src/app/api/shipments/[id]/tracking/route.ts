import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafePackageClient, type Environment } from "@/lib/safepackage/client";

// GET /api/shipments/[id]/tracking - Get tracking events for a shipment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shipmentId } = await params;
    const { searchParams } = new URL(request.url);
    const envFromQuery = searchParams.get("environment") as Environment | null;
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the shipment
    const { data: shipmentData, error: shipmentError } = await supabase
      .from("shipments")
      .select("id, safepackage_shipment_id, external_id, user_id")
      .eq("id", shipmentId)
      .eq("user_id", user.id)
      .single();

    if (shipmentError || !shipmentData) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    const shipment = shipmentData as { id: string; safepackage_shipment_id: string | null; external_id: string; user_id: string };

    if (!shipment.safepackage_shipment_id) {
      return NextResponse.json({
        error: "Shipment has no SafePackage ID - tracking not available",
      }, { status: 400 });
    }

    // Get existing tracking events from database
    const { data: existingEvents } = await supabase
      .from("tracking_events")
      .select("*")
      .eq("shipment_id", shipmentId)
      .order("event_time", { ascending: false });

    // Fetch fresh tracking from SafePackage API
    const environment = envFromQuery || "sandbox";
    const client = getSafePackageClient(environment);
    const trackingResponse = await client.getShipmentTracking(shipment.safepackage_shipment_id);

    if (trackingResponse.success && trackingResponse.data) {
      const newEvents = trackingResponse.data.events;

      // Upsert new events
      for (const event of newEvents) {
        await supabase.from("tracking_events" as never).upsert(
          {
            user_id: user.id,
            shipment_id: shipmentId,
            entity_type: "shipment",
            safepackage_shipment_id: shipment.safepackage_shipment_id,
            event_type: event.type,
            event_description: event.description,
            event_time: event.time,
            event_data: event.data || null,
            environment: environment,
            fetched_at: new Date().toISOString(),
          } as never,
          {
            onConflict: "entity_type,shipment_id,event_type,event_time",
            ignoreDuplicates: true,
          }
        );
      }

      // Return fresh events
      const { data: updatedEvents } = await supabase
        .from("tracking_events")
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("event_time", { ascending: false });

      return NextResponse.json({
        success: true,
        shipmentId: shipment.safepackage_shipment_id,
        events: updatedEvents || [],
        source: "api",
      });
    } else {
      // Return cached events if API fails
      return NextResponse.json({
        success: true,
        shipmentId: shipment.safepackage_shipment_id,
        events: existingEvents || [],
        source: "cache",
        apiError: trackingResponse.error?.message,
      });
    }
  } catch (error) {
    console.error("Error fetching shipment tracking:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
