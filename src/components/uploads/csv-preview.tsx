"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  TableIcon,
} from "lucide-react";
import type { FileValidationResult, RowValidationResult } from "@/lib/validation/schemas";

interface EnhancedRow extends Record<string, string | number | boolean | undefined> {
  _rowIndex: number;
  _hasError: boolean;
}

interface CSVPreviewProps {
  result: FileValidationResult;
  onRowClick?: (rowIndex: number) => void;
}

// Group columns for better organization
const columnGroups = {
  identifiers: ["external_id", "house_bill_number", "barcode", "container_id"],
  platform: ["platform_id", "seller_id"],
  shipping: ["export_country", "destination_country", "weight_value", "weight_unit", "carrier_id"],
  shipper: [
    "shipper_name", "shipper_address_1", "shipper_address_2",
    "shipper_city", "shipper_state", "shipper_postal_code",
    "shipper_country", "shipper_phone", "shipper_email"
  ],
  consignee: [
    "consignee_name", "consignee_address_1", "consignee_address_2",
    "consignee_city", "consignee_state", "consignee_postal_code",
    "consignee_country", "consignee_phone", "consignee_email"
  ],
  product: [
    "product_sku", "product_name", "product_description",
    "product_url", "product_categories", "product_quantity"
  ],
  pricing: [
    "declared_value", "list_price", "declared_name",
    "origin_country", "hs_code", "ean_upc", "pieces"
  ],
};

type ColumnGroup = keyof typeof columnGroups | "all";

export function CSVPreview({ result, onRowClick }: CSVPreviewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedGroup, setSelectedGroup] = useState<ColumnGroup>("all");
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);

  // Get all column headers
  const headers = useMemo(() => {
    if (!result.rows || result.rows.length === 0) return [];
    return Object.keys(result.rows[0]);
  }, [result.rows]);

  // Filter columns based on selected group
  const visibleColumns = useMemo(() => {
    if (selectedGroup === "all") return headers;
    const groupColumns = columnGroups[selectedGroup] || [];
    return headers.filter((h) => groupColumns.includes(h));
  }, [headers, selectedGroup]);

  // Create a map of row errors for quick lookup
  const rowErrorsMap = useMemo(() => {
    const map = new Map<number, RowValidationResult>();
    result.results.forEach((r) => {
      if (!r.isValid) {
        map.set(r.rowNumber - 1, r);
      }
    });
    return map;
  }, [result.results]);

  // Filter and paginate rows
  const filteredRows = useMemo((): EnhancedRow[] => {
    if (!result.rows) return [];

    let rows: EnhancedRow[] = result.rows.map((row, index) => ({
      ...row,
      _rowIndex: index,
      _hasError: rowErrorsMap.has(index),
    }));

    // Filter by errors
    if (showOnlyErrors) {
      rows = rows.filter((r) => r._hasError);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      rows = rows.filter((row) =>
        Object.values(row).some(
          (val) => val && String(val).toLowerCase().includes(term)
        )
      );
    }

    return rows;
  }, [result.rows, searchTerm, showOnlyErrors, rowErrorsMap]);

  // Pagination
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, currentPage, rowsPerPage]);

  // Reset to first page when filters change
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const handleShowOnlyErrors = () => {
    setShowOnlyErrors(!showOnlyErrors);
    setCurrentPage(1);
  };

  // Get field error for a cell
  const getCellError = (rowIndex: number, field: string) => {
    const rowResult = rowErrorsMap.get(rowIndex);
    if (!rowResult) return null;
    return rowResult.errors.find((e) => e.field === field);
  };

  // Truncate long values for display
  const truncateValue = (value: string | undefined, maxLength = 30) => {
    if (!value) return "-";
    if (value.length <= maxLength) return value;
    return value.substring(0, maxLength) + "...";
  };

  if (!result.rows || result.rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TableIcon className="h-5 w-5" />
            CSV Preview
          </CardTitle>
          <CardDescription>No data to display</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TableIcon className="h-5 w-5" />
              CSV Preview
            </CardTitle>
            <CardDescription>
              Showing {filteredRows.length} of {result.totalRows} rows
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={result.isValid ? "default" : "destructive"} className="gap-1">
              {result.isValid ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              {result.validRows} valid / {result.invalidRows} invalid
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search in data..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select
            value={selectedGroup}
            onValueChange={(val) => setSelectedGroup(val as ColumnGroup)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Column group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Columns</SelectItem>
              <SelectItem value="identifiers">Identifiers</SelectItem>
              <SelectItem value="platform">Platform</SelectItem>
              <SelectItem value="shipping">Shipping</SelectItem>
              <SelectItem value="shipper">Shipper</SelectItem>
              <SelectItem value="consignee">Consignee</SelectItem>
              <SelectItem value="product">Product</SelectItem>
              <SelectItem value="pricing">Pricing</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={showOnlyErrors ? "destructive" : "outline"}
            size="sm"
            onClick={handleShowOnlyErrors}
          >
            <XCircle className="h-4 w-4 mr-1" />
            {showOnlyErrors ? "Showing Errors" : "Show Errors Only"}
          </Button>

          <Select
            value={String(rowsPerPage)}
            onValueChange={(val) => {
              setRowsPerPage(Number(val));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 rows</SelectItem>
              <SelectItem value="25">25 rows</SelectItem>
              <SelectItem value="50">50 rows</SelectItem>
              <SelectItem value="100">100 rows</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <ScrollArea className="w-full">
            <div className="min-w-max">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[60px] sticky left-0 bg-muted/50 z-10">
                      Row
                    </TableHead>
                    <TableHead className="w-[60px] sticky left-[60px] bg-muted/50 z-10">
                      Status
                    </TableHead>
                    {visibleColumns.map((header) => (
                      <TableHead
                        key={header}
                        className="min-w-[120px] max-w-[200px]"
                      >
                        <span className="truncate block" title={header}>
                          {header}
                        </span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={visibleColumns.length + 2}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No matching rows found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRows.map((row) => {
                      const rowIndex = row._rowIndex as number;
                      const hasError = row._hasError;

                      return (
                        <TableRow
                          key={rowIndex}
                          className={`
                            ${hasError ? "bg-red-50 hover:bg-red-100" : "hover:bg-muted/50"}
                            ${onRowClick ? "cursor-pointer" : ""}
                          `}
                          onClick={() => onRowClick?.(rowIndex)}
                        >
                          <TableCell className="font-mono text-xs sticky left-0 bg-inherit z-10">
                            {rowIndex + 1}
                          </TableCell>
                          <TableCell className="sticky left-[60px] bg-inherit z-10">
                            {hasError ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                          </TableCell>
                          {visibleColumns.map((col) => {
                            const cellError = getCellError(rowIndex, col);
                            const value = row[col] as string | undefined;

                            return (
                              <TableCell
                                key={col}
                                className={`text-xs ${cellError ? "text-red-600 font-medium" : ""}`}
                                title={cellError ? `Error: ${cellError.message}` : value}
                              >
                                <span
                                  className={`
                                    ${cellError ? "border-b border-dashed border-red-400" : ""}
                                  `}
                                >
                                  {truncateValue(value)}
                                </span>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
