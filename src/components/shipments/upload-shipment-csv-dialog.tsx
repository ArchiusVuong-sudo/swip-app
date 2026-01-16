"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileText,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Truck,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ValidationResult {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  missingColumns?: string[];
  shipmentCount?: number;
  shipments?: Array<{
    externalId: string;
    packageCount: number;
    rowNumbers: number[];
  }>;
  errors?: Array<{
    rowNumber: number;
    errors: Array<{
      field: string;
      message: string;
      value?: unknown;
    }>;
  }>;
}

interface ShipmentResult {
  externalId: string;
  success: boolean;
  safepackageShipmentId?: string;
  shipmentDbId?: string;
  packageCount: number;
  error?: string;
}

interface UploadShipmentCSVDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UploadShipmentCSVDialog({
  isOpen,
  onClose,
  onSuccess,
}: UploadShipmentCSVDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [step, setStep] = useState<"upload" | "validate" | "results">("upload");
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [submitResults, setSubmitResults] = useState<ShipmentResult[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      setStep("upload");
      setValidationResult(null);
      setSubmitResults([]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"],
    },
    maxFiles: 1,
    disabled: isValidating || isSubmitting,
  });

  const handleClose = () => {
    setSelectedFile(null);
    setStep("upload");
    setValidationResult(null);
    setSubmitResults([]);
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleValidate = async () => {
    if (!selectedFile) return;

    setIsValidating(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("environment", environment);
      formData.append("validateOnly", "true");

      const response = await fetch("/api/shipments/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok && !data.validation) {
        throw new Error(data.error || "Validation failed");
      }

      setValidationResult(data.validation);
      setStep("validate");
    } catch (error) {
      console.error("Validation error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to validate CSV");
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("environment", environment);

      const response = await fetch("/api/shipments/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.results) {
        setSubmitResults(data.results);
        setStep("results");

        const successCount = data.results.filter((r: ShipmentResult) => r.success).length;
        const failureCount = data.results.filter((r: ShipmentResult) => !r.success).length;

        if (failureCount === 0) {
          toast.success(`Successfully registered ${successCount} shipment(s)`);
          onSuccess?.();
        } else {
          toast.warning(`${successCount} succeeded, ${failureCount} failed`);
        }
      } else if (!response.ok) {
        throw new Error(data.error || "Failed to register shipments");
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to register shipments");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderUploadStep = () => (
    <div className="space-y-4">
      {/* Environment selector */}
      <div className="space-y-2">
        <Label>Environment</Label>
        <Select value={environment} onValueChange={(v) => setEnvironment(v as "sandbox" | "production")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
            <SelectItem value="production">Production</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Dropzone */}
      {!selectedFile ? (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            isDragActive && !isDragReject && "border-primary bg-primary/5",
            isDragReject && "border-red-500 bg-red-50",
            !isDragActive && "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div
              className={cn(
                "p-3 rounded-full",
                isDragActive && !isDragReject && "bg-primary/10",
                isDragReject && "bg-red-100",
                !isDragActive && "bg-gray-100"
              )}
            >
              <Upload
                className={cn(
                  "h-8 w-8",
                  isDragActive && !isDragReject && "text-primary",
                  isDragReject && "text-red-500",
                  !isDragActive && "text-gray-400"
                )}
              />
            </div>
            <div>
              {isDragReject ? (
                <p className="font-medium text-red-600">Only CSV files are accepted</p>
              ) : isDragActive ? (
                <p className="font-medium text-primary">Drop the file here</p>
              ) : (
                <>
                  <p className="font-medium text-gray-900">
                    Drop your shipment registration CSV here
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    or click to browse
                  </p>
                </>
              )}
            </div>
            <p className="text-xs text-gray-400">
              Use the CSV exported from the Packages page
            </p>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-green-300 bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-900">{selectedFile.name}</p>
                <p className="text-sm text-green-600">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedFile(null);
                setValidationResult(null);
              }}
              className="text-green-600 hover:text-green-800 hover:bg-green-100"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const renderValidationStep = () => (
    <div className="space-y-4">
      {validationResult && (
        <>
          {/* Summary */}
          <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/50">
            {validationResult.isValid ? (
              <CheckCircle className="h-8 w-8 text-green-600" />
            ) : (
              <AlertCircle className="h-8 w-8 text-red-500" />
            )}
            <div className="flex-1">
              <p className="font-medium">
                {validationResult.isValid ? "Validation Passed" : "Validation Failed"}
              </p>
              <p className="text-sm text-muted-foreground">
                {validationResult.validRows} of {validationResult.totalRows} rows valid
                {validationResult.shipmentCount !== undefined && (
                  <> • {validationResult.shipmentCount} shipment(s) to register</>
                )}
              </p>
            </div>
          </div>

          {/* Missing columns */}
          {validationResult.missingColumns && validationResult.missingColumns.length > 0 && (
            <div className="p-4 rounded-lg border border-red-200 bg-red-50">
              <p className="font-medium text-red-800 mb-2">Missing Required Columns:</p>
              <div className="flex flex-wrap gap-2">
                {validationResult.missingColumns.map((col) => (
                  <Badge key={col} variant="destructive">
                    {col}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Shipments preview */}
          {validationResult.isValid && validationResult.shipments && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Shipments to Register:</p>
              <ScrollArea className="h-[200px] border rounded-lg">
                <div className="divide-y">
                  {validationResult.shipments.map((shipment) => (
                    <div key={shipment.externalId} className="flex items-center gap-3 p-3">
                      <Truck className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{shipment.externalId}</p>
                        <p className="text-xs text-muted-foreground">
                          Rows: {shipment.rowNumbers.join(", ")}
                        </p>
                      </div>
                      <Badge variant="outline" className="gap-1">
                        <Package className="h-3 w-3" />
                        {shipment.packageCount} package(s)
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Validation errors */}
          {validationResult.errors && validationResult.errors.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-800">Validation Errors:</p>
              <ScrollArea className="h-[200px] border border-red-200 rounded-lg">
                <div className="divide-y divide-red-100">
                  {validationResult.errors.map((rowError) => (
                    <div key={rowError.rowNumber} className="p-3 bg-red-50">
                      <p className="font-medium text-sm text-red-800 mb-1">
                        Row {rowError.rowNumber}
                      </p>
                      <ul className="text-xs text-red-600 space-y-1">
                        {rowError.errors.map((err, i) => (
                          <li key={i}>
                            <span className="font-medium">{err.field}:</span> {err.message}
                            {err.value !== undefined && (
                              <span className="text-red-400"> (value: &quot;{String(err.value)}&quot;)</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderResultsStep = () => (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/50">
        {submitResults.every((r) => r.success) ? (
          <CheckCircle className="h-8 w-8 text-green-600" />
        ) : submitResults.every((r) => !r.success) ? (
          <AlertCircle className="h-8 w-8 text-red-500" />
        ) : (
          <AlertCircle className="h-8 w-8 text-yellow-500" />
        )}
        <div className="flex-1">
          <p className="font-medium">
            {submitResults.every((r) => r.success)
              ? "All Shipments Registered"
              : submitResults.every((r) => !r.success)
              ? "Registration Failed"
              : "Partial Success"}
          </p>
          <p className="text-sm text-muted-foreground">
            {submitResults.filter((r) => r.success).length} succeeded,{" "}
            {submitResults.filter((r) => !r.success).length} failed
          </p>
        </div>
      </div>

      {/* Results list */}
      <ScrollArea className="h-[300px] border rounded-lg">
        <div className="divide-y">
          {submitResults.map((result) => (
            <div
              key={result.externalId}
              className={cn(
                "flex items-center gap-3 p-3",
                result.success ? "bg-green-50" : "bg-red-50"
              )}
            >
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{result.externalId}</p>
                {result.success ? (
                  <p className="text-xs text-green-600 truncate">
                    ID: {result.safepackageShipmentId}
                  </p>
                ) : (
                  <p className="text-xs text-red-600">{result.error}</p>
                )}
              </div>
              <Badge variant="outline" className="gap-1">
                <Package className="h-3 w-3" />
                {result.packageCount}
              </Badge>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {step === "upload" && "Upload Shipment CSV"}
            {step === "validate" && "Validation Results"}
            {step === "results" && "Registration Results"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload the shipment registration CSV file exported from the Packages page."}
            {step === "validate" && "Review the validation results before registering shipments."}
            {step === "results" && "View the results of shipment registration."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === "upload" && renderUploadStep()}
          {step === "validate" && renderValidationStep()}
          {step === "results" && renderResultsStep()}
        </div>

        <DialogFooter>
          {step === "upload" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleValidate} disabled={!selectedFile || isValidating}>
                {isValidating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  "Validate"
                )}
              </Button>
            </>
          )}
          {step === "validate" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!validationResult?.isValid || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Truck className="mr-2 h-4 w-4" />
                    Register Shipments
                  </>
                )}
              </Button>
            </>
          )}
          {step === "results" && (
            <Button onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
