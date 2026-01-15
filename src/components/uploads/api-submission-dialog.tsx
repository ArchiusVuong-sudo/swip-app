"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  AlertTriangle,
  Package,
  Loader2,
  Shield,
} from "lucide-react";

interface Upload {
  id: string;
  file_name: string;
  row_count: number;
  valid_row_count: number;
  invalid_row_count: number;
}

interface APISubmissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => void;
  upload: Upload;
  isSubmitting?: boolean;
}

export function APISubmissionDialog({
  isOpen,
  onClose,
  onConfirm,
  upload,
  isSubmitting = false,
}: APISubmissionDialogProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [notes, setNotes] = useState("");

  const handleConfirm = () => {
    if (confirmed) {
      onConfirm(notes);
    }
  };

  const handleClose = () => {
    setConfirmed(false);
    setNotes("");
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Confirm API Submission
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                You are about to submit packages to the SafePackage API for
                customs screening. This action will process all valid rows.
              </p>

              {/* Upload Summary */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">File</span>
                  <span className="font-medium text-sm truncate max-w-[200px]">
                    {upload.file_name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Packages
                  </span>
                  <Badge variant="secondary">{upload.row_count}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Will be Processed
                  </span>
                  <Badge variant="default" className="bg-green-600">
                    {upload.valid_row_count}
                  </Badge>
                </div>
                {upload.invalid_row_count > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Skipped (Invalid)
                    </span>
                    <Badge variant="destructive">
                      {upload.invalid_row_count}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Warning */}
              <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">
                    This action cannot be undone
                  </p>
                  <p className="text-yellow-600">
                    Once submitted, packages will be processed by the SafePackage
                    API. Results will be stored in your dashboard.
                  </p>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="submission-notes" className="text-foreground">
                  Submission Notes (Optional)
                </Label>
                <Textarea
                  id="submission-notes"
                  placeholder="Add notes for audit trail..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="text-foreground"
                />
              </div>

              {/* Confirmation Checkbox */}
              <div className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg">
                <Checkbox
                  id="confirm-submission"
                  checked={confirmed}
                  onCheckedChange={(checked) => setConfirmed(checked === true)}
                />
                <Label
                  htmlFor="confirm-submission"
                  className="text-sm font-normal leading-relaxed cursor-pointer text-foreground"
                >
                  I confirm that I want to submit {upload.valid_row_count}{" "}
                  packages for customs screening via the SafePackage API
                </Label>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!confirmed || isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit to API
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
