import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PATCH /api/platforms/[id] - Update a platform (toggle enabled, update details)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { is_enabled, platform_url, seller_id, notes } = body;

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (typeof is_enabled === "boolean") updateData.is_enabled = is_enabled;
    if (platform_url !== undefined) updateData.platform_url = platform_url;
    if (seller_id !== undefined) updateData.seller_id = seller_id;
    if (notes !== undefined) updateData.notes = notes;

    const { data: updated, error } = await supabase
      .from("user_platforms" as never)
      .update(updateData as never)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating platform:", error);
      return NextResponse.json({ error: "Failed to update platform" }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: "Platform not found" }, { status: 404 });
    }

    return NextResponse.json({ platform: updated });
  } catch (error) {
    console.error("Error in platforms PATCH:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/platforms/[id] - Delete a platform
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("user_platforms" as never)
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting platform:", error);
      return NextResponse.json({ error: "Failed to delete platform" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in platforms DELETE:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
