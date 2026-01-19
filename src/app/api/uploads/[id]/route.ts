import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Get a single upload with details
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

    const { data: upload, error } = await supabase
      .from("uploads")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !upload) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 });
    }

    return NextResponse.json({ upload });
  } catch (error) {
    console.error("Error fetching upload:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete an upload with cascade (deletes packages and related data)
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

    // First check if upload exists and belongs to user
    const { data: upload, error: fetchError } = await supabase
      .from("uploads")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !upload) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 });
    }

    // Get all packages associated with this upload
    const { data: packages } = await supabase
      .from("packages")
      .select("id")
      .eq("upload_id", id);

    // Delete package_products for all packages
    if (packages && packages.length > 0) {
      const packageIds = packages.map(p => p.id);
      await supabase
        .from("package_products")
        .delete()
        .in("package_id", packageIds);
    }

    // Delete all packages associated with this upload
    await supabase
      .from("packages")
      .delete()
      .eq("upload_id", id);

    // Delete upload_rows
    await supabase
      .from("upload_rows")
      .delete()
      .eq("upload_id", id);

    // Delete products associated with this upload
    await supabase
      .from("products")
      .delete()
      .eq("upload_id", id);

    // Finally delete the upload
    const { error: deleteError } = await supabase
      .from("uploads")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting upload:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting upload:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
