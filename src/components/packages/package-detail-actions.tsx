"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

interface PackageDetailActionsProps {
  packageId: string;
  externalId: string;
}

export function PackageDetailActions({ packageId, externalId }: PackageDetailActionsProps) {
  const router = useRouter();

  const handleDeletePackage = async () => {
    try {
      const response = await fetch(`/api/packages/${packageId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete package");
      }

      toast.success("Package deleted successfully");
      router.push("/packages");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete package");
      throw error;
    }
  };

  return (
    <DeleteConfirmDialog
      title="Delete Package"
      description={`Are you sure you want to delete package "${externalId}"? This action cannot be undone.`}
      onConfirm={handleDeletePackage}
      variant="button"
    />
  );
}
