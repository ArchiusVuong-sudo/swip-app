import { createClient } from "@/lib/supabase/server";
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
import { Package, CheckCircle, XCircle, Clock, AlertTriangle, FileSpreadsheet } from "lucide-react";
import Link from "next/link";

const statusConfig = {
  pending: { label: "Pending", variant: "secondary" as const, icon: Clock },
  screening: { label: "Screening", variant: "secondary" as const, icon: Clock },
  accepted: { label: "Accepted", variant: "default" as const, icon: CheckCircle },
  rejected: { label: "Rejected", variant: "destructive" as const, icon: XCircle },
  inconclusive: { label: "Inconclusive", variant: "outline" as const, icon: AlertTriangle },
  audit_required: { label: "Audit Required", variant: "outline" as const, icon: AlertTriangle },
  audit_submitted: { label: "Audit Submitted", variant: "secondary" as const, icon: Clock },
  duty_pending: { label: "Duty Pending", variant: "outline" as const, icon: Clock },
  duty_paid: { label: "Duty Paid", variant: "default" as const, icon: CheckCircle },
  registered: { label: "Registered", variant: "default" as const, icon: CheckCircle },
};

export default async function PackagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let packages: any[] = [];

  if (user) {
    try {
      const { data } = await supabase
        .from("packages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      packages = data || [];
    } catch (error) {
      // Table may not exist yet
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Packages</h2>
          <p className="text-muted-foreground">
            View and manage your package screening results.
          </p>
        </div>
        <div className="flex gap-2">
          {packages.length > 0 && (
            <>
              <Button variant="outline" asChild>
                <a href="/api/exports/shipment-register">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Download CSV
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/api/exports/commercial-invoice">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Commercial Invoice
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/api/exports/packing-list">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Packing List
                </a>
              </Button>
            </>
          )}
          <Button asChild>
            <Link href="/uploads">Upload CSV</Link>
          </Button>
        </div>
      </div>

      {/* Packages Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Packages</CardTitle>
          <CardDescription>
            {packages.length} package{packages.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {packages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No packages yet</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Upload a CSV file to start screening packages.
              </p>
              <Button asChild>
                <Link href="/uploads">Upload CSV</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>External ID</TableHead>
                  <TableHead>House Bill</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Consignee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg) => {
                  const status = statusConfig[pkg.status as keyof typeof statusConfig] || statusConfig.pending;
                  const StatusIcon = status.icon;
                  return (
                    <TableRow key={pkg.id}>
                      <TableCell className="font-medium">
                        {pkg.external_id}
                      </TableCell>
                      <TableCell>{pkg.house_bill_number}</TableCell>
                      <TableCell className="capitalize">{pkg.platform_id}</TableCell>
                      <TableCell>{pkg.consignee_name}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(pkg.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/packages/${pkg.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
