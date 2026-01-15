"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface CSVDropzoneProps {
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  selectedFile: File | null;
  isProcessing?: boolean;
  progress?: number;
}

export function CSVDropzone({
  onFileSelect,
  onFileRemove,
  selectedFile,
  isProcessing = false,
  progress = 0,
}: CSVDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: {
        "text/csv": [".csv"],
        "application/vnd.ms-excel": [".csv"],
      },
      maxFiles: 1,
      disabled: isProcessing,
    });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (selectedFile) {
    return (
      <div className="border-2 border-dashed border-green-300 bg-green-50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-900">{selectedFile.name}</p>
              <p className="text-sm text-green-600">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
          </div>
          {!isProcessing && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onFileRemove();
              }}
              className="text-green-600 hover:text-green-800 hover:bg-green-100"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {isProcessing && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-green-600" />
              <span className="text-sm text-green-700">
                Processing file... {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
        isDragActive && !isDragReject && "border-primary bg-primary/5",
        isDragReject && "border-red-500 bg-red-50",
        !isDragActive && "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4">
        <div
          className={cn(
            "p-4 rounded-full",
            isDragActive && !isDragReject && "bg-primary/10",
            isDragReject && "bg-red-100",
            !isDragActive && "bg-gray-100"
          )}
        >
          <Upload
            className={cn(
              "h-10 w-10",
              isDragActive && !isDragReject && "text-primary",
              isDragReject && "text-red-500",
              !isDragActive && "text-gray-400"
            )}
          />
        </div>
        <div>
          {isDragReject ? (
            <p className="text-lg font-medium text-red-600">
              Only CSV files are accepted
            </p>
          ) : isDragActive ? (
            <p className="text-lg font-medium text-primary">Drop the file here</p>
          ) : (
            <>
              <p className="text-lg font-medium text-gray-900">
                Drag and drop your CSV file here
              </p>
              <p className="text-sm text-gray-500 mt-1">
                or click to browse from your computer
              </p>
            </>
          )}
        </div>
        <p className="text-xs text-gray-400">Supports CSV files only</p>
      </div>
    </div>
  );
}
