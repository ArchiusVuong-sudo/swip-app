import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Package as PackageType } from "@/types/database";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Package,
  MapPin,
  User,
  Truck,
  FileText,
  QrCode,
} from "lucide-react";
import { QRCodeDisplay } from "@/components/packages/qr-code-display";
import { ApiResponseDisplay } from "@/components/packages/api-response-display";
import { PackageDetailActions } from "@/components/packages/package-detail-actions";

const statusConfig = {
  pending: { label: "Pending", variant: "secondary" as const, icon: Clock, color: "text-gray-600" },
  screening: { label: "Screening", variant: "secondary" as const, icon: Clock, color: "text-gray-600" },
  accepted: { label: "Accepted", variant: "default" as const, icon: CheckCircle, color: "text-green-600" },
  rejected: { label: "Rejected", variant: "destructive" as const, icon: XCircle, color: "text-red-600" },
  inconclusive: { label: "Inconclusive", variant: "outline" as const, icon: AlertTriangle, color: "text-yellow-600" },
  audit_required: { label: "Audit Required", variant: "outline" as const, icon: AlertTriangle, color: "text-blue-600" },
  audit_submitted: { label: "Audit Submitted", variant: "secondary" as const, icon: Clock, color: "text-gray-600" },
  duty_pending: { label: "Duty Pending", variant: "outline" as const, icon: Clock, color: "text-orange-600" },
  duty_paid: { label: "Duty Paid", variant: "default" as const, icon: CheckCircle, color: "text-green-600" },
  registered: { label: "Registered", variant: "default" as const, icon: CheckCircle, color: "text-green-600" },
};

interface PackageDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PackageDetailPage({ params }: PackageDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const userId = user.id;

  const { data } = await supabase
    .from("packages")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!data) {
    notFound();
  }

  const pkg = data as PackageType;
  const status = statusConfig[pkg.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/packages">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">Package Details</h2>
          <p className="text-muted-foreground">
            External ID: {pkg.external_id}
          </p>
        </div>
        <Badge variant={status.variant} className="gap-1 text-sm px-3 py-1">
          <StatusIcon className="h-4 w-4" />
          {status.label}
        </Badge>
        <PackageDetailActions packageId={pkg.id} externalId={pkg.external_id} />
      </div>

      {/* Screening Result Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Screening Result
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <p className={`text-lg font-bold ${status.color}`}>
                {pkg.screening_status || status.label}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Screening Code</p>
              <p className="text-lg font-bold">
                {pkg.screening_code ? `Code ${pkg.screening_code}` : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">SafePackage ID</p>
              <p className="text-lg font-medium font-mono">
                {pkg.safepackage_id || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Screened At</p>
              <p className="text-lg font-medium">
                {pkg.screened_at
                  ? new Date(pkg.screened_at).toLocaleString()
                  : "-"}
              </p>
            </div>
          </div>

          {/* QR Code if available */}
          {pkg.label_qr_code && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <QrCode className="h-4 w-4" />
                <span className="font-medium">Label QR Code</span>
              </div>
              <div className="bg-white p-4 inline-block rounded">
                <QRCodeDisplay value={pkg.label_qr_code} size={128} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground font-mono break-all">
                {pkg.label_qr_code}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Package Identifiers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Package Identifiers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">External ID</p>
              <p className="font-mono">{pkg.external_id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">House Bill Number</p>
              <p className="font-mono">{pkg.house_bill_number}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Barcode</p>
              <p className="font-mono">{pkg.barcode}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Platform</p>
              <p className="capitalize">{pkg.platform_id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Addresses */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Shipper */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Shipper
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium">{pkg.shipper_name}</p>
            <p className="text-muted-foreground">
              {pkg.shipper_line1}
              {pkg.shipper_line2 && <><br />{pkg.shipper_line2}</>}
            </p>
            <p className="text-muted-foreground">
              {pkg.shipper_city}, {pkg.shipper_state} {pkg.shipper_postal_code}
            </p>
            <p className="text-muted-foreground">{pkg.shipper_country}</p>
            {pkg.shipper_phone && (
              <p className="text-sm text-muted-foreground">Phone: {pkg.shipper_phone}</p>
            )}
            {pkg.shipper_email && (
              <p className="text-sm text-muted-foreground">Email: {pkg.shipper_email}</p>
            )}
          </CardContent>
        </Card>

        {/* Consignee */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Consignee
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium">{pkg.consignee_name}</p>
            <p className="text-muted-foreground">
              {pkg.consignee_line1}
              {pkg.consignee_line2 && <><br />{pkg.consignee_line2}</>}
            </p>
            <p className="text-muted-foreground">
              {pkg.consignee_city}, {pkg.consignee_state} {pkg.consignee_postal_code}
            </p>
            <p className="text-muted-foreground">{pkg.consignee_country}</p>
            {pkg.consignee_phone && (
              <p className="text-sm text-muted-foreground">Phone: {pkg.consignee_phone}</p>
            )}
            {pkg.consignee_email && (
              <p className="text-sm text-muted-foreground">Email: {pkg.consignee_email}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Shipping Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Shipping Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Export Country</p>
              <p>{pkg.export_country}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Destination Country</p>
              <p>{pkg.destination_country}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Weight</p>
              <p>
                {pkg.weight_value} {pkg.weight_unit === "K" ? "kg" : "lbs"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Seller ID</p>
              <p>{pkg.seller_id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Response (for debugging) */}
      {pkg.screening_response && (
        <Card>
          <CardHeader>
            <CardTitle>API Response (Debug)</CardTitle>
            <CardDescription>Raw response from SafePackage API</CardDescription>
          </CardHeader>
          <CardContent>
            <ApiResponseDisplay response={pkg.screening_response} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
