import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/platforms - List all platforms for the user
export async function GET() {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's platforms
    const { data: userPlatforms, error } = await supabase
      .from("user_platforms" as never)
      .select("*")
      .eq("user_id", user.id)
      .order("platform_id", { ascending: true });

    if (error) {
      console.error("Error fetching platforms:", error);
      return NextResponse.json({ error: "Failed to fetch platforms" }, { status: 500 });
    }

    return NextResponse.json({ platforms: userPlatforms || [] });
  } catch (error) {
    console.error("Error in platforms GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/platforms - Create or update a platform
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { platform_id, platform_url, seller_id, is_enabled, notes } = body;

    if (!platform_id) {
      return NextResponse.json({ error: "Platform ID is required" }, { status: 400 });
    }

    // Check if platform exists for this user
    const { data: existing } = await supabase
      .from("user_platforms" as never)
      .select("id")
      .eq("user_id", user.id)
      .eq("platform_id", platform_id)
      .single();

    const existingRecord = existing as { id: string } | null;
    if (existingRecord) {
      // Update existing
      const { data: updated, error } = await supabase
        .from("user_platforms" as never)
        .update({
          platform_url,
          seller_id,
          is_enabled: is_enabled ?? true,
          notes,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", existingRecord.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating platform:", error);
        return NextResponse.json({ error: "Failed to update platform" }, { status: 500 });
      }

      return NextResponse.json({ platform: updated });
    } else {
      // Create new
      const { data: created, error } = await supabase
        .from("user_platforms" as never)
        .insert({
          user_id: user.id,
          platform_id,
          platform_url,
          seller_id,
          is_enabled: is_enabled ?? true,
          notes,
        } as never)
        .select()
        .single();

      if (error) {
        console.error("Error creating platform:", error);
        return NextResponse.json({ error: "Failed to create platform" }, { status: 500 });
      }

      return NextResponse.json({ platform: created }, { status: 201 });
    }
  } catch (error) {
    console.error("Error in platforms POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
