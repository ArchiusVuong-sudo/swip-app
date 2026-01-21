import { createClient } from "@/lib/supabase/client";
import type { Environment, RetryStatus, InsertTables, Json } from "@/types/database";

export interface ApiFailureEntry {
  endpoint: string;
  method: string;
  requestBody?: Record<string, unknown>;
  statusCode?: number;
  errorCode?: string;
  errorMessage?: string;
  errorDetails?: Record<string, unknown>;
  environment: Environment;
  uploadId?: string;
  packageId?: string;
  shipmentId?: string;
  externalId?: string;
  rowNumber?: number;
  maxRetries?: number;
}

export interface RetryResult {
  success: boolean;
  newStatus: RetryStatus;
  error?: string;
}

/**
 * Log an API failure for tracking and potential retry
 */
export async function logApiFailure(entry: ApiFailureEntry): Promise<string | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn("Cannot log API failure: No user logged in");
      return null;
    }

    // Calculate next retry time (exponential backoff: 1min, 5min, 15min)
    const retryDelays = [60000, 300000, 900000]; // 1 min, 5 min, 15 min
    const nextRetryDelay = retryDelays[0];
    const nextRetryAt = new Date(Date.now() + nextRetryDelay).toISOString();

    const insertData: InsertTables<"api_failures"> = {
      user_id: user.id,
      endpoint: entry.endpoint,
      method: entry.method,
      request_body: (entry.requestBody as Json) || null,
      status_code: entry.statusCode || null,
      error_code: entry.errorCode || null,
      error_message: entry.errorMessage || null,
      error_details: (entry.errorDetails as Json) || null,
      environment: entry.environment,
      upload_id: entry.uploadId || null,
      package_id: entry.packageId || null,
      shipment_id: entry.shipmentId || null,
      external_id: entry.externalId || null,
      row_number: entry.rowNumber || null,
      max_retries: entry.maxRetries || 3,
      retry_count: 0,
      retry_status: "pending",
      next_retry_at: nextRetryAt,
    };

    const { data, error } = await supabase
      .from("api_failures" as never)
      .insert(insertData as never)
      .select("id")
      .single();

    if (error) {
      console.error("Error logging API failure:", error.message);
      return null;
    }

    return (data as { id: string } | null)?.id || null;
  } catch (error) {
    console.error("Error logging API failure:", error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Server-side API failure logger for use in API routes
 */
export async function logServerApiFailure(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  entry: ApiFailureEntry
): Promise<string | null> {
  try {
    // Calculate next retry time (exponential backoff)
    const retryDelays = [60000, 300000, 900000]; // 1 min, 5 min, 15 min
    const nextRetryDelay = retryDelays[0];
    const nextRetryAt = new Date(Date.now() + nextRetryDelay).toISOString();

    const insertData: InsertTables<"api_failures"> = {
      user_id: userId,
      endpoint: entry.endpoint,
      method: entry.method,
      request_body: (entry.requestBody as Json) || null,
      status_code: entry.statusCode || null,
      error_code: entry.errorCode || null,
      error_message: entry.errorMessage || null,
      error_details: (entry.errorDetails as Json) || null,
      environment: entry.environment,
      upload_id: entry.uploadId || null,
      package_id: entry.packageId || null,
      shipment_id: entry.shipmentId || null,
      external_id: entry.externalId || null,
      row_number: entry.rowNumber || null,
      max_retries: entry.maxRetries || 3,
      retry_count: 0,
      retry_status: "pending",
      next_retry_at: nextRetryAt,
    };

    const { data, error } = await supabase
      .from("api_failures" as never)
      .insert(insertData as never)
      .select("id")
      .single();

    if (error) {
      console.error("Error logging API failure:", error.message);
      return null;
    }

    return (data as { id: string } | null)?.id || null;
  } catch (error) {
    console.error("Error logging API failure:", error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Update retry status after an attempt
 */
export async function updateRetryStatus(
  failureId: string,
  status: RetryStatus,
  resolvedBy?: string,
  resolutionNotes?: string
): Promise<void> {
  try {
    const supabase = createClient();

    const updateData: Record<string, unknown> = {
      retry_status: status,
      last_retry_at: new Date().toISOString(),
    };

    if (status === "success" || status === "exhausted" || status === "manual_required") {
      updateData.resolved_at = new Date().toISOString();
      if (resolvedBy) updateData.resolved_by = resolvedBy;
      if (resolutionNotes) updateData.resolution_notes = resolutionNotes;
    }

    const { error } = await supabase
      .from("api_failures" as never)
      .update(updateData as never)
      .eq("id", failureId);

    if (error) {
      console.error("Error updating retry status:", error.message);
    }
  } catch (error) {
    console.error("Error updating retry status:", error instanceof Error ? error.message : String(error));
  }
}

/**
 * Increment retry count and calculate next retry time
 */
export async function incrementRetryCount(failureId: string): Promise<{ shouldRetry: boolean; nextRetryAt: string | null }> {
  try {
    const supabase = createClient();

    // Get current failure data
    const { data: failure, error: fetchError } = await supabase
      .from("api_failures" as never)
      .select("retry_count, max_retries")
      .eq("id", failureId)
      .single();

    if (fetchError || !failure) {
      console.error("Error fetching failure:", fetchError?.message);
      return { shouldRetry: false, nextRetryAt: null };
    }

    const failureData = failure as { retry_count: number | null; max_retries: number | null };
    const newRetryCount = (failureData.retry_count || 0) + 1;
    const maxRetries = failureData.max_retries || 3;

    // Check if we've exhausted retries
    if (newRetryCount >= maxRetries) {
      await supabase
        .from("api_failures" as never)
        .update({
          retry_count: newRetryCount,
          retry_status: "exhausted",
          last_retry_at: new Date().toISOString(),
          resolved_at: new Date().toISOString(),
          resolution_notes: "Maximum retry attempts reached",
        } as never)
        .eq("id", failureId);

      return { shouldRetry: false, nextRetryAt: null };
    }

    // Calculate next retry time with exponential backoff
    const retryDelays = [60000, 300000, 900000]; // 1 min, 5 min, 15 min
    const delayIndex = Math.min(newRetryCount, retryDelays.length - 1);
    const nextRetryDelay = retryDelays[delayIndex];
    const nextRetryAt = new Date(Date.now() + nextRetryDelay).toISOString();

    await supabase
      .from("api_failures" as never)
      .update({
        retry_count: newRetryCount,
        retry_status: "pending",
        last_retry_at: new Date().toISOString(),
        next_retry_at: nextRetryAt,
      } as never)
      .eq("id", failureId);

    return { shouldRetry: true, nextRetryAt };
  } catch (error) {
    console.error("Error incrementing retry count:", error instanceof Error ? error.message : String(error));
    return { shouldRetry: false, nextRetryAt: null };
  }
}

/**
 * Get pending failures for a user that are ready to retry
 */
export async function getPendingRetries(userId?: string): Promise<Array<{
  id: string;
  endpoint: string;
  external_id: string | null;
  error_message: string | null;
  retry_count: number;
  next_retry_at: string | null;
  request_body: Record<string, unknown> | null;
  upload_id: string | null;
  package_id: string | null;
  environment: Environment;
}>> {
  try {
    const supabase = createClient();

    let query = supabase
      .from("api_failures" as never)
      .select("id, endpoint, external_id, error_message, retry_count, next_retry_at, request_body, upload_id, package_id, environment")
      .in("retry_status", ["pending", "manual_required"])
      .order("created_at", { ascending: true });

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching pending retries:", error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching pending retries:", error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * Resolve a failure manually (skip retry)
 */
export async function resolveFailureManually(
  failureId: string,
  notes: string
): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase
      .from("api_failures" as never)
      .update({
        retry_status: "manual_required",
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id,
        resolution_notes: notes,
      } as never)
      .eq("id", failureId);
  } catch (error) {
    console.error("Error resolving failure:", error instanceof Error ? error.message : String(error));
  }
}

/**
 * Get failure statistics for a user
 */
export async function getFailureStats(userId?: string): Promise<{
  pending: number;
  retrying: number;
  exhausted: number;
  manualRequired: number;
  resolved: number;
}> {
  try {
    const supabase = createClient();

    let query = supabase
      .from("api_failures" as never)
      .select("retry_status");

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching failure stats:", error.message);
      return { pending: 0, retrying: 0, exhausted: 0, manualRequired: 0, resolved: 0 };
    }

    const stats = {
      pending: 0,
      retrying: 0,
      exhausted: 0,
      manualRequired: 0,
      resolved: 0,
    };

    (data as Array<{ retry_status: string }> | null)?.forEach((row) => {
      switch (row.retry_status) {
        case "pending":
          stats.pending++;
          break;
        case "retrying":
          stats.retrying++;
          break;
        case "exhausted":
          stats.exhausted++;
          break;
        case "manual_required":
          stats.manualRequired++;
          break;
        case "success":
          stats.resolved++;
          break;
      }
    });

    return stats;
  } catch (error) {
    console.error("Error fetching failure stats:", error instanceof Error ? error.message : String(error));
    return { pending: 0, retrying: 0, exhausted: 0, manualRequired: 0, resolved: 0 };
  }
}
