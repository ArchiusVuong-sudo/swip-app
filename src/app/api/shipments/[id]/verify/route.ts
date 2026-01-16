import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafePackageClient } from "@/lib/safepackage/client";

// POST - Verify a shipment and get CBP document
export async function POST(
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

    // Fetch the shipment
    const { data: shipment, error: fetchError } = await supabase
      .from("shipments")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    const shipmentData = shipment as { safepackage_shipment_id: string | null; status: string };

    if (!shipmentData.safepackage_shipment_id) {
      return NextResponse.json(
        { error: "Shipment has not been registered with SafePackage yet" },
        { status: 400 }
      );
    }

    if (shipmentData.status === "verified") {
      return NextResponse.json(
        {
          success: true,
          message: "Shipment already verified",
          shipment,
        }
      );
    }

    // Update status to verification_pending
    await (supabase.from("shipments") as ReturnType<typeof supabase.from>)
      .update({ status: "verification_pending" } as Record<string, unknown>)
      .eq("id", id);

    // Call SafePackage verification API
    const client = getSafePackageClient();
    const result = await client.verifyShipment({
      shipmentId: shipmentData.safepackage_shipment_id,
    });

    // Log API call
    await (supabase.from("api_logs") as ReturnType<typeof supabase.from>).insert({
      user_id: user.id,
      endpoint: "/v1/shipment/verify",
      method: "POST",
      request_body: { shipmentId: shipmentData.safepackage_shipment_id },
      status_code: result.success ? 200 : 500,
      response_body: result.success ? result.data : result.error,
      shipment_id: id,
    } as Record<string, unknown>);

    if (!result.success) {
      await (supabase.from("shipments") as ReturnType<typeof supabase.from>)
        .update({ status: "failed" } as Record<string, unknown>)
        .eq("id", id);

      return NextResponse.json(
        { error: result.error?.message || "Verification failed" },
        { status: 500 }
      );
    }

    const verificationData = result.data!;

    // Update shipment with verification result
    const updateData: Record<string, unknown> = {
      verification_code: verificationData.code,
      verification_status: verificationData.status,
      verified_at: new Date().toISOString(),
    };

    if (verificationData.code === 1) {
      // Accepted - store document
      updateData.status = "verified";
      if (verificationData.document) {
        updateData.verification_document_type = verificationData.document.type;
        updateData.verification_document_content = verificationData.document.content;
      }
    } else {
      // Rejected
      updateData.status = "rejected";
      if (verificationData.reason) {
        updateData.verification_reason_code = verificationData.reason.code;
        updateData.verification_reason_description = verificationData.reason.description;
      }
    }

    const { data: updatedShipment, error: updateError } = await (supabase
      .from("shipments") as ReturnType<typeof supabase.from>)
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      shipment: updatedShipment,
      verification: {
        code: verificationData.code,
        status: verificationData.status,
        reason: verificationData.reason,
        hasDocument: !!verificationData.document,
      },
    });
  } catch (error) {
    console.error("Error verifying shipment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
