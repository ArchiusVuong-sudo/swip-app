"use client";

import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Pencil,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InlineRowEditor } from "./inline-row-editor";
import type { FileValidationResult, RowValidationResult } from "@/lib/validation/schemas";

interface RowData {
  [key: string]: string | number | undefined;
}

interface ValidationResultsProps {
  result: FileValidationResult;
  onRowUpdate?: (rowIndex: number, updatedRow: RowData) => void;
}

interface RowErrorsProps {
  row: RowValidationResult;
  isEditing: boolean;
  onEdit?: () => void;
  onSave?: (rowIndex: number, updatedRow: RowData) => void;
  onCancel?: () => void;
  rowData?: RowData;
}

function RowErrors({ row, isEditing, onEdit, onSave, onCancel, rowData }: RowErrorsProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (isEditing && rowData && onSave && onCancel) {
    return (
      <div className="p-2">
        <InlineRowEditor
          row={rowData}
          rowIndex={row.rowNumber - 1}
          onSave={onSave}
          onCancel={onCancel}
          errors={row.errors.map((e) => ({
            field: e.field,
            message: e.message,
          }))}
        />
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-3 h-auto hover:bg-red-50"
        >
          <div className="flex items-center gap-3">
            <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <span className="text-sm font-medium">Row {row.rowNumber}</span>
            <Badge variant="destructive" className="ml-2">
              {row.errors.length} error{row.errors.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-10 pb-3 space-y-2">
          {row.errors.map((error, index) => (
            <div
              key={index}
              className="flex items-start gap-2 text-sm bg-red-50 p-2 rounded"
            >
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium text-red-800">{error.field}:</span>{" "}
                <span className="text-red-600">{error.message}</span>
                {error.value !== undefined && error.value !== null && (
                  <span className="text-red-400 ml-2">
                    (value: {String(error.value)})
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ValidationResults({ result, onRowUpdate }: ValidationResultsProps) {
  const invalidRows = result.results.filter((r) => !r.isValid);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);

  const handleEditRow = (row: RowValidationResult) => {
    setEditingRowIndex(row.rowNumber - 1);
  };

  const handleSaveRow = (rowIndex: number, updatedRow: RowData) => {
    if (onRowUpdate) {
      onRowUpdate(rowIndex, updatedRow);
    }
    setEditingRowIndex(null);
  };

  const handleCancelEdit = () => {
    setEditingRowIndex(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Validation Results</CardTitle>
            <CardDescription>
              {result.totalRows} rows processed
            </CardDescription>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">
                {result.validRows} valid
              </span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-sm font-medium">
                {result.invalidRows} invalid
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Missing Columns Warning */}
        {result.missingColumns.length > 0 && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">
                  Missing Required Columns
                </p>
                <p className="text-sm text-yellow-600 mt-1">
                  The following columns are required but missing from your CSV:
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {result.missingColumns.map((col) => (
                    <Badge key={col} variant="outline" className="text-yellow-700">
                      {col}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Validation Summary */}
        {result.isValid ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">
                  All rows validated successfully!
                </p>
                <p className="text-sm text-green-600">
                  Your CSV file is ready to be processed.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800">
                    Validation errors found
                  </p>
                  <p className="text-sm text-red-600">
                    Please fix the errors below before processing. Click &quot;Edit&quot; to make inline changes.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Details */}
            {invalidRows.length > 0 && (
              <div className="border rounded-lg">
                <ScrollArea className={editingRowIndex !== null ? "max-h-[600px]" : "h-[300px]"}>
                  <div className="divide-y">
                    {invalidRows.map((row) => {
                      const rowIndex = row.rowNumber - 1;
                      const isEditing = editingRowIndex === rowIndex;
                      const rowData = result.rows?.[rowIndex] || {};

                      return (
                        <RowErrors
                          key={row.rowNumber}
                          row={row}
                          isEditing={isEditing}
                          onEdit={onRowUpdate ? () => handleEditRow(row) : undefined}
                          onSave={handleSaveRow}
                          onCancel={handleCancelEdit}
                          rowData={rowData}
                        />
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
