import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/failures - List API failures for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // pending, retrying, exhausted, manual_required, success
    const environment = searchParams.get("environment"); // sandbox, production
    const uploadId = searchParams.get("upload_id");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Build query
    let query = supabase
      .from("api_failures")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("retry_status", status);
    }
    if (environment) {
      query = query.eq("environment", environment);
    }
    if (uploadId) {
      query = query.eq("upload_id", uploadId);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching failures:", error);
      return NextResponse.json({ error: "Failed to fetch failures" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error in failures route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
