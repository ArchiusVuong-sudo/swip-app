"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { CSVDropzone } from "@/components/uploads/csv-dropzone";
import { ValidationResults } from "@/components/uploads/validation-results";
import { CSVPreview } from "@/components/uploads/csv-preview";
import { RowEditor } from "@/components/uploads/row-editor";
import { SubmissionReviewDialog } from "@/components/uploads/submission-review-dialog";
import { APISubmissionDialog } from "@/components/uploads/api-submission-dialog";
import { AuditLogViewer } from "@/components/uploads/audit-log-viewer";
import { logSubmissionReview, logAPISubmission } from "@/lib/audit/logger";
import { useEnvironmentStore } from "@/stores/environment-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { processCSVFile, revalidateRows } from "@/lib/csv/parser";
import type { FileValidationResult } from "@/lib/validation/schemas";
import {
  ArrowRight,
  FileText,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Send,
  Eye,
  History,
} from "lucide-react";

interface ProcessingResults {
  total: number;
  processed: number;
  accepted: number;
  rejected: number;
  inconclusive: number;
  auditRequired: number;
  failed: number;
}

interface Upload {
  id: string;
  file_name: string;
  file_size: number;
  row_count: number;
  valid_row_count: number;
  invalid_row_count: number;
  status: string;
  created_at: string;
  processing_results?: ProcessingResults;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  pending: { label: "Pending", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  validating: { label: "Validating", variant: "secondary", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  validated: { label: "Validated", variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
  validation_failed: { label: "Validation Failed", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  processing: { label: "Processing", variant: "secondary", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  completed: { label: "Completed", variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
  completed_with_errors: { label: "Completed with Errors", variant: "outline", icon: <AlertCircle className="h-3 w-3" /> },
  failed: { label: "Failed", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
};

export default function UploadsPage() {
  const router = useRouter();
  const { environment } = useEnvironmentStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] =
    useState<FileValidationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(true);
  const [processingUploadId, setProcessingUploadId] = useState<string | null>(null);

  // Row editing state
  const [editingRowFromPreview, setEditingRowFromPreview] = useState<{
    rowIndex: number;
    data: Record<string, string | number | undefined>;
    errors: Array<{ field: string; message: string }>;
  } | null>(null);

  // New dialog states
  const [showSubmissionReview, setShowSubmissionReview] = useState(false);
  const [showAPISubmissionDialog, setShowAPISubmissionDialog] = useState(false);
  const [selectedUploadForAPI, setSelectedUploadForAPI] = useState<Upload | null>(null);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [auditLogUploadId, setAuditLogUploadId] = useState<string | undefined>(undefined);

  // Load upload history
  useEffect(() => {
    loadUploads();
  }, []);

  const loadUploads = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("uploads")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setUploads(data || []);
    } catch (error) {
      console.error("Error loading uploads:", error);
    } finally {
      setLoadingUploads(false);
    }
  };

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setValidationResult(null);
    setIsProcessing(true);
    setProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      const result = await processCSVFile(file);

      clearInterval(progressInterval);
      setProgress(100);
      setValidationResult(result);

      if (result.isValid) {
        toast.success(`${result.validRows} rows validated successfully!`);
      } else {
        toast.error(`${result.invalidRows} rows have validation errors`);
      }
    } catch (error) {
      toast.error("Failed to process CSV file");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleFileRemove = useCallback(() => {
    setSelectedFile(null);
    setValidationResult(null);
    setProgress(0);
  }, []);

  // Handle row updates from the editor
  const handleRowUpdate = useCallback(async (rowIndex: number, updatedRow: Record<string, string | number | undefined>) => {
    if (!validationResult || !validationResult.rows) return;

    const oldRow = validationResult.rows[rowIndex];

    // Update the row in the validation result
    const newRows = [...validationResult.rows];
    newRows[rowIndex] = updatedRow as Record<string, string>;

    // Re-validate all rows
    const headers = Object.keys(newRows[0] || {});
    const newResult = revalidateRows(newRows, headers);

    setValidationResult(newResult);

    // Note: Audit logging for pre-upload edits is skipped since no upload_id exists yet
    // Edits made after upload is created will be logged properly

    // Show feedback
    if (newResult.isValid) {
      toast.success("All rows are now valid!");
    } else {
      toast.info(`Row updated. ${newResult.invalidRows} rows still have errors.`);
    }
  }, [validationResult]);

  // Handle clicking a row in the CSV preview to edit it
  const handlePreviewRowClick = useCallback((rowIndex: number) => {
    if (!validationResult || !validationResult.rows) return;

    const rowData = validationResult.rows[rowIndex] || {};
    const rowResult = validationResult.results.find((r) => r.rowNumber === rowIndex + 1);
    const errors = rowResult?.errors.map((e) => ({
      field: e.field,
      message: e.message,
    })) || [];

    setEditingRowFromPreview({ rowIndex, data: rowData, errors });
  }, [validationResult]);

  // Handle inline cell edit from CSV preview
  const handleCellEdit = useCallback((rowIndex: number, field: string, value: string) => {
    if (!validationResult || !validationResult.rows) return;

    const oldValue = String(validationResult.rows[rowIndex]?.[field] || "");

    // Update the row
    const newRows = [...validationResult.rows];
    newRows[rowIndex] = {
      ...newRows[rowIndex],
      [field]: value,
    };

    // Re-validate all rows
    const headers = Object.keys(newRows[0] || {});
    const newResult = revalidateRows(newRows, headers);

    setValidationResult(newResult);

    // Note: Audit logging for pre-upload edits is skipped since no upload_id exists yet

    // Show feedback
    if (newResult.isValid) {
      toast.success("All rows are now valid!");
    } else {
      const rowResult = newResult.results.find((r) => r.rowNumber === rowIndex + 1);
      if (rowResult?.isValid) {
        toast.success(`Row ${rowIndex + 1} is now valid`);
      } else {
        toast.info(`Field updated. ${newResult.invalidRows} rows still have errors.`);
      }
    }
  }, [validationResult]);

  // Open submission review dialog
  const handleReviewBeforeSubmit = () => {
    if (validationResult) {
      setShowSubmissionReview(true);
    }
  };

  // Handle submission after review
  const handleSubmitAfterReview = async (notes: string) => {
    if (!selectedFile || !validationResult) return;

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      // Log the submission review
      await logSubmissionReview("new-upload", notes, {
        dataReviewed: true,
        errorsAcknowledged: !validationResult.isValid,
        readyToSubmit: true,
      });

      // Create upload record
      const { data: upload, error: uploadError } = await (supabase
        .from("uploads") as ReturnType<typeof supabase.from>)
        .insert({
          user_id: user.id,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          row_count: validationResult.totalRows,
          valid_row_count: validationResult.validRows,
          invalid_row_count: validationResult.invalidRows,
          status: validationResult.isValid ? "validated" : "validation_failed",
          raw_data: validationResult.rows,
          validation_errors: validationResult.errors,
          review_notes: notes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        } as Record<string, unknown>)
        .select()
        .single();

      if (uploadError) throw uploadError;

      toast.success("File uploaded successfully!");

      // Refresh uploads list
      loadUploads();

      // Clear form
      setSelectedFile(null);
      setValidationResult(null);
      setProgress(0);
      setShowSubmissionReview(false);

      // If valid, navigate to packages
      if (validationResult.isValid) {
        router.push("/packages");
      }
    } catch (error) {
      console.error("Error submitting upload:", error);
      toast.error("Failed to submit file");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open API submission confirmation dialog
  const handleOpenAPISubmissionDialog = (upload: Upload) => {
    setSelectedUploadForAPI(upload);
    setShowAPISubmissionDialog(true);
  };

  // Handle API submission after confirmation
  const handleConfirmAPISubmission = async (notes: string) => {
    if (!selectedUploadForAPI) return;

    setProcessingUploadId(selectedUploadForAPI.id);
    setShowAPISubmissionDialog(false);

    try {
      // Log the API submission
      await logAPISubmission(
        selectedUploadForAPI.id,
        notes,
        selectedUploadForAPI.valid_row_count
      );

      const response = await fetch(`/api/uploads/${selectedUploadForAPI.id}/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ submissionNotes: notes, environment }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process upload");
      }

      toast.success(`Processing complete! ${data.results.accepted} accepted, ${data.results.rejected} rejected`);

      // Refresh uploads list
      loadUploads();

      // Navigate to packages page to see results
      router.push("/packages");
    } catch (error) {
      console.error("Error processing upload:", error);
      toast.error(error instanceof Error ? error.message : "Failed to process upload");
    } finally {
      setProcessingUploadId(null);
      setSelectedUploadForAPI(null);
    }
  };

  // Open audit log viewer
  const handleViewAuditLog = (uploadId: string) => {
    setAuditLogUploadId(uploadId);
    setShowAuditLog(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Upload CSV</h2>
        <p className="text-muted-foreground">
          Upload a CSV file containing package data for customs screening.
        </p>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">CSV File Requirements</CardTitle>
          <CardDescription>
            Ensure your CSV file follows the required format for successful
            processing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">Required Fields</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>External ID, House Bill Number, Barcode</li>
                <li>Platform ID, Seller ID</li>
                <li>Shipper & Consignee addresses</li>
                <li>Product details (SKU, Name, Description, URL)</li>
                <li>Pricing (Declared Value, List Price)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Format Guidelines</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Country codes: ISO3 format (USA, CHN, JPN)</li>
                <li>Phone: Digits and hyphens only</li>
                <li>Postal codes: Alphanumeric only</li>
                <li>HS codes: 6-10 digits, no periods</li>
                <li>Dates: YYYY-MM-DD format</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <a
              href="/example/API_data_template_v2.csv"
              className="text-sm text-primary hover:underline"
              download
            >
              Download CSV template
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Upload Area and History - Side by Side */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload File</CardTitle>
          </CardHeader>
          <CardContent>
            <CSVDropzone
              onFileSelect={handleFileSelect}
              onFileRemove={handleFileRemove}
              selectedFile={selectedFile}
              isProcessing={isProcessing}
              progress={progress}
            />
          </CardContent>
        </Card>

        {/* Upload History */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Upload History</CardTitle>
              <CardDescription>
                Recent uploads and their status.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadUploads}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {loadingUploads ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : uploads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No uploads yet</p>
                <p className="text-sm">Upload a CSV file to get started.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {uploads.map((upload) => {
                  const status = statusConfig[upload.status] || statusConfig.pending;
                  const isProcessingThis = processingUploadId === upload.id;
                  const canProcess = upload.status === "validated";
                  const hasResults = upload.processing_results && upload.processing_results.processed > 0;

                  return (
                    <div
                      key={upload.id}
                      className="p-3 border rounded-lg space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{upload.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(upload.file_size)} • {upload.row_count} rows • {formatDate(upload.created_at)}
                          </p>
                        </div>
                        <Badge variant={status.variant} className="gap-1 shrink-0">
                          {status.icon}
                          {status.label}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="text-green-600">{upload.valid_row_count} valid</span>
                          {upload.invalid_row_count > 0 && (
                            <span className="text-red-600 ml-2">{upload.invalid_row_count} invalid</span>
                          )}
                        </div>
                        {hasResults && (
                          <div>
                            <span className="text-green-600">{upload.processing_results!.accepted} accepted</span>
                            {upload.processing_results!.rejected > 0 && (
                              <span className="text-red-600 ml-2">{upload.processing_results!.rejected} rejected</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {canProcess && (
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleOpenAPISubmissionDialog(upload)}
                            disabled={isProcessingThis || processingUploadId !== null}
                          >
                            {isProcessingThis ? (
                              <>
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Send className="mr-1 h-3 w-3" />
                                Submit to API
                              </>
                            )}
                          </Button>
                        )}
                        {hasResults && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push("/packages")}
                          >
                            <Eye className="mr-1 h-3 w-3" />
                            View Packages
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewAuditLog(upload.id)}
                        >
                          <History className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Validation Results */}
      {validationResult && (
        <ValidationResults
          result={validationResult}
          onRowUpdate={handleRowUpdate}
        />
      )}

      {/* CSV Preview Table with Inline Editing */}
      {validationResult && validationResult.rows && validationResult.rows.length > 0 && (
        <CSVPreview
          result={validationResult}
          onRowClick={handlePreviewRowClick}
          onCellEdit={handleCellEdit}
        />
      )}

      {/* Row Editor from Preview Click */}
      {editingRowFromPreview && (
        <RowEditor
          row={editingRowFromPreview.data}
          rowIndex={editingRowFromPreview.rowIndex}
          isOpen={true}
          onClose={() => setEditingRowFromPreview(null)}
          onSave={(rowIndex, updatedRow) => {
            handleRowUpdate(rowIndex, updatedRow);
            setEditingRowFromPreview(null);
          }}
          errors={editingRowFromPreview.errors}
        />
      )}

      {/* Submit Button - Now opens review dialog */}
      {validationResult && (
        <div className="flex justify-end gap-2">
          <Button
            size="lg"
            onClick={handleReviewBeforeSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Review & Submit
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}

      {/* Pre-Submission Review Dialog */}
      {validationResult && selectedFile && (
        <SubmissionReviewDialog
          isOpen={showSubmissionReview}
          onClose={() => setShowSubmissionReview(false)}
          onConfirm={handleSubmitAfterReview}
          validationResult={validationResult}
          fileName={selectedFile.name}
          isSubmitting={isSubmitting}
        />
      )}

      {/* API Submission Confirmation Dialog */}
      {selectedUploadForAPI && (
        <APISubmissionDialog
          isOpen={showAPISubmissionDialog}
          onClose={() => {
            setShowAPISubmissionDialog(false);
            setSelectedUploadForAPI(null);
          }}
          onConfirm={handleConfirmAPISubmission}
          upload={selectedUploadForAPI}
          isSubmitting={processingUploadId !== null}
        />
      )}

      {/* Audit Log Viewer */}
      <AuditLogViewer
        isOpen={showAuditLog}
        onClose={() => {
          setShowAuditLog(false);
          setAuditLogUploadId(undefined);
        }}
        uploadId={auditLogUploadId}
        title="Upload Audit Log"
      />
    </div>
  );
}
