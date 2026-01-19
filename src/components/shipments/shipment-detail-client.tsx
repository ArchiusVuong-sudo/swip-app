"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Truck,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowLeft,
  FileCheck,
  Download,
  Loader2,
  MapPin,
  Calendar,
  Plane,
  Ship,
  Building2,
  User,
  Mail,
  Phone,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

interface PackageItem {
  id: string;
  external_id: string;
  house_bill_number: string;
  barcode: string;
  consignee_name: string;
  status: string;
  screening_status: string;
  label_qr_code?: string;
}

interface Shipment {
  id: string;
  external_id: string;
  safepackage_shipment_id?: string;
  master_bill_prefix: string;
  master_bill_serial_number: string;
  originator_code?: string;
  entry_type?: string;
  shipper_name: string;
  shipper_line1: string;
  shipper_line2?: string;
  shipper_city: string;
  shipper_state: string;
  shipper_postal_code: string;
  shipper_country: string;
  shipper_phone?: string;
  shipper_email?: string;
  consignee_name: string;
  consignee_line1: string;
  consignee_line2?: string;
  consignee_city: string;
  consignee_state: string;
  consignee_postal_code: string;
  consignee_country: string;
  consignee_phone?: string;
  consignee_email?: string;
  transport_mode: string;
  port_of_origin: string;
  port_of_entry: string;
  port_of_arrival?: string;
  carrier_name: string;
  carrier_code: string;
  line_number: string;
  firms_code?: string;
  shipping_date: string;
  scheduled_arrival_date: string;
  terminal_operator?: string;
  status: string;
  verification_code?: number;
  verification_status?: string;
  verification_reason_code?: string;
  verification_reason_description?: string;
  verification_document_type?: string;
  verification_document_content?: string;
  registered_at?: string;
  verified_at?: string;
  created_at: string;
  packages?: PackageItem[];
}

interface ShipmentDetailClientProps {
  shipment: Shipment;
}

const statusConfig = {
  pending: { label: "Pending", variant: "secondary" as const, icon: Clock, color: "text-gray-500" },
  registered: { label: "Registered", variant: "default" as const, icon: CheckCircle, color: "text-blue-500" },
  verification_pending: { label: "Verification Pending", variant: "outline" as const, icon: Clock, color: "text-yellow-500" },
  verified: { label: "Verified", variant: "default" as const, icon: FileCheck, color: "text-green-500" },
  rejected: { label: "Rejected", variant: "destructive" as const, icon: XCircle, color: "text-red-500" },
  failed: { label: "Failed", variant: "destructive" as const, icon: AlertTriangle, color: "text-red-500" },
};

const entryTypeLabels: Record<string, string> = {
  "01": "Consumption Entry",
  "11": "Informal Entry",
  "86": "Section 321",
  "P": "Preliminary Entry",
};

export function ShipmentDetailClient({ shipment }: ShipmentDetailClientProps) {
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(false);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);

  const status = statusConfig[shipment.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = status.icon;
  const packages = shipment.packages || [];
  const canVerify = shipment.status === "registered" && shipment.safepackage_shipment_id;
  const hasDocument = !!shipment.verification_document_content;

  const handleVerify = async () => {
    setShowVerifyDialog(false);
    setIsVerifying(true);

    try {
      const response = await fetch(`/api/shipments/${shipment.id}/verify`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to verify shipment");
      }

      const result = await response.json();

      if (result.status === "Accepted") {
        toast.success("Shipment verified successfully! CBP document is now available.");
      } else {
        toast.error(`Verification failed: ${result.reason?.description || "Unknown reason"}`);
      }

      router.refresh();
    } catch (error) {
      console.error("Error verifying shipment:", error);
      toast.error(error instanceof Error ? error.message : "Failed to verify shipment");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDeleteShipment = async () => {
    try {
      const response = await fetch(`/api/shipments/${shipment.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete shipment");
      }

      toast.success("Shipment deleted successfully");
      router.push("/shipments");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete shipment");
      throw error;
    }
  };

  const formatAddress = (
    line1: string,
    line2: string | undefined,
    city: string,
    state: string,
    postalCode: string,
    country: string
  ) => {
    const lines = [line1];
    if (line2) lines.push(line2);
    lines.push(`${city}, ${state} ${postalCode}`);
    lines.push(country);
    return lines;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/shipments">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <Truck className="h-6 w-6" />
              {shipment.external_id}
            </h2>
            <p className="text-muted-foreground">
              Master Bill: {shipment.master_bill_prefix}-{shipment.master_bill_serial_number}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={status.variant} className="gap-1 px-3 py-1">
            <StatusIcon className="h-4 w-4" />
            {status.label}
          </Badge>
          {canVerify && (
            <Button onClick={() => setShowVerifyDialog(true)} disabled={isVerifying}>
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <FileCheck className="mr-2 h-4 w-4" />
                  Verify Shipment
                </>
              )}
            </Button>
          )}
          {hasDocument && (
            <Button variant="outline" asChild>
              <a href={`/api/shipments/${shipment.id}/document`} download>
                <Download className="mr-2 h-4 w-4" />
                Download CBP Document
              </a>
            </Button>
          )}
          {shipment.status === "pending" && (
            <DeleteConfirmDialog
              title="Delete Shipment"
              description={`Are you sure you want to delete shipment "${shipment.external_id}"? This action cannot be undone.`}
              onConfirm={handleDeleteShipment}
              variant="button"
            />
          )}
        </div>
      </div>

      {/* Verification Status Alert */}
      {shipment.status === "verified" && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-green-800">Shipment Verified</p>
              <p className="text-sm text-green-600">
                CBP verification completed on{" "}
                {shipment.verified_at
                  ? new Date(shipment.verified_at).toLocaleString()
                  : "N/A"}
                . The CBP document is available for download.
              </p>
            </div>
          </div>
        </div>
      )}

      {shipment.status === "rejected" && shipment.verification_reason_description && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Verification Rejected</p>
              <p className="text-sm text-red-600">
                Reason: {shipment.verification_reason_description}
                {shipment.verification_reason_code && ` (${shipment.verification_reason_code})`}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shipment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Shipment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">External ID</p>
                <p className="font-medium">{shipment.external_id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">SafePackage ID</p>
                <p className="font-medium">{shipment.safepackage_shipment_id || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Entry Type</p>
                <p className="font-medium">
                  {shipment.entry_type
                    ? entryTypeLabels[shipment.entry_type] || shipment.entry_type
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Originator Code</p>
                <p className="font-medium">{shipment.originator_code || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Registered</p>
                <p className="font-medium">
                  {shipment.registered_at
                    ? new Date(shipment.registered_at).toLocaleString()
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Verified</p>
                <p className="font-medium">
                  {shipment.verified_at
                    ? new Date(shipment.verified_at).toLocaleString()
                    : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transportation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {shipment.transport_mode === "AIR" ? (
                <Plane className="h-4 w-4" />
              ) : (
                <Ship className="h-4 w-4" />
              )}
              Transportation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Mode</p>
                <p className="font-medium">{shipment.transport_mode}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Carrier</p>
                <p className="font-medium">
                  {shipment.carrier_name} ({shipment.carrier_code})
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Line/Flight Number</p>
                <p className="font-medium">{shipment.line_number}</p>
              </div>
              <div>
                <p className="text-muted-foreground">FIRMS Code</p>
                <p className="font-medium">{shipment.firms_code || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 py-3 px-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <MapPin className="h-4 w-4 mx-auto text-muted-foreground" />
                <p className="text-xs text-muted-foreground mt-1">Origin</p>
                <p className="font-bold">{shipment.port_of_origin}</p>
              </div>
              <div className="flex-1 border-t-2 border-dashed border-muted-foreground/30" />
              <div className="text-center">
                <MapPin className="h-4 w-4 mx-auto text-muted-foreground" />
                <p className="text-xs text-muted-foreground mt-1">Entry</p>
                <p className="font-bold">{shipment.port_of_entry}</p>
              </div>
              {shipment.port_of_arrival && shipment.port_of_arrival !== shipment.port_of_entry && (
                <>
                  <div className="flex-1 border-t-2 border-dashed border-muted-foreground/30" />
                  <div className="text-center">
                    <MapPin className="h-4 w-4 mx-auto text-muted-foreground" />
                    <p className="text-xs text-muted-foreground mt-1">Arrival</p>
                    <p className="font-bold">{shipment.port_of_arrival}</p>
                  </div>
                </>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Shipping Date</p>
                  <p className="font-medium">
                    {new Date(shipment.shipping_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Arrival Date</p>
                  <p className="font-medium">
                    {new Date(shipment.scheduled_arrival_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shipper */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Shipper
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 mt-1 text-muted-foreground" />
              <p className="font-medium">{shipment.shipper_name}</p>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
              <div className="text-sm">
                {formatAddress(
                  shipment.shipper_line1,
                  shipment.shipper_line2,
                  shipment.shipper_city,
                  shipment.shipper_state,
                  shipment.shipper_postal_code,
                  shipment.shipper_country
                ).map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
            {shipment.shipper_phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <p>{shipment.shipper_phone}</p>
              </div>
            )}
            {shipment.shipper_email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p>{shipment.shipper_email}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Consignee */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Consignee
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 mt-1 text-muted-foreground" />
              <p className="font-medium">{shipment.consignee_name}</p>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
              <div className="text-sm">
                {formatAddress(
                  shipment.consignee_line1,
                  shipment.consignee_line2,
                  shipment.consignee_city,
                  shipment.consignee_state,
                  shipment.consignee_postal_code,
                  shipment.consignee_country
                ).map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
            {shipment.consignee_phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <p>{shipment.consignee_phone}</p>
              </div>
            )}
            {shipment.consignee_email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p>{shipment.consignee_email}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Packages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Packages ({packages.length})
          </CardTitle>
          <CardDescription>
            Packages consolidated in this shipment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {packages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No packages in this shipment
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>External ID</TableHead>
                  <TableHead>House Bill</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Consignee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium">{pkg.external_id}</TableCell>
                    <TableCell>{pkg.house_bill_number}</TableCell>
                    <TableCell className="font-mono text-sm">{pkg.barcode}</TableCell>
                    <TableCell>{pkg.consignee_name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={pkg.status === "accepted" ? "default" : "secondary"}
                        className="gap-1"
                      >
                        {pkg.status === "accepted" ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        {pkg.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/packages/${pkg.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Verify Confirmation Dialog */}
      <AlertDialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-blue-600" />
              Verify Shipment with CBP
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3">
                <p>
                  This will submit the shipment to SafePackage API for CBP
                  verification. Upon successful verification, you will receive a
                  CBP compliance document.
                </p>
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipment ID:</span>
                    <span className="font-medium">{shipment.external_id}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Master Bill:</span>
                    <span className="font-medium">
                      {shipment.master_bill_prefix}-{shipment.master_bill_serial_number}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Packages:</span>
                    <span className="font-medium">{packages.length}</span>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleVerify}>
              Verify Shipment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
