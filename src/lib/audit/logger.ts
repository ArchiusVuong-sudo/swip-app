import { createClient } from "@/lib/supabase/client";

export type AuditAction =
  | "row_created"
  | "row_edited"
  | "row_deleted"
  | "bulk_edit"
  | "submission_reviewed"
  | "submission_approved"
  | "api_submission_confirmed"
  | "package_resubmitted"
  | "validation_override";

export interface AuditLogEntry {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  uploadId?: string;
  packageId?: string;
  rowNumber?: number;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  changes?: Record<string, unknown>;
  notes?: string;
}

export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn("Cannot create audit log: No user logged in");
      return;
    }

    // Note: audit_logs table is created by migration 002_audit_logs.sql
    // Using type assertion since the table might not be in generated types yet
    const { error } = await (supabase.from("audit_logs") as ReturnType<typeof supabase.from>).insert({
      user_id: user.id,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      upload_id: entry.uploadId,
      package_id: entry.packageId,
      row_number: entry.rowNumber,
      field_name: entry.fieldName,
      old_value: entry.oldValue,
      new_value: entry.newValue,
      changes: entry.changes,
      notes: entry.notes,
      ip_address: typeof window !== "undefined" ? null : null, // Could be populated server-side
      user_agent:
        typeof window !== "undefined" ? window.navigator.userAgent : null,
    } as Record<string, unknown>);

    if (error) {
      console.error("Error creating audit log:", error);
    }
  } catch (error) {
    console.error("Error creating audit log:", error);
  }
}

export async function logRowEdit(
  uploadId: string,
  rowNumber: number,
  fieldName: string,
  oldValue: string | undefined,
  newValue: string,
  notes?: string
): Promise<void> {
  await createAuditLog({
    action: "row_edited",
    entityType: "row",
    entityId: `${uploadId}-row-${rowNumber}`,
    uploadId,
    rowNumber,
    fieldName,
    oldValue: oldValue || "",
    newValue,
    notes,
  });
}

export async function logBulkEdit(
  uploadId: string,
  changes: Map<number, Record<string, string>>,
  notes?: string
): Promise<void> {
  const changesObj: Record<string, Record<string, string>> = {};
  changes.forEach((fieldChanges, rowIndex) => {
    changesObj[`row_${rowIndex + 1}`] = fieldChanges;
  });

  await createAuditLog({
    action: "bulk_edit",
    entityType: "upload",
    entityId: uploadId,
    uploadId,
    changes: changesObj,
    notes,
  });
}

export async function logSubmissionReview(
  uploadId: string,
  notes: string,
  confirmations: Record<string, boolean>
): Promise<void> {
  await createAuditLog({
    action: "submission_reviewed",
    entityType: "upload",
    entityId: uploadId,
    uploadId,
    changes: { confirmations },
    notes,
  });
}

export async function logAPISubmission(
  uploadId: string,
  notes: string,
  packageCount: number
): Promise<void> {
  await createAuditLog({
    action: "api_submission_confirmed",
    entityType: "upload",
    entityId: uploadId,
    uploadId,
    changes: { packageCount },
    notes,
  });
}

export async function logPackageResubmission(
  packageId: string,
  uploadId: string,
  corrections: Record<string, unknown>,
  notes?: string
): Promise<void> {
  await createAuditLog({
    action: "package_resubmitted",
    entityType: "package",
    entityId: packageId,
    uploadId,
    packageId,
    changes: corrections,
    notes,
  });
}

// Server-side audit log function (for API routes)
export async function createServerAuditLog(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  entry: AuditLogEntry
): Promise<void> {
  try {
    // Note: audit_logs table is created by migration 002_audit_logs.sql
    // Using type assertion since the table might not be in generated types yet
    const { error } = await (supabase.from("audit_logs") as ReturnType<typeof supabase.from>).insert({
      user_id: userId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      upload_id: entry.uploadId,
      package_id: entry.packageId,
      row_number: entry.rowNumber,
      field_name: entry.fieldName,
      old_value: entry.oldValue,
      new_value: entry.newValue,
      changes: entry.changes,
      notes: entry.notes,
    } as Record<string, unknown>);

    if (error) {
      console.error("Error creating server audit log:", error);
    }
  } catch (error) {
    console.error("Error creating server audit log:", error);
  }
}
