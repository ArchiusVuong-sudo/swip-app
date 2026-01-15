"use client";

import { useState } from "react";
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

const fieldGroups = {
  identifiers: {
    label: "Package Identifiers",
    fields: [
      { key: "external_id", label: "External ID" },
      { key: "house_bill_number", label: "House Bill Number" },
      { key: "barcode", label: "Barcode" },
      { key: "container_id", label: "Container ID" },
    ],
  },
  platform: {
    label: "Platform Information",
    fields: [
      { key: "platform_id", label: "Platform ID" },
      { key: "seller_id", label: "Seller ID" },
    ],
  },
  shipping: {
    label: "Shipping Details",
    fields: [
      { key: "export_country", label: "Export Country (ISO3)" },
      { key: "destination_country", label: "Destination Country (ISO3)" },
      { key: "weight_value", label: "Weight Value" },
      { key: "weight_unit", label: "Weight Unit (K/L)" },
      { key: "carrier_id", label: "Carrier ID" },
    ],
  },
  shipper: {
    label: "Shipper Address",
    fields: [
      { key: "shipper_name", label: "Name" },
      { key: "shipper_address_1", label: "Address Line 1" },
      { key: "shipper_address_2", label: "Address Line 2" },
      { key: "shipper_city", label: "City" },
      { key: "shipper_state", label: "State" },
      { key: "shipper_postal_code", label: "Postal Code" },
      { key: "shipper_country", label: "Country (ISO3)" },
      { key: "shipper_phone", label: "Phone" },
      { key: "shipper_email", label: "Email" },
    ],
  },
  consignee: {
    label: "Consignee Address",
    fields: [
      { key: "consignee_name", label: "Name" },
      { key: "consignee_address_1", label: "Address Line 1" },
      { key: "consignee_address_2", label: "Address Line 2" },
      { key: "consignee_city", label: "City" },
      { key: "consignee_state", label: "State" },
      { key: "consignee_postal_code", label: "Postal Code" },
      { key: "consignee_country", label: "Country (ISO3)" },
      { key: "consignee_phone", label: "Phone" },
      { key: "consignee_email", label: "Email" },
    ],
  },
  product: {
    label: "Product Details",
    fields: [
      { key: "product_sku", label: "SKU" },
      { key: "product_name", label: "Product Name" },
      { key: "product_description", label: "Description" },
      { key: "product_url", label: "Product URL" },
      { key: "product_categories", label: "Categories" },
      { key: "product_quantity", label: "Quantity" },
    ],
  },
  pricing: {
    label: "Pricing & Customs",
    fields: [
      { key: "declared_value", label: "Declared Value (USD)" },
      { key: "list_price", label: "List Price (USD)" },
      { key: "declared_name", label: "Declared Name" },
      { key: "origin_country", label: "Origin Country (ISO3)" },
      { key: "hs_code", label: "HS Code" },
      { key: "ean_upc", label: "EAN/UPC" },
      { key: "pieces", label: "Pieces" },
    ],
  },
  images: {
    label: "Product Images",
    fields: [
      { key: "product_image_url", label: "Image URL" },
      { key: "product_image_1", label: "Image 1 (URL/Base64)" },
      { key: "product_image_2", label: "Image 2 (URL/Base64)" },
      { key: "product_image_3", label: "Image 3 (URL/Base64)" },
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
