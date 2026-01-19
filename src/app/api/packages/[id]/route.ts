import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Get a single package
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

    const { data: pkg, error } = await supabase
      .from("packages")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    return NextResponse.json({ package: pkg });
  } catch (error) {
    console.error("Error fetching package:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete a package
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

    // First check if package exists and belongs to user
    const { data: pkg, error: fetchError } = await supabase
      .from("packages")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // Delete associated package_products first
    await supabase
      .from("package_products")
      .delete()
      .eq("package_id", id);

    // Delete the package
    const { error: deleteError } = await supabase
      .from("packages")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting package:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting package:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
