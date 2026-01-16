"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Send,
  FileText,
  Package,
  User,
  MapPin,
  DollarSign,
  Loader2,
  Download,
  Code,
  Eye,
  Copy,
  Check,
} from "lucide-react";
import type { FileValidationResult } from "@/lib/validation/schemas";
import { CSV_COLUMNS } from "@/lib/csv/constants";
import { rowsToApiPayloads, rowsToCSVWithImages, type ParsedCSVRow } from "@/lib/csv/parser";
import { processPayloadsWithImages } from "@/lib/utils/image";
import type { PackageScreeningRequest } from "@/lib/safepackage/types";

interface SubmissionReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => void;
  validationResult: FileValidationResult;
  fileName: string;
  isSubmitting?: boolean;
}

export function SubmissionReviewDialog({
  isOpen,
  onClose,
  onConfirm,
  validationResult,
  fileName,
  isSubmitting = false,
}: SubmissionReviewDialogProps) {
  const [reviewNotes, setReviewNotes] = useState("");
  const [confirmations, setConfirmations] = useState({
    dataReviewed: false,
    errorsAcknowledged: false,
    readyToSubmit: false,
  });
  const [activeTab, setActiveTab] = useState("review");
  const [copiedJson, setCopiedJson] = useState(false);
  const [previewRowIndex, setPreviewRowIndex] = useState(0);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [imageProcessingProgress, setImageProcessingProgress] = useState("");

  const allConfirmed =
    confirmations.dataReviewed &&
    (validationResult.isValid || confirmations.errorsAcknowledged) &&
    confirmations.readyToSubmit;

  const handleConfirm = () => {
    if (allConfirmed) {
      onConfirm(reviewNotes);
    }
  };

  // Get sample data for preview
  const sampleRows = validationResult.rows?.slice(0, 3) || [];
  const hasErrors = validationResult.invalidRows > 0;

  // Generate API payloads for valid rows
  const apiPayloads = useMemo(() => {
    if (!validationResult.rows) return [];
    return rowsToApiPayloads(
      validationResult.rows as ParsedCSVRow[],
      validationResult.results
    );
  }, [validationResult.rows, validationResult.results]);

  // Get current preview payload
  const currentPayload = apiPayloads[previewRowIndex] || null;

  // Download CSV with base64 images (fetches images from URLs and converts to base64)
  const handleDownloadCSV = async () => {
    if (!validationResult.rows) return;

    setIsProcessingImages(true);
    setImageProcessingProgress("Starting CSV image processing...");

    try {
      const csvContent = await rowsToCSVWithImages(
        validationResult.rows as ParsedCSVRow[],
        (index, total, message) => {
          setImageProcessingProgress(`Row ${index}/${total}: ${message}`);
        }
      );
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `validated_${fileName}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error processing images for CSV download:", error);
    } finally {
      setIsProcessingImages(false);
      setImageProcessingProgress("");
    }
  };

  // Download JSON with base64 images (fetches images from URLs and converts to base64)
  const handleDownloadJSON = async () => {
    if (apiPayloads.length === 0) return;

    setIsProcessingImages(true);
    setImageProcessingProgress("Starting image processing...");

    try {
      // Process payloads to convert image URLs to base64
      const processedPayloads = await processPayloadsWithImages(
        apiPayloads as PackageScreeningRequest[],
        (index, total, message) => {
          setImageProcessingProgress(`Package ${index}/${total}: ${message}`);
        }
      );

      const jsonContent = JSON.stringify(processedPayloads, null, 2);
      const blob = new Blob([jsonContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `api_payload_${fileName.replace(".csv", ".json")}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error processing images for download:", error);
    } finally {
      setIsProcessingImages(false);
      setImageProcessingProgress("");
    }
  };

  // Copy JSON to clipboard
  const handleCopyJSON = async () => {
    const jsonContent = currentPayload
      ? JSON.stringify(currentPayload, null, 2)
      : JSON.stringify(apiPayloads, null, 2);
    await navigator.clipboard.writeText(jsonContent);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Group summary statistics - use CSV column names
  const uniquePlatforms = new Set(
    validationResult.rows?.map((r) => r[CSV_COLUMNS.PLATFORM_ID]).filter(Boolean)
  );
  const uniqueDestinations = new Set(
    validationResult.rows?.map((r) => r[CSV_COLUMNS.DESTINATION_COUNTRY]).filter(Boolean)
  );
  const totalDeclaredValue = validationResult.rows?.reduce((sum, row) => {
    const value = parseFloat(String(row[CSV_COLUMNS.DECLARED_VALUE] || 0));
    return sum + (isNaN(value) ? 0 : value);
  }, 0) || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pre-Submission Review
          </DialogTitle>
          <DialogDescription>
            Please review the data before submitting to the SafePackage API.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="review" className="gap-2">
              <Eye className="h-4 w-4" />
              Review
            </TabsTrigger>
            <TabsTrigger value="json" className="gap-2">
              <Code className="h-4 w-4" />
              Preview JSON
            </TabsTrigger>
            <TabsTrigger value="download" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="review" className="mt-4">
            <ScrollArea className="h-[55vh] pr-4">
              <div className="space-y-6">
                {/* File Summary */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Submission Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">File Name</p>
                      <p className="font-medium truncate" title={fileName}>
                        {fileName}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Packages</p>
                      <p className="font-medium">{validationResult.totalRows}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Valid Rows</p>
                      <p className="font-medium text-green-600">
                        {validationResult.validRows}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Invalid Rows</p>
                      <p
                        className={`font-medium ${hasErrors ? "text-red-600" : "text-green-600"}`}
                      >
                        {validationResult.invalidRows}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Validation Status */}
                <div
                  className={`p-4 rounded-lg border ${
                    validationResult.isValid
                      ? "bg-green-50 border-green-200"
                      : "bg-yellow-50 border-yellow-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {validationResult.isValid ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    )}
                    <div>
                      <p
                        className={`font-medium ${
                          validationResult.isValid
                            ? "text-green-800"
                            : "text-yellow-800"
                        }`}
                      >
                        {validationResult.isValid
                          ? "All rows passed validation"
                          : `${validationResult.invalidRows} rows have validation errors`}
                      </p>
                      <p
                        className={`text-sm ${
                          validationResult.isValid
                            ? "text-green-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {validationResult.isValid
                          ? "Data is ready for submission."
                          : "Invalid rows will be saved but not processed. You can fix them later."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Data Overview */}
                <Accordion type="multiple" defaultValue={["overview", "sample"]}>
                  <AccordionItem value="overview">
                    <AccordionTrigger>
                      <span className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Data Overview
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm p-2">
                        <div>
                          <p className="text-muted-foreground">Platforms</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Array.from(uniquePlatforms).map((p) => (
                              <Badge key={String(p)} variant="secondary" className="text-xs">
                                {String(p)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Destinations</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Array.from(uniqueDestinations).map((d) => (
                              <Badge key={String(d)} variant="outline" className="text-xs">
                                {String(d)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Declared Value</p>
                          <p className="font-medium text-lg">
                            ${totalDeclaredValue.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="sample">
                    <AccordionTrigger>
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Sample Data Preview ({Math.min(3, sampleRows.length)} of{" "}
                        {validationResult.totalRows} rows)
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        {sampleRows.map((row, index) => (
                          <div
                            key={index}
                            className="p-3 border rounded-lg text-sm bg-background"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">
                                Row {index + 1}: {row[CSV_COLUMNS.EXTERNAL_ID] || "N/A"}
                              </span>
                              <Badge variant="outline">{row[CSV_COLUMNS.PLATFORM_ID]}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                              <div>
                                <MapPin className="h-3 w-3 inline mr-1" />
                                {row[CSV_COLUMNS.SHIPPER_CITY]}, {row[CSV_COLUMNS.SHIPPER_COUNTRY]} →{" "}
                                {row[CSV_COLUMNS.CONSIGNEE_CITY]}, {row[CSV_COLUMNS.CONSIGNEE_COUNTRY]}
                              </div>
                              <div>
                                <DollarSign className="h-3 w-3 inline mr-1" />$
                                {row[CSV_COLUMNS.DECLARED_VALUE]}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {hasErrors && (
                    <AccordionItem value="errors">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2 text-red-600">
                          <XCircle className="h-4 w-4" />
                          Validation Errors ({validationResult.invalidRows} rows)
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 max-h-[200px] overflow-auto">
                          {validationResult.results
                            .filter((r) => !r.isValid)
                            .slice(0, 10)
                            .map((row) => (
                              <div
                                key={row.rowNumber}
                                className="p-2 bg-red-50 rounded text-sm"
                              >
                                <p className="font-medium text-red-800">
                                  Row {row.rowNumber}
                                </p>
                                <ul className="text-xs text-red-600 mt-1">
                                  {row.errors.slice(0, 3).map((err, i) => (
                                    <li key={i}>
                                      • {err.field}: {err.message}
                                    </li>
                                  ))}
                                  {row.errors.length > 3 && (
                                    <li>• ...and {row.errors.length - 3} more</li>
                                  )}
                                </ul>
                              </div>
                            ))}
                          {validationResult.invalidRows > 10 && (
                            <p className="text-sm text-muted-foreground text-center py-2">
                              ...and {validationResult.invalidRows - 10} more rows
                              with errors
                            </p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>

                <Separator />

                {/* Review Notes */}
                <div className="space-y-2">
                  <Label htmlFor="review-notes">Review Notes (Optional)</Label>
                  <Textarea
                    id="review-notes"
                    placeholder="Add any notes about this submission for audit purposes..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Confirmations */}
                <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                  <p className="font-medium text-sm">
                    Please confirm before submitting:
                  </p>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="data-reviewed"
                      checked={confirmations.dataReviewed}
                      onCheckedChange={(checked) =>
                        setConfirmations((prev) => ({
                          ...prev,
                          dataReviewed: checked === true,
                        }))
                      }
                    />
                    <Label
                      htmlFor="data-reviewed"
                      className="text-sm font-normal leading-relaxed cursor-pointer"
                    >
                      I have reviewed the data and confirm it is accurate
                    </Label>
                  </div>

                  {hasErrors && (
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="errors-acknowledged"
                        checked={confirmations.errorsAcknowledged}
                        onCheckedChange={(checked) =>
                          setConfirmations((prev) => ({
                            ...prev,
                            errorsAcknowledged: checked === true,
                          }))
                        }
                      />
                      <Label
                        htmlFor="errors-acknowledged"
                        className="text-sm font-normal leading-relaxed cursor-pointer"
                      >
                        I acknowledge that {validationResult.invalidRows} rows have
                        validation errors and will not be processed
                      </Label>
                    </div>
                  )}

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="ready-to-submit"
                      checked={confirmations.readyToSubmit}
                      onCheckedChange={(checked) =>
                        setConfirmations((prev) => ({
                          ...prev,
                          readyToSubmit: checked === true,
                        }))
                      }
                    />
                    <Label
                      htmlFor="ready-to-submit"
                      className="text-sm font-normal leading-relaxed cursor-pointer"
                    >
                      I am ready to submit this data for processing
                    </Label>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="json" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>Preview Package</Label>
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={previewRowIndex}
                    onChange={(e) => setPreviewRowIndex(Number(e.target.value))}
                  >
                    {apiPayloads.map((payload, idx) => (
                      <option key={idx} value={idx}>
                        {idx + 1}. {payload.externalId || `Package ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-muted-foreground">
                    ({apiPayloads.length} valid packages)
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyJSON}
                  className="gap-2"
                >
                  {copiedJson ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy JSON
                    </>
                  )}
                </Button>
              </div>

              <div className="h-[50vh] border rounded-lg bg-muted overflow-auto">
                <pre className="p-4 text-xs whitespace-pre-wrap break-all">
                  {currentPayload
                    ? JSON.stringify(currentPayload, null, 2)
                    : "No valid packages to preview"}
                </pre>
              </div>

              <p className="text-xs text-muted-foreground">
                This is the exact JSON payload that will be sent to the SafePackage API
                for package screening.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="download" className="mt-4">
            <div className="space-y-6">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold mb-3">Export Options</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Download the validated data in your preferred format before submitting.
                </p>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Download CSV */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <FileText className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">CSV File (with Base64 Images)</h4>
                        <p className="text-xs text-muted-foreground">
                          Edited data with images converted to base64
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleDownloadCSV}
                      disabled={isProcessingImages}
                    >
                      {isProcessingImages ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Download CSV
                        </>
                      )}
                    </Button>
                    {isProcessingImages && imageProcessingProgress && (
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        {imageProcessingProgress}
                      </p>
                    )}
                  </div>

                  {/* Download JSON */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Code className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">JSON Payloads (with Base64 Images)</h4>
                        <p className="text-xs text-muted-foreground">
                          API-ready format ({apiPayloads.length} packages)
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleDownloadJSON}
                      disabled={apiPayloads.length === 0 || isProcessingImages}
                    >
                      {isProcessingImages ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Download JSON
                        </>
                      )}
                    </Button>
                    {isProcessingImages && imageProcessingProgress && (
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        {imageProcessingProgress}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 border border-dashed rounded-lg">
                <h4 className="font-medium mb-2">Export Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Rows</p>
                    <p className="font-medium">{validationResult.totalRows}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valid (will be exported to JSON)</p>
                    <p className="font-medium text-green-600">{validationResult.validRows}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Invalid (CSV only)</p>
                    <p className="font-medium text-red-600">{validationResult.invalidRows}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Declared Value</p>
                    <p className="font-medium">${totalDeclaredValue.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!allConfirmed || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Confirm & Submit
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
