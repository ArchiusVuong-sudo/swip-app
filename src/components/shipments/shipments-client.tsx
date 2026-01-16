"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Plus,
  FileCheck,
  Download,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { CreateShipmentDialog } from "./create-shipment-dialog";
import { UploadShipmentCSVDialog } from "./upload-shipment-csv-dialog";

interface Shipment {
  id: string;
  external_id: string;
  master_bill_prefix: string;
  master_bill_serial_number: string;
  transport_mode: string;
  port_of_origin: string;
  port_of_entry: string;
  carrier_name: string;
  status: string;
  shipping_date: string;
  verification_document_content?: string;
  created_at: string;
}

interface ShipmentsClientProps {
  shipments: Shipment[];
}

const statusConfig = {
  pending: { label: "Pending", variant: "secondary" as const, icon: Clock },
  registered: { label: "Registered", variant: "default" as const, icon: CheckCircle },
  verification_pending: { label: "Verification Pending", variant: "outline" as const, icon: Clock },
  verified: { label: "Verified", variant: "default" as const, icon: FileCheck },
  rejected: { label: "Rejected", variant: "destructive" as const, icon: XCircle },
  failed: { label: "Failed", variant: "destructive" as const, icon: AlertTriangle },
};

export function ShipmentsClient({ shipments }: ShipmentsClientProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  const handleSuccess = () => {
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Shipments</h2>
          <p className="text-muted-foreground">
            Register and manage your shipment consolidations.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsUploadDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload CSV
          </Button>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Shipment
          </Button>
        </div>
      </div>

      {/* Shipments Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Shipments</CardTitle>
          <CardDescription>
            {shipments.length} shipment{shipments.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shipments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Truck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No shipments yet</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Create a shipment after your packages have been screened and accepted.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Shipment
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>External ID</TableHead>
                  <TableHead>Master Bill</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Shipping Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipments.map((shipment) => {
                  const status = statusConfig[shipment.status as keyof typeof statusConfig] || statusConfig.pending;
                  const StatusIcon = status.icon;
                  const hasDocument = !!shipment.verification_document_content;

                  return (
                    <TableRow key={shipment.id}>
                      <TableCell className="font-medium">
                        {shipment.external_id}
                      </TableCell>
                      <TableCell>
                        {shipment.master_bill_prefix}-{shipment.master_bill_serial_number}
                      </TableCell>
                      <TableCell>{shipment.transport_mode}</TableCell>
                      <TableCell>
                        {shipment.port_of_origin} → {shipment.port_of_entry}
                      </TableCell>
                      <TableCell>{shipment.carrier_name}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(shipment.shipping_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {hasDocument && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={`/api/shipments/${shipment.id}/document`} download>
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/shipments/${shipment.id}`}>View</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Shipment Dialog */}
      <CreateShipmentDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={handleSuccess}
      />

      {/* Upload Shipment CSV Dialog */}
      <UploadShipmentCSVDialog
        isOpen={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
