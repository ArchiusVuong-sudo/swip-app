import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Download CBP verification document
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

    const { data: shipment, error } = await supabase
      .from("shipments")
      .select("verification_document_type, verification_document_content, external_id, status")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    type ShipmentDoc = {
      verification_document_type: string | null;
      verification_document_content: string | null;
      external_id: string;
      status: string;
    };
    const shipmentData = shipment as ShipmentDoc;

    if (shipmentData.status !== "verified" || !shipmentData.verification_document_content) {
      return NextResponse.json(
        { error: "No CBP document available for this shipment" },
        { status: 404 }
      );
    }

    // Decode base64 content
    const buffer = Buffer.from(shipmentData.verification_document_content, "base64");

    // Determine content type
    let contentType = "application/octet-stream";
    let extension = "bin";
    switch (shipmentData.verification_document_type) {
      case "PNG":
        contentType = "image/png";
        extension = "png";
        break;
      case "JPEG":
        contentType = "image/jpeg";
        extension = "jpg";
        break;
      case "WEBM":
        contentType = "video/webm";
        extension = "webm";
        break;
    }

    const filename = `cbp-document-${shipmentData.external_id}.${extension}`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error downloading document:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
