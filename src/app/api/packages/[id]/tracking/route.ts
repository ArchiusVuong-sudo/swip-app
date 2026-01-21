import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafePackageClient, type Environment } from "@/lib/safepackage/client";

// GET /api/packages/[id]/tracking - Get tracking events for a package
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: packageId } = await params;
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

    // Get the package
    const { data: pkgData, error: pkgError } = await supabase
      .from("packages")
      .select("id, safepackage_id, external_id, user_id")
      .eq("id", packageId)
      .eq("user_id", user.id)
      .single();

    if (pkgError || !pkgData) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const pkg = pkgData as { id: string; safepackage_id: string | null; external_id: string; user_id: string };

    if (!pkg.safepackage_id) {
      return NextResponse.json({
        error: "Package has no SafePackage ID - tracking not available",
      }, { status: 400 });
    }

    // Get existing tracking events from database
    const { data: existingEvents } = await supabase
      .from("tracking_events")
      .select("*")
      .eq("package_id", packageId)
      .order("event_time", { ascending: false });

    // Fetch fresh tracking from SafePackage API
    const environment = envFromQuery || "sandbox";
    const client = getSafePackageClient(environment);
    const trackingResponse = await client.getPackageTracking(pkg.safepackage_id);

    if (trackingResponse.success && trackingResponse.data) {
      const newEvents = trackingResponse.data.events;

      // Upsert new events
      for (const event of newEvents) {
        await supabase.from("tracking_events" as never).upsert(
          {
            user_id: user.id,
            package_id: packageId,
            entity_type: "package",
            safepackage_package_id: pkg.safepackage_id,
            event_type: event.type,
            event_description: event.description,
            event_time: event.time,
            event_data: event.data || null,
            environment: environment,
            fetched_at: new Date().toISOString(),
          } as never,
          {
            onConflict: "entity_type,package_id,event_type,event_time",
            ignoreDuplicates: true,
          }
        );
      }

      // Return fresh events
      const { data: updatedEvents } = await supabase
        .from("tracking_events")
        .select("*")
        .eq("package_id", packageId)
        .order("event_time", { ascending: false });

      return NextResponse.json({
        success: true,
        packageId: pkg.safepackage_id,
        events: updatedEvents || [],
        source: "api",
      });
    } else {
      // Return cached events if API fails
      return NextResponse.json({
        success: true,
        packageId: pkg.safepackage_id,
        events: existingEvents || [],
        source: "cache",
        apiError: trackingResponse.error?.message,
      });
    }
  } catch (error) {
    console.error("Error fetching package tracking:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
