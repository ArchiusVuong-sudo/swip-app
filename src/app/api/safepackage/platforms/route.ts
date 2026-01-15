import { NextResponse } from "next/server";
import { getSafePackageClient } from "@/lib/safepackage/client";

export async function GET() {
  try {
    const client = getSafePackageClient();
    const result = await client.getPlatforms();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || "Failed to fetch platforms" },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Error fetching platforms:", error);
    return NextResponse.json(
      { error: "Failed to connect to SafePackage API" },
      { status: 500 }
    );
  }
}
