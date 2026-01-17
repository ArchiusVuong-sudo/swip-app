"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, CheckCircle, XCircle, Clock, AlertTriangle, FileSpreadsheet, ChevronLeft, ChevronRight } from "lucide-react";
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

const ITEMS_PER_PAGE = 20;

export default function PackagesPage() {
  const searchParams = useSearchParams();
  const uploadIdFromUrl = searchParams.get("upload_id");
  const [packages, setPackages] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<any[]>([]);
  const [selectedUploadId, setSelectedUploadId] = useState<string>(uploadIdFromUrl || "");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    fetchUploads();
    if (uploadIdFromUrl) {
      setSelectedUploadId(uploadIdFromUrl);
    }
    setInitialized(true);
  }, [uploadIdFromUrl]);

  useEffect(() => {
    if (initialized) {
      setCurrentPage(1);
      fetchPackages(selectedUploadId);
    }
  }, [selectedUploadId, initialized]);

  useEffect(() => {
    if (initialized) {
      fetchPackages(selectedUploadId);
    }
  }, [currentPage]);

  async function fetchUploads() {
    try {
      const response = await fetch("/api/uploads");
      const data = await response.json();
      setUploads(data.uploads || []);
    } catch (error) {
      console.error("Error fetching uploads:", error);
    }
  }

  async function fetchPackages(uploadId: string) {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      const params = new URLSearchParams({
        limit: ITEMS_PER_PAGE.toString(),
        offset: offset.toString(),
      });
      
      if (uploadId && uploadId !== "all") {
        params.append("upload_id", uploadId);
      }

      const response = await fetch(`/api/packages?${params}`);
      const data = await response.json();
      setPackages(data.packages || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Error fetching packages:", error);
    } finally {
      setLoading(false);
    }
  }

  // Group packages by upload_id
  const groupedPackages = packages.reduce((acc: Record<string, any[]>, pkg) => {
    const uploadId = pkg.upload_id || "no-upload";
    if (!acc[uploadId]) {
      acc[uploadId] = [];
    }
    acc[uploadId].push(pkg);
    return acc;
  }, {});

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

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
          <Button asChild>
            <Link href="/uploads">Upload CSV</Link>
          </Button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Filter by Upload:</label>
        <Select value={selectedUploadId} onValueChange={setSelectedUploadId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="All uploads" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All uploads</SelectItem>
            {uploads.map((upload) => {
              const uploadDate = new Date(upload.created_at).toLocaleString();
              return (
                <SelectItem key={upload.id} value={upload.id}>
                  {upload.file_name} • {uploadDate}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Packages Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Packages</CardTitle>
          <CardDescription>
            {total} package{total !== 1 ? "s" : ""} found
            {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading packages...</p>
            </div>
          ) : packages.length === 0 ? (
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
            <div className="space-y-6">
              {Object.entries(groupedPackages).map(([uploadId, groupPkgs]) => (
                <div key={uploadId} className="space-y-2">
                  <div className="bg-muted px-4 py-2 rounded-md flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      Upload ID: <span className="font-mono text-xs">{uploadId === "no-upload" ? "-" : uploadId}</span>
                    </p>
                    {uploadId !== "no-upload" && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/api/exports/shipment-register?upload_id=${uploadId}`}>
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            Download CSV
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/api/exports/commercial-invoice?upload_id=${uploadId}`}>
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            Commercial Invoice
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/api/exports/packing-list?upload_id=${uploadId}`}>
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            Packing List
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
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
                      {groupPkgs.map((pkg) => {
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
                              {new Date(pkg.created_at).toLocaleString()}
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
                </div>
              ))}

              {/* Pagination Controls */}
              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                  {Math.min(currentPage * ITEMS_PER_PAGE, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const page = i + 1;
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          className="w-10 p-0"
                          onClick={() => setCurrentPage(page)}
                          disabled={loading}
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || loading}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
