"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertTriangle,
  Save,
  X,
  RefreshCw,
  Loader2,
  Package,
} from "lucide-react";

interface PackageData {
  id: string;
  external_id: string;
  status: string;
  screening_status?: string;
  screening_code?: number;
  platform_id: string;
  seller_id: string;
  shipper_name: string;
  shipper_line1: string;
  shipper_line2?: string;
  shipper_city: string;
  shipper_state: string;
  shipper_postal_code: string;
  shipper_country: string;
  shipper_phone?: string;
  shipper_email?: string;
  consignee_name: string;
  consignee_line1: string;
  consignee_line2?: string;
  consignee_city: string;
  consignee_state: string;
  consignee_postal_code: string;
  consignee_country: string;
  consignee_phone?: string;
  consignee_email?: string;
  weight_value: number;
  weight_unit: string;
  export_country: string;
  destination_country: string;
  [key: string]: string | number | undefined;
}

interface PackageCorrectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (corrections: Partial<PackageData>, notes: string) => Promise<void>;
  packageData: PackageData;
  isSubmitting?: boolean;
}

interface FieldConfig {
  key: string;
  label: string;
  editable: boolean;
  type?: string;
}

interface FieldGroup {
  label: string;
  fields: FieldConfig[];
}

const fieldGroups: Record<string, FieldGroup> = {
  identifiers: {
    label: "Package Identifiers",
    fields: [
      { key: "external_id", label: "External ID", editable: false },
      { key: "platform_id", label: "Platform ID", editable: true },
      { key: "seller_id", label: "Seller ID", editable: true },
    ],
  },
  shipping: {
    label: "Shipping Details",
    fields: [
      { key: "export_country", label: "Export Country (ISO3)", editable: true },
      { key: "destination_country", label: "Destination Country (ISO3)", editable: true },
      { key: "weight_value", label: "Weight Value", editable: true, type: "number" },
      { key: "weight_unit", label: "Weight Unit (K/L)", editable: true },
    ],
  },
  shipper: {
    label: "Shipper Address",
    fields: [
      { key: "shipper_name", label: "Name", editable: true },
      { key: "shipper_line1", label: "Address Line 1", editable: true },
      { key: "shipper_line2", label: "Address Line 2", editable: true },
      { key: "shipper_city", label: "City", editable: true },
      { key: "shipper_state", label: "State", editable: true },
      { key: "shipper_postal_code", label: "Postal Code", editable: true },
      { key: "shipper_country", label: "Country (ISO3)", editable: true },
      { key: "shipper_phone", label: "Phone", editable: true },
      { key: "shipper_email", label: "Email", editable: true },
    ],
  },
  consignee: {
    label: "Consignee Address",
    fields: [
      { key: "consignee_name", label: "Name", editable: true },
      { key: "consignee_line1", label: "Address Line 1", editable: true },
      { key: "consignee_line2", label: "Address Line 2", editable: true },
      { key: "consignee_city", label: "City", editable: true },
      { key: "consignee_state", label: "State", editable: true },
      { key: "consignee_postal_code", label: "Postal Code", editable: true },
      { key: "consignee_country", label: "Country (ISO3)", editable: true },
      { key: "consignee_phone", label: "Phone", editable: true },
      { key: "consignee_email", label: "Email", editable: true },
    ],
  },
};

const statusInfo: Record<string, { label: string; description: string; canResubmit: boolean }> = {
  rejected: {
    label: "Rejected",
    description: "This package was rejected during screening. Review and correct the data before resubmitting.",
    canResubmit: true,
  },
  inconclusive: {
    label: "Inconclusive",
    description: "Screening was inconclusive. You may correct and resubmit with additional information.",
    canResubmit: true,
  },
  audit_required: {
    label: "Audit Required",
    description: "This package requires audit. You can correct data and resubmit after providing audit materials.",
    canResubmit: true,
  },
};

export function PackageCorrectionDialog({
  isOpen,
  onClose,
  onSubmit,
  packageData,
  isSubmitting = false,
}: PackageCorrectionDialogProps) {
  const [corrections, setCorrections] = useState<Partial<PackageData>>({});
  const [correctionNotes, setCorrectionNotes] = useState("");

  const status = statusInfo[packageData.status] || statusInfo.rejected;

  const handleFieldChange = (key: string, value: string | number) => {
    setCorrections((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const getCurrentValue = (key: string): string | number | undefined => {
    if (corrections[key] !== undefined) return corrections[key];
    return packageData[key];
  };

  const hasChanges = Object.keys(corrections).length > 0;

  const handleSubmit = async () => {
    if (!hasChanges || !correctionNotes.trim()) return;
    await onSubmit(corrections, correctionNotes);
  };

  const handleClose = () => {
    setCorrections({});
    setCorrectionNotes("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Correct & Resubmit Package
          </DialogTitle>
          <DialogDescription>
            Make corrections to the package data and resubmit for screening.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Status Warning */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-yellow-800">{status.label}</p>
                    <Badge variant="outline" className="text-xs">
                      Code: {packageData.screening_code || "N/A"}
                    </Badge>
                  </div>
                  <p className="text-sm text-yellow-600">{status.description}</p>
                </div>
              </div>
            </div>

            {/* Original Screening Status */}
            {packageData.screening_status && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <span className="text-muted-foreground">Original Status: </span>
                <span className="font-medium">{packageData.screening_status}</span>
              </div>
            )}

            {/* Editable Fields */}
            <Accordion
              type="multiple"
              defaultValue={["shipper", "consignee"]}
              className="w-full"
            >
              {Object.entries(fieldGroups).map(([groupKey, group]) => (
                <AccordionItem key={groupKey} value={groupKey}>
                  <AccordionTrigger className="text-sm font-medium">
                    {group.label}
                    {group.fields.some(
                      (f) => corrections[f.key] !== undefined
                    ) && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Modified
                      </Badge>
                    )}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-4 py-2">
                      {group.fields.map((field) => {
                        const isModified = corrections[field.key] !== undefined;
                        const currentValue = getCurrentValue(field.key);

                        return (
                          <div key={field.key} className="grid gap-2">
                            <Label
                              htmlFor={field.key}
                              className={isModified ? "text-blue-600" : ""}
                            >
                              {field.label}
                              {isModified && (
                                <span className="text-xs ml-2">(modified)</span>
                              )}
                            </Label>
                            <Input
                              id={field.key}
                              type={field.type || "text"}
                              value={String(currentValue || "")}
                              onChange={(e) =>
                                handleFieldChange(
                                  field.key,
                                  field.type === "number"
                                    ? parseFloat(e.target.value)
                                    : e.target.value
                                )
                              }
                              disabled={!field.editable}
                              className={isModified ? "border-blue-400" : ""}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {/* Changes Summary */}
            {hasChanges && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="font-medium text-blue-800 mb-2">
                  Pending Corrections ({Object.keys(corrections).length}):
                </p>
                <div className="space-y-1 text-sm">
                  {Object.entries(corrections).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-blue-600">{key}:</span>
                      <span className="line-through text-red-500">
                        {String(packageData[key] || "(empty)")}
                      </span>
                      <span>→</span>
                      <span className="text-green-600 font-medium">
                        {String(value || "(empty)")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Correction Notes */}
            <div className="space-y-2">
              <Label htmlFor="correction-notes">
                Correction Notes <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="correction-notes"
                placeholder="Explain the corrections made and why (required for audit trail)..."
                value={correctionNotes}
                onChange={(e) => setCorrectionNotes(e.target.value)}
                rows={3}
              />
              {!correctionNotes.trim() && hasChanges && (
                <p className="text-xs text-red-500">
                  Please provide notes explaining the corrections
                </p>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasChanges || !correctionNotes.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resubmitting...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Correct & Resubmit
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
