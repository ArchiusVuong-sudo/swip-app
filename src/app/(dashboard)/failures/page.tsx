"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertCircle,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertTriangle,
  FileWarning,
} from "lucide-react";
import { useEnvironmentStore } from "@/stores/environment-store";
import type { ApiFailure } from "@/types/database";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  retrying: "bg-blue-100 text-blue-800",
  success: "bg-green-100 text-green-800",
  exhausted: "bg-red-100 text-red-800",
  manual_required: "bg-orange-100 text-orange-800",
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  retrying: <RefreshCw className="h-4 w-4 animate-spin" />,
  success: <CheckCircle className="h-4 w-4" />,
  exhausted: <XCircle className="h-4 w-4" />,
  manual_required: <AlertCircle className="h-4 w-4" />,
};

export default function FailuresPage() {
  const { environment } = useEnvironmentStore();
  const [failures, setFailures] = useState<ApiFailure[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [batchRetrying, setBatchRetrying] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedFailures, setSelectedFailures] = useState<Set<string>>(new Set());
  const [resolveDialog, setResolveDialog] = useState<{
    open: boolean;
    failureId: string | null;
  }>({ open: false, failureId: null });
  const [resolveNotes, setResolveNotes] = useState("");

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    retrying: 0,
    exhausted: 0,
    manualRequired: 0,
    resolved: 0,
  });

  useEffect(() => {
    fetchFailures();
  }, [environment, statusFilter]);

  const fetchFailures = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("environment", environment);
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const response = await fetch(`/api/failures?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setFailures(result.data || []);
        // Calculate stats
        const newStats = {
          pending: 0,
          retrying: 0,
          exhausted: 0,
          manualRequired: 0,
          resolved: 0,
        };
        (result.data || []).forEach((f: ApiFailure) => {
          if (f.retry_status === "pending") newStats.pending++;
          else if (f.retry_status === "retrying") newStats.retrying++;
          else if (f.retry_status === "exhausted") newStats.exhausted++;
          else if (f.retry_status === "manual_required") newStats.manualRequired++;
          else if (f.retry_status === "success") newStats.resolved++;
        });
        setStats(newStats);
      }
    } catch (error) {
      console.error("Error fetching failures:", error);
      toast.error("Failed to load failures");
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (failureId: string) => {
    setRetrying(failureId);
    try {
      const response = await fetch(`/api/failures/${failureId}/retry`, {
        method: "POST",
      });
      const result = await response.json();

      if (result.success) {
        toast.success("Retry successful!");
        fetchFailures();
      } else {
        toast.error(result.error || "Retry failed");
      }
    } catch (error) {
      console.error("Error retrying:", error);
      toast.error("Failed to retry");
    } finally {
      setRetrying(null);
    }
  };

  const handleBatchRetry = async () => {
    if (selectedFailures.size === 0) {
      toast.error("No failures selected");
      return;
    }

    setBatchRetrying(true);
    try {
      const response = await fetch("/api/failures/batch-retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          failure_ids: Array.from(selectedFailures),
        }),
      });
      const result = await response.json();

      if (result.success) {
        toast.success(
          `Batch retry completed: ${result.summary.successful}/${result.summary.total} successful`
        );
        setSelectedFailures(new Set());
        fetchFailures();
      } else {
        toast.error(result.error || "Batch retry failed");
      }
    } catch (error) {
      console.error("Error in batch retry:", error);
      toast.error("Failed to perform batch retry");
    } finally {
      setBatchRetrying(false);
    }
  };

  const handleResolve = async () => {
    if (!resolveDialog.failureId) return;

    try {
      const response = await fetch(`/api/failures/${resolveDialog.failureId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: resolveNotes }),
      });

      if (response.ok) {
        toast.success("Failure marked as resolved");
        setResolveDialog({ open: false, failureId: null });
        setResolveNotes("");
        fetchFailures();
      } else {
        toast.error("Failed to resolve");
      }
    } catch (error) {
      console.error("Error resolving:", error);
      toast.error("Failed to resolve");
    }
  };

  const toggleSelectAll = () => {
    if (selectedFailures.size === failures.filter(f => f.retry_status !== "success").length) {
      setSelectedFailures(new Set());
    } else {
      setSelectedFailures(new Set(
        failures.filter(f => f.retry_status !== "success").map(f => f.id)
      ));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedFailures);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedFailures(newSelected);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileWarning className="h-6 w-6" />
          API Failures Dashboard
        </h2>
        <p className="text-muted-foreground">
          Monitor and retry failed API calls. Environment: <Badge variant="outline">{environment}</Badge>
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-blue-600" />
              Retrying
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="text-2xl font-bold">{stats.retrying}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              Manual Required
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="text-2xl font-bold">{stats.manualRequired}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Exhausted
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="text-2xl font-bold">{stats.exhausted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Resolved
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="text-2xl font-bold">{stats.resolved}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Failed API Calls</CardTitle>
              <CardDescription>
                View and manage failed API calls with retry capabilities
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="retrying">Retrying</SelectItem>
                  <SelectItem value="manual_required">Manual Required</SelectItem>
                  <SelectItem value="exhausted">Exhausted</SelectItem>
                  <SelectItem value="success">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={fetchFailures}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              {selectedFailures.size > 0 && (
                <Button
                  size="sm"
                  onClick={handleBatchRetry}
                  disabled={batchRetrying}
                >
                  {batchRetrying ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Retry Selected ({selectedFailures.size})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : failures.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">No failures found</p>
              <p className="text-sm">All API calls are successful!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={selectedFailures.size === failures.filter(f => f.retry_status !== "success").length && failures.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>External ID</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Retries</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failures.map((failure) => (
                  <>
                    <TableRow key={failure.id}>
                      <TableCell>
                        {failure.retry_status !== "success" && (
                          <Checkbox
                            checked={selectedFailures.has(failure.id)}
                            onCheckedChange={() => toggleSelect(failure.id)}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-0 h-6 w-6"
                          onClick={() => setExpandedRow(expandedRow === failure.id ? null : failure.id)}
                        >
                          {expandedRow === failure.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {failure.external_id || "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {failure.endpoint}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">
                        {failure.error_message || "-"}
                      </TableCell>
                      <TableCell>
                        {failure.retry_count}/{failure.max_retries}
                      </TableCell>
                      <TableCell>
                        <Badge className={`gap-1 ${statusColors[failure.retry_status]}`}>
                          {statusIcons[failure.retry_status]}
                          {failure.retry_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(failure.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {failure.retry_status !== "success" && failure.retry_status !== "exhausted" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetry(failure.id)}
                              disabled={retrying === failure.id}
                            >
                              {retrying === failure.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                          {failure.retry_status !== "success" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setResolveDialog({ open: true, failureId: failure.id })}
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedRow === failure.id && (
                      <TableRow>
                        <TableCell colSpan={9} className="bg-muted/50">
                          <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <Label className="text-muted-foreground">Error Code</Label>
                                <p className="font-mono">{failure.error_code || "-"}</p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">Upload ID</Label>
                                <p className="font-mono text-xs">{failure.upload_id || "-"}</p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">Package ID</Label>
                                <p className="font-mono text-xs">{failure.package_id || "-"}</p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">Next Retry</Label>
                                <p>{formatDate(failure.next_retry_at)}</p>
                              </div>
                            </div>
                            {failure.error_details && (
                              <div>
                                <Label className="text-muted-foreground">Error Details</Label>
                                <pre className="mt-1 p-2 bg-white rounded border text-xs overflow-auto max-h-40">
                                  {JSON.stringify(failure.error_details, null, 2)}
                                </pre>
                              </div>
                            )}
                            {failure.request_body && (
                              <div>
                                <Label className="text-muted-foreground">Request Body</Label>
                                <pre className="mt-1 p-2 bg-white rounded border text-xs overflow-auto max-h-40">
                                  {JSON.stringify(failure.request_body, null, 2)}
                                </pre>
                              </div>
                            )}
                            {failure.resolution_notes && (
                              <div>
                                <Label className="text-muted-foreground">Resolution Notes</Label>
                                <p className="text-sm">{failure.resolution_notes}</p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialog.open} onOpenChange={(open) => setResolveDialog({ open, failureId: open ? resolveDialog.failureId : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Resolved</DialogTitle>
            <DialogDescription>
              Add notes about how this failure was resolved manually.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="notes">Resolution Notes</Label>
            <Textarea
              id="notes"
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              placeholder="Describe how this issue was resolved..."
              className="mt-2"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialog({ open: false, failureId: null })}>
              Cancel
            </Button>
            <Button onClick={handleResolve}>
              Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
