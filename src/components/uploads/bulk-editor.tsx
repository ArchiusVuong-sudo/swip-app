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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Save,
  X,
  Pencil,
  CheckSquare,
  Square,
  AlertTriangle,
} from "lucide-react";
import type { FileValidationResult, RowValidationResult } from "@/lib/validation/schemas";

interface BulkEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Map<number, Record<string, string>>) => void;
  validationResult: FileValidationResult;
}

// Common fields that are often edited in bulk
const bulkEditableFields = [
  { key: "platform_id", label: "Platform ID", group: "platform" },
  { key: "seller_id", label: "Seller ID", group: "platform" },
  { key: "export_country", label: "Export Country", group: "shipping" },
  { key: "destination_country", label: "Destination Country", group: "shipping" },
  { key: "weight_unit", label: "Weight Unit", group: "shipping" },
  { key: "shipper_country", label: "Shipper Country", group: "shipper" },
  { key: "shipper_state", label: "Shipper State", group: "shipper" },
  { key: "consignee_country", label: "Consignee Country", group: "consignee" },
  { key: "consignee_state", label: "Consignee State", group: "consignee" },
  { key: "origin_country", label: "Origin Country", group: "product" },
];

export function BulkEditor({
  isOpen,
  onClose,
  onSave,
  validationResult,
}: BulkEditorProps) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectedField, setSelectedField] = useState<string>("");
  const [newValue, setNewValue] = useState<string>("");
  const [pendingChanges, setPendingChanges] = useState<
    Map<number, Record<string, string>>
  >(new Map());
  const [showOnlyErrors, setShowOnlyErrors] = useState(true);

  // Get rows with errors
  const errorRowIndices = useMemo(() => {
    const indices = new Set<number>();
    validationResult.results.forEach((r) => {
      if (!r.isValid) {
        indices.add(r.rowNumber - 1);
      }
    });
    return indices;
  }, [validationResult.results]);

  // Filter rows based on showOnlyErrors
  const displayRows = useMemo(() => {
    if (!validationResult.rows) return [];
    return validationResult.rows
      .map((row, index) => ({ row, index }))
      .filter(({ index }) => !showOnlyErrors || errorRowIndices.has(index));
  }, [validationResult.rows, showOnlyErrors, errorRowIndices]);

  // Get errors for a specific row
  const getRowErrors = (rowIndex: number): RowValidationResult | undefined => {
    return validationResult.results.find((r) => r.rowNumber === rowIndex + 1);
  };

  // Check if a field has an error in the row
  const hasFieldError = (rowIndex: number, field: string): boolean => {
    const rowResult = getRowErrors(rowIndex);
    return rowResult?.errors.some((e) => e.field === field) || false;
  };

  // Toggle row selection
  const toggleRow = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  // Select all visible rows
  const selectAll = () => {
    const allIndices = new Set(displayRows.map((r) => r.index));
    setSelectedRows(allIndices);
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedRows(new Set());
  };

  // Apply change to selected rows
  const applyChange = () => {
    if (!selectedField || selectedRows.size === 0) return;

    const newPendingChanges = new Map(pendingChanges);
    selectedRows.forEach((rowIndex) => {
      const existing = newPendingChanges.get(rowIndex) || {};
      newPendingChanges.set(rowIndex, {
        ...existing,
        [selectedField]: newValue,
      });
    });
    setPendingChanges(newPendingChanges);
    setNewValue("");
  };

  // Remove pending change for a row/field
  const removePendingChange = (rowIndex: number, field: string) => {
    const newPendingChanges = new Map(pendingChanges);
    const rowChanges = newPendingChanges.get(rowIndex);
    if (rowChanges) {
      delete rowChanges[field];
      if (Object.keys(rowChanges).length === 0) {
        newPendingChanges.delete(rowIndex);
      } else {
        newPendingChanges.set(rowIndex, rowChanges);
      }
    }
    setPendingChanges(newPendingChanges);
  };

  // Get the current value (pending or original)
  const getCurrentValue = (rowIndex: number, field: string): string => {
    const pending = pendingChanges.get(rowIndex)?.[field];
    if (pending !== undefined) return pending;
    return String(validationResult.rows?.[rowIndex]?.[field] || "");
  };

  // Save all changes
  const handleSave = () => {
    onSave(pendingChanges);
    setPendingChanges(new Map());
    setSelectedRows(new Set());
    onClose();
  };

  // Count total pending changes
  const totalPendingChanges = useMemo(() => {
    let count = 0;
    pendingChanges.forEach((changes) => {
      count += Object.keys(changes).length;
    });
    return count;
  }, [pendingChanges]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Bulk Edit Rows
          </DialogTitle>
          <DialogDescription>
            Select rows and apply changes to multiple fields at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground">Field</Label>
              <Select value={selectedField} onValueChange={setSelectedField}>
                <SelectTrigger>
                  <SelectValue placeholder="Select field to edit" />
                </SelectTrigger>
                <SelectContent>
                  {bulkEditableFields.map((field) => (
                    <SelectItem key={field.key} value={field.key}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground">New Value</Label>
              <Input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Enter new value"
              />
            </div>
            <Button
              onClick={applyChange}
              disabled={!selectedField || selectedRows.size === 0}
            >
              Apply to {selectedRows.size} row{selectedRows.size !== 1 ? "s" : ""}
            </Button>
          </div>

          {/* Selection controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={selectAll}>
                <CheckSquare className="h-4 w-4 mr-1" />
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                <Square className="h-4 w-4 mr-1" />
                Deselect All
              </Button>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-errors"
                  checked={showOnlyErrors}
                  onCheckedChange={(checked) =>
                    setShowOnlyErrors(checked === true)
                  }
                />
                <Label htmlFor="show-errors" className="text-sm cursor-pointer">
                  Show only rows with errors
                </Label>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedRows.size} selected • {totalPendingChanges} pending
              changes
            </div>
          </div>

          {/* Pending changes summary */}
          {totalPendingChanges > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-800 mb-2">
                Pending Changes:
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from(pendingChanges.entries()).map(
                  ([rowIndex, changes]) =>
                    Object.entries(changes).map(([field, value]) => (
                      <Badge
                        key={`${rowIndex}-${field}`}
                        variant="secondary"
                        className="gap-1"
                      >
                        Row {rowIndex + 1}: {field} = "{value}"
                        <button
                          onClick={() => removePendingChange(rowIndex, field)}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))
                )}
              </div>
            </div>
          )}

          {/* Table */}
          <ScrollArea className="h-[400px] border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[50px] sticky left-0 bg-muted/50">
                    <Checkbox
                      checked={
                        displayRows.length > 0 &&
                        displayRows.every((r) => selectedRows.has(r.index))
                      }
                      onCheckedChange={(checked) =>
                        checked ? selectAll() : deselectAll()
                      }
                    />
                  </TableHead>
                  <TableHead className="w-[60px]">Row</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  {bulkEditableFields.slice(0, 6).map((field) => (
                    <TableHead key={field.key} className="min-w-[120px]">
                      {field.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {showOnlyErrors
                        ? "No rows with errors"
                        : "No rows to display"}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayRows.map(({ row, index }) => {
                    const hasError = errorRowIndices.has(index);
                    const isSelected = selectedRows.has(index);
                    const hasPending = pendingChanges.has(index);

                    return (
                      <TableRow
                        key={index}
                        className={`
                          ${hasError ? "bg-red-50" : ""}
                          ${isSelected ? "bg-blue-50" : ""}
                          ${hasPending ? "bg-yellow-50" : ""}
                        `}
                      >
                        <TableCell className="sticky left-0 bg-inherit">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleRow(index)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          {hasError ? (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Error
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Valid
                            </Badge>
                          )}
                        </TableCell>
                        {bulkEditableFields.slice(0, 6).map((field) => {
                          const currentValue = getCurrentValue(index, field.key);
                          const isPending = pendingChanges
                            .get(index)
                            ?.hasOwnProperty(field.key);
                          const fieldHasError = hasFieldError(index, field.key);

                          return (
                            <TableCell
                              key={field.key}
                              className={`text-xs ${
                                fieldHasError ? "text-red-600" : ""
                              } ${isPending ? "font-medium text-blue-600" : ""}`}
                            >
                              {currentValue || "-"}
                              {isPending && (
                                <span className="text-xs text-blue-400 ml-1">
                                  (changed)
                                </span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={totalPendingChanges === 0}>
            <Save className="mr-2 h-4 w-4" />
            Save {totalPendingChanges} Change{totalPendingChanges !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
