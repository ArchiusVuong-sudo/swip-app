"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Save, X, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import { CSV_COLUMNS } from "@/lib/csv/constants";
import { cn } from "@/lib/utils";

interface RowData {
  [key: string]: string | number | undefined;
}

interface InlineRowEditorProps {
  row: RowData;
  rowIndex: number;
  onSave: (rowIndex: number, updatedRow: RowData) => void;
  onCancel: () => void;
  errors?: Array<{ field: string; message: string }>;
}

// Field groups with CSV column mappings
const fieldGroups = {
  identifiers: {
    label: "Package Identifiers",
    fields: [
      { key: CSV_COLUMNS.EXTERNAL_ID, label: "External ID" },
      { key: CSV_COLUMNS.HOUSE_BILL_NUMBER, label: "House Bill Number" },
      { key: CSV_COLUMNS.BARCODE, label: "Barcode" },
      { key: CSV_COLUMNS.CONTAINER_ID, label: "Container ID" },
    ],
  },
  platform: {
    label: "Platform Information",
    fields: [
      { key: CSV_COLUMNS.PLATFORM_ID, label: "Platform ID" },
      { key: CSV_COLUMNS.SELLER_ID, label: "Seller ID" },
    ],
  },
  shipping: {
    label: "Shipping Details",
    fields: [
      { key: CSV_COLUMNS.EXPORT_COUNTRY, label: "Export Country (ISO3)" },
      { key: CSV_COLUMNS.DESTINATION_COUNTRY, label: "Destination Country (ISO3)" },
      { key: CSV_COLUMNS.GROSS_WEIGHT_VALUE, label: "Weight Value" },
      { key: CSV_COLUMNS.GROSS_WEIGHT_UNIT, label: "Weight Unit (K/L)" },
      { key: CSV_COLUMNS.CARRIER_ID, label: "Carrier ID" },
    ],
  },
  shipper: {
    label: "Shipper Address",
    fields: [
      { key: CSV_COLUMNS.SHIPPER_NAME, label: "Name" },
      { key: CSV_COLUMNS.SHIPPER_ADDRESS_1, label: "Address Line 1" },
      { key: CSV_COLUMNS.SHIPPER_ADDRESS_2, label: "Address Line 2" },
      { key: CSV_COLUMNS.SHIPPER_CITY, label: "City" },
      { key: CSV_COLUMNS.SHIPPER_STATE, label: "State" },
      { key: CSV_COLUMNS.SHIPPER_POSTAL_CODE, label: "Postal Code" },
      { key: CSV_COLUMNS.SHIPPER_COUNTRY, label: "Country (ISO3)" },
      { key: CSV_COLUMNS.SHIPPER_PHONE, label: "Phone" },
      { key: CSV_COLUMNS.SHIPPER_EMAIL, label: "Email" },
    ],
  },
  consignee: {
    label: "Consignee Address",
    fields: [
      { key: CSV_COLUMNS.CONSIGNEE_NAME, label: "Name" },
      { key: CSV_COLUMNS.CONSIGNEE_ADDRESS_1, label: "Address Line 1" },
      { key: CSV_COLUMNS.CONSIGNEE_ADDRESS_2, label: "Address Line 2" },
      { key: CSV_COLUMNS.CONSIGNEE_CITY, label: "City" },
      { key: CSV_COLUMNS.CONSIGNEE_STATE, label: "State" },
      { key: CSV_COLUMNS.CONSIGNEE_POSTAL_CODE, label: "Postal Code" },
      { key: CSV_COLUMNS.CONSIGNEE_COUNTRY, label: "Country (ISO3)" },
      { key: CSV_COLUMNS.CONSIGNEE_PHONE, label: "Phone" },
      { key: CSV_COLUMNS.CONSIGNEE_EMAIL, label: "Email" },
    ],
  },
  product: {
    label: "Product Details",
    fields: [
      { key: CSV_COLUMNS.PRODUCT_SKU, label: "SKU" },
      { key: CSV_COLUMNS.PRODUCT_NAME, label: "Product Name" },
      { key: CSV_COLUMNS.PRODUCT_DECLARED_NAME, label: "Declared Name" },
      { key: CSV_COLUMNS.PRODUCT_DESCRIPTION, label: "Description" },
      { key: CSV_COLUMNS.PRODUCT_URL, label: "Product URL" },
      { key: CSV_COLUMNS.PRODUCT_CATEGORIES, label: "Categories" },
      { key: CSV_COLUMNS.PRODUCT_QUANTITY, label: "Quantity" },
    ],
  },
  pricing: {
    label: "Pricing & Customs",
    fields: [
      { key: CSV_COLUMNS.DECLARED_VALUE, label: "Declared Value (USD)" },
      { key: CSV_COLUMNS.LIST_PRICE, label: "List Price (USD)" },
      { key: CSV_COLUMNS.ORIGIN_COUNTRY, label: "Origin Country (ISO3)" },
      { key: CSV_COLUMNS.HS_CODE, label: "HS Code" },
      { key: CSV_COLUMNS.EAN_UPC, label: "EAN/UPC" },
      { key: CSV_COLUMNS.NUMBER_OF_PIECES, label: "Pieces" },
    ],
  },
  images: {
    label: "Product Images",
    fields: [
      { key: CSV_COLUMNS.PRODUCT_IMAGE_URL, label: "Image URL" },
      { key: CSV_COLUMNS.PRODUCT_IMAGE_1, label: "Image 1 (Base64)" },
      { key: CSV_COLUMNS.PRODUCT_IMAGE_2, label: "Image 2 (Base64)" },
      { key: CSV_COLUMNS.PRODUCT_IMAGE_3, label: "Image 3 (Base64)" },
    ],
  },
};

export function InlineRowEditor({
  row,
  rowIndex,
  onSave,
  onCancel,
  errors = [],
}: InlineRowEditorProps) {
  const [editedRow, setEditedRow] = useState<RowData>({ ...row });
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    // Auto-expand groups that have errors
    const groupsWithErrors = new Set<string>();
    for (const [groupKey, group] of Object.entries(fieldGroups)) {
      if (group.fields.some((f) => errors.some((e) => e.field === f.key))) {
        groupsWithErrors.add(groupKey);
      }
    }
    return Array.from(groupsWithErrors);
  });

  useEffect(() => {
    setEditedRow({ ...row });
  }, [row]);

  const handleFieldChange = (key: string, value: string) => {
    setEditedRow((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    onSave(rowIndex, editedRow);
  };

  const getFieldError = (fieldKey: string) => {
    return errors.find((e) => e.field === fieldKey)?.message;
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupKey)
        ? prev.filter((g) => g !== groupKey)
        : [...prev, groupKey]
    );
  };

  const groupHasErrors = (groupKey: string) => {
    const group = fieldGroups[groupKey as keyof typeof fieldGroups];
    return group.fields.some((f) => getFieldError(f.key));
  };

  return (
    <div className="bg-white border-2 border-blue-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-blue-50">
        <div className="flex items-center gap-2">
          <span className="font-medium text-blue-900">Editing Row {rowIndex + 1}</span>
          {errors.length > 0 && (
            <span className="text-sm text-red-600">
              ({errors.length} error{errors.length !== 1 ? "s" : ""} to fix)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
        </div>
      </div>

      {/* Field Groups */}
      <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
        {Object.entries(fieldGroups).map(([groupKey, group]) => {
          const isExpanded = expandedGroups.includes(groupKey);
          const hasErrors = groupHasErrors(groupKey);

          return (
            <Collapsible
              key={groupKey}
              open={isExpanded}
              onOpenChange={() => toggleGroup(groupKey)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start p-3 h-auto",
                    hasErrors && "bg-red-50 hover:bg-red-100"
                  )}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 mr-2" />
                  ) : (
                    <ChevronRight className="h-4 w-4 mr-2" />
                  )}
                  <span className="font-medium">{group.label}</span>
                  {hasErrors && (
                    <AlertCircle className="h-4 w-4 ml-2 text-red-500" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-b-lg">
                  {group.fields.map((field) => {
                    const error = getFieldError(field.key);
                    return (
                      <div key={field.key} className="space-y-1">
                        <Label
                          htmlFor={`${rowIndex}-${field.key}`}
                          className={cn(
                            "text-xs",
                            error ? "text-red-600 font-medium" : "text-gray-600"
                          )}
                        >
                          {field.label}
                        </Label>
                        <Input
                          id={`${rowIndex}-${field.key}`}
                          value={String(editedRow[field.key] || "")}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          className={cn(
                            "h-9 text-sm",
                            error && "border-red-500 focus-visible:ring-red-500"
                          )}
                        />
                        {error && (
                          <p className="text-xs text-red-500">{error}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
