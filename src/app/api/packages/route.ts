import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - List packages with optional filtering
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const unassigned = searchParams.get("unassigned") === "true";
    const uploadId = searchParams.get("upload_id");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query
    let query = supabase
      .from("packages")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by status
    if (status) {
      query = query.eq("status", status);
    }

    // Filter for unassigned packages (not yet in a shipment)
    if (unassigned) {
      query = query.is("shipment_id", null);
    }

    // Filter by upload_id
    if (uploadId) {
      query = query.eq("upload_id", uploadId);
    }

    const { data: packages, error } = await query;

    if (error) {
      console.error("Error fetching packages:", error);
      return NextResponse.json({ error: "Failed to fetch packages" }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from("packages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (status) {
      countQuery = countQuery.eq("status", status);
    }
    if (unassigned) {
      countQuery = countQuery.is("shipment_id", null);
    }
    if (uploadId) {
      countQuery = countQuery.eq("upload_id", uploadId);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      packages: packages || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error in packages API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
