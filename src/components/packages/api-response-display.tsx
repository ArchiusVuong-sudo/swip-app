"use client";

import { AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react";
import type { Json } from "@/types/database";

interface ApiResponseDisplayProps {
  response: Json;
}

interface ItemResult {
  sku?: string;
  code?: number;
  status?: string;
  reference?: string;
  platformId?: string;
  reason?: {
    code?: string;
    description?: string;
  };
}

interface ScreeningResponse {
  code?: number;
  status?: string;
  packageId?: string;
  externalId?: string;
  labelQrCode?: string;
  items?: ItemResult[];
  error?: {
    code?: string | number;
    message?: string;
  };
  message?: string;
}

function getStatusConfig(code: number | undefined, status: string | undefined) {
  if (code === 1 || status?.toLowerCase() === "accepted") {
    return {
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      label: "Accepted",
    };
  }
  if (code === 2 || status?.toLowerCase() === "rejected") {
    return {
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      label: "Rejected",
    };
  }
  if (code === 3 || status?.toLowerCase() === "inconclusive") {
    return {
      icon: AlertTriangle,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      label: "Inconclusive",
    };
  }
  if (code === 4 || status?.toLowerCase() === "audit") {
    return {
      icon: Info,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      label: "Audit Required",
    };
  }
  return {
    icon: Info,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    label: status || "Unknown",
  };
}

export function ApiResponseDisplay({ response }: ApiResponseDisplayProps) {
  const data = response as ScreeningResponse;

  // Check if there's an API-level error
  const hasApiError = data.error || (typeof data.message === "string" && !data.code);

  // Get overall status
  const overallStatus = getStatusConfig(data.code, data.status);
  const OverallIcon = overallStatus.icon;

  // Check for item-level errors
  const itemsWithErrors = (data.items || []).filter(
    (item) => item.code !== 1 || item.reason
  );

  return (
    <div className="space-y-4">
      {/* API Error Banner */}
      {hasApiError && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-800">API Error</p>
            <p className="text-sm text-red-700">
              {data.error?.message || data.message || "Unknown error occurred"}
            </p>
            {data.error?.code && (
              <p className="text-xs text-red-600 mt-1">
                Error Code: {data.error.code}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Overall Status Banner */}
      {data.code !== undefined && (
        <div
          className={`flex items-start gap-3 p-4 ${overallStatus.bgColor} border ${overallStatus.borderColor} rounded-lg`}
        >
          <OverallIcon
            className={`h-5 w-5 ${overallStatus.color} mt-0.5 flex-shrink-0`}
          />
          <div>
            <p className={`font-medium ${overallStatus.color}`}>
              Package Status: {overallStatus.label}
            </p>
            <p className="text-sm text-muted-foreground">
              Code: {data.code}
              {data.packageId && ` | Package ID: ${data.packageId}`}
            </p>
          </div>
        </div>
      )}

      {/* Item-level Errors */}
      {itemsWithErrors.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Item Results ({itemsWithErrors.length} item
            {itemsWithErrors.length !== 1 ? "s" : ""} with issues)
          </p>
          {itemsWithErrors.map((item, index) => {
            const itemStatus = getStatusConfig(item.code, item.status);
            const ItemIcon = itemStatus.icon;
            return (
              <div
                key={item.sku || item.reference || index}
                className={`flex items-start gap-3 p-3 ${itemStatus.bgColor} border ${itemStatus.borderColor} rounded-lg`}
              >
                <ItemIcon
                  className={`h-4 w-4 ${itemStatus.color} mt-0.5 flex-shrink-0`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium text-sm ${itemStatus.color}`}>
                      {itemStatus.label}
                    </span>
                    {item.sku && (
                      <span className="text-xs bg-white/50 px-2 py-0.5 rounded font-mono">
                        SKU: {item.sku}
                      </span>
                    )}
                  </div>
                  {item.reason && (
                    <div className="mt-1">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Reason:</span>{" "}
                        {item.reason.description}
                      </p>
                      {item.reason.code && (
                        <p className="text-xs text-gray-500">
                          Code: {item.reason.code}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Raw JSON (collapsible) */}
      <details className="group">
        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
          <span className="group-open:rotate-90 transition-transform">▶</span>
          View Raw JSON
        </summary>
        <pre className="mt-2 bg-muted p-4 rounded-lg overflow-auto text-xs">
          {JSON.stringify(response, null, 2)}
        </pre>
      </details>
    </div>
  );
}
