"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  History,
  Pencil,
  CheckCircle,
  Send,
  RefreshCw,
  Loader2,
  FileText,
  Layers,
} from "lucide-react";

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  row_number: number | null;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  changes: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
}

interface AuditLogViewerProps {
  isOpen: boolean;
  onClose: () => void;
  uploadId?: string;
  packageId?: string;
  title?: string;
}

const actionConfig: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  row_edited: {
    label: "Row Edited",
    icon: <Pencil className="h-3 w-3" />,
    color: "bg-blue-100 text-blue-800",
  },
  bulk_edit: {
    label: "Bulk Edit",
    icon: <Layers className="h-3 w-3" />,
    color: "bg-purple-100 text-purple-800",
  },
  submission_reviewed: {
    label: "Submission Reviewed",
    icon: <FileText className="h-3 w-3" />,
    color: "bg-yellow-100 text-yellow-800",
  },
  submission_approved: {
    label: "Submission Approved",
    icon: <CheckCircle className="h-3 w-3" />,
    color: "bg-green-100 text-green-800",
  },
  api_submission_confirmed: {
    label: "API Submission",
    icon: <Send className="h-3 w-3" />,
    color: "bg-indigo-100 text-indigo-800",
  },
  package_resubmitted: {
    label: "Package Resubmitted",
    icon: <RefreshCw className="h-3 w-3" />,
    color: "bg-orange-100 text-orange-800",
  },
  row_created: {
    label: "Row Created",
    icon: <FileText className="h-3 w-3" />,
    color: "bg-green-100 text-green-800",
  },
  row_deleted: {
    label: "Row Deleted",
    icon: <FileText className="h-3 w-3" />,
    color: "bg-red-100 text-red-800",
  },
  validation_override: {
    label: "Validation Override",
    icon: <CheckCircle className="h-3 w-3" />,
    color: "bg-yellow-100 text-yellow-800",
  },
};

export function AuditLogViewer({
  isOpen,
  onClose,
  uploadId,
  packageId,
  title = "Audit Log",
}: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && (uploadId || packageId)) {
      loadLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, uploadId, packageId]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (uploadId) {
        query = query.eq("upload_id", uploadId);
      }
      if (packageId) {
        query = query.eq("package_id", packageId);
      }

      const result = await query;
      const { data, error } = result;

      // Debug: log the full result
      if (process.env.NODE_ENV === "development") {
        console.log("Audit logs query result:", {
          hasData: !!data,
          dataLength: data?.length,
          hasError: !!error,
          errorType: error ? typeof error : null,
        });
      }

      if (error) {
        // Log all enumerable and non-enumerable properties
        console.error("Supabase error (raw):", error);
        console.error("Supabase error keys:", Object.keys(error));
        console.error("Supabase error prototype:", Object.getPrototypeOf(error));
        throw new Error(error.message || String(error) || "Failed to load audit logs");
      }

      // Cast action from enum to string for display
      const logsWithStringAction = (data || []).map((log: Record<string, unknown>) => ({
        ...log,
        action: String(log.action),
      })) as AuditLog[];

      setLogs(logsWithStringAction);
    } catch (error) {
      console.error("Error loading audit logs:", error instanceof Error ? error.message : JSON.stringify(error, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const renderChangeDetails = (log: AuditLog) => {
    if (log.field_name && log.old_value !== null && log.new_value !== null) {
      return (
        <div className="text-xs">
          <span className="text-muted-foreground">{log.field_name}: </span>
          <span className="line-through text-red-500">{log.old_value || "(empty)"}</span>
          <span className="mx-1">→</span>
          <span className="text-green-600">{log.new_value || "(empty)"}</span>
        </div>
      );
    }

    if (log.changes) {
      const changeCount = Object.keys(log.changes).length;
      return (
        <div className="text-xs text-muted-foreground">
          {changeCount} change{changeCount !== 1 ? "s" : ""}
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            View the history of changes and actions for this record.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end mb-2">
          <Button variant="outline" size="sm" onClick={loadLogs}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <ScrollArea className="h-[500px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No audit logs found</p>
              <p className="text-sm">
                Changes to this record will appear here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead className="w-[140px]">Action</TableHead>
                  <TableHead className="w-[80px]">Row</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const config = actionConfig[log.action] || {
                    label: log.action,
                    icon: <FileText className="h-3 w-3" />,
                    color: "bg-gray-100 text-gray-800",
                  };

                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`gap-1 ${config.color}`}>
                          {config.icon}
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.row_number ? `#${log.row_number}` : "-"}
                      </TableCell>
                      <TableCell>{renderChangeDetails(log)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {log.notes || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
