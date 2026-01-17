import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - List all uploads for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: uploads, error } = await supabase
      .from("uploads")
      .select("id, file_name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching uploads:", error);
      return NextResponse.json({ error: "Failed to fetch uploads" }, { status: 500 });
    }

    return NextResponse.json({
      uploads: uploads || [],
    });
  } catch (error) {
    console.error("Error in uploads API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
