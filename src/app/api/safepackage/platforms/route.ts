import { NextRequest, NextResponse } from "next/server";
import { getSafePackageClient, type Environment } from "@/lib/safepackage/client";

export async function GET(request: NextRequest) {
  try {
    // Get environment and optional user API key from query params
    const searchParams = request.nextUrl.searchParams;
    const environment = (searchParams.get("environment") as Environment) || "sandbox";
    const userApiKey = searchParams.get("apiKey") || undefined;

    const client = getSafePackageClient(environment, userApiKey);
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
