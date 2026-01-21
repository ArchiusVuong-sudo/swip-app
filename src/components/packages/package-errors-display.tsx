"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, XCircle, RefreshCw, CheckCircle2, Info, Clock, FileWarning } from "lucide-react";
import { toast } from "sonner";
import type { Package as PackageType, ApiFailure } from "@/types/database";

// Rejection reason code descriptions
const REJECTION_REASONS: Record<string, string> = {
  RMG: "Transportation security violation",
  RBT: "Transportation security violation",
  RDG: "Transportation security violation",
  RHP: "De-minimis value violation",
  RIP: "Intellectual property infringement",
  RIC: "Copyright Infringement",
  RIT: "Trademark Infringement",
  RIN: "Patent Infringement",
  RCT: "Customs regulations violation",
  RPA: "USDA Violation",
  RPW: "Fish and Wildlife Service Violation",
  RPT: "Department of Transportation Violation",
  RPD: "FDA Violation",
  RPS: "Consumer Product Safety Commission Violation",
  RPF: "Financial Crimes Enforcement Network Violation",
  RPE: "ATF Violation",
  RPL: "Forced Labor Violation",
  RCR: "Customs regulations violation",
  RBD: "Bad or incomplete data",
};

interface PackageErrorsDisplayProps {
  pkg: PackageType;
  showFullDetails?: boolean;
}

export function PackageErrorsDisplay({ pkg, showFullDetails = true }: PackageErrorsDisplayProps) {
  const [failures, setFailures] = useState<ApiFailure[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  const hasScreeningError = pkg.status === "rejected" || pkg.status === "inconclusive";
  const hasAuditError = pkg.audit_status === "Failed";

  // Extract error info from screening response
  const screeningResponse = pkg.screening_response as Record<string, unknown> | null;
  const productErrors = screeningResponse?.products as Array<{
    reference: string;
    sku: string;
    code: number;
    status: string;
    reason?: { code: string; description: string };
  }> | undefined;

  useEffect(() => {
    fetchFailures();
  }, [pkg.id]);

  const fetchFailures = async () => {
    try {
      const response = await fetch(`/api/failures?packageId=${pkg.id}`);
      if (!response.ok) throw new Error("Failed to fetch failures");
      const data = await response.json();
      setFailures(data.failures || []);
    } catch (error) {
      console.error("Error fetching API failures:", error);
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

      if (!response.ok) throw new Error("Retry failed");

      const result = await response.json();
      if (result.success) {
        toast.success("Retry successful");
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

  // Determine if there are any errors to display
  const hasErrors = hasScreeningError || hasAuditError || failures.length > 0 || (productErrors && productErrors.some(p => p.code !== 1));

  if (!hasErrors && !loading) {
    return null; // No errors to display
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-800">
          <FileWarning className="h-5 w-5" />
          Errors & Issues
        </CardTitle>
        <CardDescription>
          Consolidated view of all errors and issues for this package
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={["screening", "api-failures", "products"]}>
            {/* Screening Errors */}
            {hasScreeningError && (
              <AccordionItem value="screening">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span>Screening Error</span>
                    <Badge variant="destructive">{pkg.screening_status}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Alert variant="destructive" className="bg-red-50">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Package {pkg.status === "rejected" ? "Rejected" : "Inconclusive"}</AlertTitle>
                    <AlertDescription className="mt-2">
                      <div className="space-y-2">
                        <p>
                          <strong>Status:</strong> {pkg.screening_status}
                        </p>
                        <p>
                          <strong>Code:</strong> {pkg.screening_code}
                        </p>
                        {screeningResponse?.reason ? (
                          <div className="mt-2 p-2 bg-white rounded border">
                            <p className="font-medium">Reason:</p>
                            <p className="text-sm">
                              {(screeningResponse.reason as { code: string })?.code}: {REJECTION_REASONS[(screeningResponse.reason as { code: string })?.code] || (screeningResponse.reason as { description: string })?.description || "Unknown reason"}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Product-Level Errors */}
            {productErrors && productErrors.some(p => p.code !== 1) && (
              <AccordionItem value="products">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>Product Issues</span>
                    <Badge variant="outline" className="text-amber-600 border-amber-600">
                      {productErrors.filter(p => p.code !== 1).length} product(s)
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {productErrors
                      .filter(p => p.code !== 1)
                      .map((product, idx) => (
                        <div key={idx} className="p-3 bg-amber-100/50 rounded-lg border border-amber-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={product.code === 2 ? "destructive" : "outline"}>
                              {product.status}
                            </Badge>
                            <span className="text-sm font-mono">{product.sku}</span>
                          </div>
                          {product.reason && (
                            <div className="text-sm">
                              <span className="font-medium">Reason:</span> {product.reason.code}
                              {product.reason.description && (
                                <span className="text-muted-foreground"> - {REJECTION_REASONS[product.reason.code] || product.reason.description}</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Audit Errors */}
            {hasAuditError && (
              <AccordionItem value="audit">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span>Audit Failed</span>
                    <Badge variant="destructive">Failed</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Alert variant="destructive" className="bg-red-50">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Audit Failed</AlertTitle>
                    <AlertDescription>
                      The package audit has failed. Please review the audit images and remarks, then resubmit if needed.
                      {pkg.audit_remark && (
                        <p className="mt-2">
                          <strong>Remark:</strong> {pkg.audit_remark}
                        </p>
                      )}
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* API Failures */}
            {failures.length > 0 && (
              <AccordionItem value="api-failures">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span>API Failures</span>
                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                      {failures.filter(f => f.retry_status !== "success").length} unresolved
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {failures.map((failure) => (
                      <div
                        key={failure.id}
                        className={`p-3 rounded-lg border ${
                          failure.retry_status === "success"
                            ? "bg-green-50 border-green-200"
                            : "bg-orange-50 border-orange-200"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {failure.retry_status === "success" ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : failure.retry_status === "exhausted" ? (
                                <XCircle className="h-4 w-4 text-red-600" />
                              ) : (
                                <Clock className="h-4 w-4 text-orange-600" />
                              )}
                              <span className="font-medium text-sm">
                                {failure.endpoint} ({failure.method})
                              </span>
                              <Badge
                                variant={
                                  failure.retry_status === "success" ? "default" :
                                  failure.retry_status === "exhausted" ? "destructive" :
                                  "outline"
                                }
                                className="text-xs"
                              >
                                {failure.retry_status}
                              </Badge>
                            </div>

                            {failure.error_code && (
                              <p className="text-sm">
                                <span className="font-medium">Error Code:</span> {failure.error_code}
                              </p>
                            )}

                            {failure.error_message && (
                              <p className="text-sm text-muted-foreground">
                                {failure.error_message}
                              </p>
                            )}

                            <p className="text-xs text-muted-foreground mt-1">
                              Attempts: {failure.retry_count}/{failure.max_retries}
                              {failure.last_retry_at && (
                                <> · Last retry: {new Date(failure.last_retry_at).toLocaleString()}</>
                              )}
                            </p>
                          </div>

                          {failure.retry_status !== "success" && failure.retry_status !== "exhausted" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetry(failure.id)}
                              disabled={retrying === failure.id}
                            >
                              {retrying === failure.id ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3 w-3" />
                              )}
                              <span className="ml-1">Retry</span>
                            </Button>
                          )}
                        </div>

                        {showFullDetails && failure.error_details && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              Show details
                            </summary>
                            <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-32">
                              {JSON.stringify(failure.error_details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* No Errors */}
            {!hasScreeningError && !hasAuditError && failures.length === 0 && !(productErrors && productErrors.some(p => p.code !== 1)) && (
              <div className="flex items-center gap-2 p-4 text-green-700 bg-green-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5" />
                <span>No errors or issues found for this package.</span>
              </div>
            )}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
