"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { ApiFailure } from "@/types/database";

interface ApiFailuresViewerProps {
  uploadId?: string;
  environment?: "sandbox" | "production";
  showTitle?: boolean;
}

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

export function ApiFailuresViewer({
  uploadId,
  environment,
  showTitle = true,
}: ApiFailuresViewerProps) {
  const [failures, setFailures] = useState<ApiFailure[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [batchRetrying, setBatchRetrying] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [resolveDialog, setResolveDialog] = useState<{
    open: boolean;
    failureId: string | null;
  }>({ open: false, failureId: null });
  const [resolveNotes, setResolveNotes] = useState("");

  useEffect(() => {
    fetchFailures();
  }, [uploadId, environment]);

  const fetchFailures = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (uploadId) params.append("upload_id", uploadId);
      if (environment) params.append("environment", environment);

      const response = await fetch(`/api/failures?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setFailures(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching failures:", error);
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
        // Refresh the list
        await fetchFailures();
      } else {
        console.error("Retry failed:", result.error);
        // Still refresh to show updated status
        await fetchFailures();
      }
    } catch (error) {
      console.error("Error retrying:", error);
    } finally {
      setRetrying(null);
    }
  };

  const handleBatchRetry = async () => {
    setBatchRetrying(true);
    try {
      const body: { failure_ids?: string[]; upload_id?: string } = {};

      if (uploadId) {
        body.upload_id = uploadId;
      } else {
        // Retry all pending failures
        const pendingFailures = failures.filter(
          f => f.retry_status === "pending" || f.retry_status === "manual_required"
        );
        body.failure_ids = pendingFailures.map(f => f.id);
      }

      const response = await fetch("/api/failures/batch-retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();

      if (result.success) {
        // Refresh the list
        await fetchFailures();
      }
    } catch (error) {
      console.error("Error batch retrying:", error);
    } finally {
      setBatchRetrying(false);
    }
  };

  const handleResolve = async () => {
    if (!resolveDialog.failureId) return;

    try {
      const response = await fetch(
        `/api/failures/${resolveDialog.failureId}/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: resolveNotes }),
        }
      );
      const result = await response.json();

      if (result.success) {
        setResolveDialog({ open: false, failureId: null });
        setResolveNotes("");
        await fetchFailures();
      }
    } catch (error) {
      console.error("Error resolving:", error);
    }
  };

  const pendingCount = failures.filter(
    f => f.retry_status === "pending" || f.retry_status === "manual_required"
  ).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading API failures...
        </CardContent>
      </Card>
    );
  }

  if (failures.length === 0) {
    return null; // Don't show anything if there are no failures
  }

  return (
    <Card className="border-red-200 bg-red-50/30">
      {showTitle && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-5 w-5" />
                API Failures ({failures.length})
              </CardTitle>
              <CardDescription>
                {pendingCount > 0 ? (
                  <span className="text-red-600">
                    {pendingCount} failure(s) pending retry
                  </span>
                ) : (
                  "All failures have been resolved or exhausted"
                )}
              </CardDescription>
            </div>
            {pendingCount > 0 && (
              <Button
                onClick={handleBatchRetry}
                disabled={batchRetrying}
                variant="destructive"
              >
                {batchRetrying ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry All ({pendingCount})
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent className={!showTitle ? "pt-4" : ""}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>External ID</TableHead>
              <TableHead>Row #</TableHead>
              <TableHead>Error</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Retries</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {failures.map((failure) => (
              <>
                <TableRow key={failure.id} className="cursor-pointer hover:bg-red-100/50">
                  <TableCell
                    onClick={() =>
                      setExpandedRow(expandedRow === failure.id ? null : failure.id)
                    }
                  >
                    {expandedRow === failure.id ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {failure.external_id || "-"}
                  </TableCell>
                  <TableCell>{failure.row_number || "-"}</TableCell>
                  <TableCell className="max-w-xs truncate" title={failure.error_message || ""}>
                    {failure.error_message || "Unknown error"}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[failure.retry_status]}>
                      <span className="mr-1">{statusIcons[failure.retry_status]}</span>
                      {failure.retry_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {failure.retry_count}/{failure.max_retries}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {(failure.retry_status === "pending" ||
                        failure.retry_status === "manual_required") && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRetry(failure.id)}
                            disabled={retrying === failure.id}
                          >
                            {retrying === failure.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setResolveDialog({ open: true, failureId: failure.id })
                            }
                          >
                            Resolve
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
                {expandedRow === failure.id && (
                  <TableRow>
                    <TableCell colSpan={7} className="bg-red-50">
                      <div className="p-4 space-y-4">
                        <div>
                          <h4 className="font-semibold text-sm text-red-800 mb-2">
                            Error Details
                          </h4>
                          <div className="bg-white p-3 rounded border border-red-200 font-mono text-xs overflow-x-auto">
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(
                                {
                                  error_code: failure.error_code,
                                  error_message: failure.error_message,
                                  error_details: failure.error_details,
                                  endpoint: failure.endpoint,
                                  method: failure.method,
                                  status_code: failure.status_code,
                                },
                                null,
                                2
                              )}
                            </pre>
                          </div>
                        </div>
                        {failure.resolution_notes && (
                          <div>
                            <h4 className="font-semibold text-sm text-red-800 mb-2">
                              Resolution Notes
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {failure.resolution_notes}
                            </p>
                          </div>
                        )}
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>Created: {new Date(failure.created_at).toLocaleString()}</span>
                          {failure.last_retry_at && (
                            <span>
                              Last Retry: {new Date(failure.last_retry_at).toLocaleString()}
                            </span>
                          )}
                          {failure.resolved_at && (
                            <span>
                              Resolved: {new Date(failure.resolved_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog
        open={resolveDialog.open}
        onOpenChange={(open) => setResolveDialog({ open, failureId: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Failure</DialogTitle>
            <DialogDescription>
              Mark this failure as resolved. This will prevent further automatic retries.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="notes">Resolution Notes</Label>
            <Textarea
              id="notes"
              placeholder="Why is this being resolved manually?"
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResolveDialog({ open: false, failureId: null })}
            >
              Cancel
            </Button>
            <Button onClick={handleResolve}>Resolve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
