"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, X } from "lucide-react";
import { CSV_COLUMNS } from "@/lib/csv/constants";

interface RowData {
  [key: string]: string | number | undefined;
}

interface RowEditorProps {
  row: RowData;
  rowIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (rowIndex: number, updatedRow: RowData) => void;
  errors?: Array<{ field: string; message: string }>;
}

// Use actual CSV column names as keys
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

export function RowEditor({
  row,
  rowIndex,
  isOpen,
  onClose,
  onSave,
  errors = [],
}: RowEditorProps) {
  const [editedRow, setEditedRow] = useState<RowData>({ ...row });

  // Sync state when row prop changes (e.g., when opening editor for a different row)
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
    onClose();
  };

  const getFieldError = (fieldKey: string) => {
    return errors.find((e) => e.field === fieldKey)?.message;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Row {rowIndex + 1}</DialogTitle>
          <DialogDescription>
            Review and correct any validation errors before submission.
            {errors.length > 0 && (
              <span className="text-red-500 ml-2">
                ({errors.length} error{errors.length !== 1 ? "s" : ""})
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <Accordion
            type="multiple"
            defaultValue={["identifiers", "shipper", "consignee", "product"]}
            className="w-full"
          >
            {Object.entries(fieldGroups).map(([groupKey, group]) => (
              <AccordionItem key={groupKey} value={groupKey}>
                <AccordionTrigger className="text-sm font-medium">
                  {group.label}
                  {group.fields.some((f) => getFieldError(f.key)) && (
                    <span className="ml-2 text-red-500 text-xs">
                      (has errors)
                    </span>
                  )}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-4 py-2">
                    {group.fields.map((field) => {
                      const error = getFieldError(field.key);
                      return (
                        <div key={field.key} className="grid gap-2">
                          <Label
                            htmlFor={field.key}
                            className={error ? "text-red-500" : ""}
                          >
                            {field.label}
                          </Label>
                          <Input
                            id={field.key}
                            value={String(editedRow[field.key] || "")}
                            onChange={(e) =>
                              handleFieldChange(field.key, e.target.value)
                            }
                            className={error ? "border-red-500" : ""}
                          />
                          {error && (
                            <p className="text-xs text-red-500">{error}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
