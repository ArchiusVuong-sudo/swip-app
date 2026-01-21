import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/failures/[id]/resolve - Manually resolve a failure
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: failureId } = await params;
    const body = await request.json();
    const { notes } = body as { notes?: string };

    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the failure record
    const { data: failure, error: fetchError } = await supabase
      .from("api_failures")
      .select("id, retry_status, upload_id")
      .eq("id", failureId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !failure) {
      return NextResponse.json({ error: "Failure not found" }, { status: 404 });
    }

    // Update failure to manual_required (resolved manually)
    const { error: updateError } = await supabase
      .from("api_failures" as never)
      .update({
        retry_status: "manual_required" as never,
        resolved_at: new Date().toISOString() as never,
        resolved_by: user.id as never,
        resolution_notes: (notes || "Manually resolved by user") as never,
      } as never)
      .eq("id", failureId);

    if (updateError) {
      console.error("Error resolving failure:", updateError);
      return NextResponse.json({ error: "Failed to resolve" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Failure resolved",
    });
  } catch (error) {
    console.error("Error resolving failure:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
