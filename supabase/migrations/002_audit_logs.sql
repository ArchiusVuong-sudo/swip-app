-- SWIP SafePackage - Audit Logs for Human-in-the-Loop Review
-- This migration adds audit logging for data corrections and review workflow

-- =============================================================================
-- AUDIT LOG TYPES
-- =============================================================================

CREATE TYPE audit_action AS ENUM (
    'row_created',
    'row_edited',
    'row_deleted',
    'bulk_edit',
    'submission_reviewed',
    'submission_approved',
    'api_submission_confirmed',
    'package_resubmitted',
    'validation_override'
);

-- =============================================================================
-- AUDIT LOGS TABLE
-- =============================================================================

CREATE TABLE public.audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    upload_id UUID REFERENCES public.uploads(id) ON DELETE CASCADE,
    package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
    action audit_action NOT NULL,
    entity_type TEXT NOT NULL, -- 'upload', 'package', 'row', etc.
    entity_id TEXT, -- The ID of the entity being modified
    row_number INTEGER, -- For row-level changes
    field_name TEXT, -- For field-level changes
    old_value TEXT,
    new_value TEXT,
    changes JSONB, -- For bulk changes or complex modifications
    notes TEXT, -- User-provided notes for audit trail
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- SUBMISSION REVIEW LOGS
-- =============================================================================

CREATE TABLE public.submission_reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    upload_id UUID REFERENCES public.uploads(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    review_type TEXT NOT NULL CHECK (review_type IN ('pre_submission', 'api_submission')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    confirmations JSONB, -- Stores which checkboxes were confirmed
    notes TEXT,
    reviewed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_upload_id ON public.audit_logs(upload_id);
CREATE INDEX idx_audit_logs_package_id ON public.audit_logs(package_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_submission_reviews_upload_id ON public.submission_reviews(upload_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_reviews ENABLE ROW LEVEL SECURITY;

-- Audit logs policies
CREATE POLICY "Users can view own audit logs"
    ON public.audit_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Submission reviews policies
CREATE POLICY "Users can view own submission reviews"
    ON public.submission_reviews FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own submission reviews"
    ON public.submission_reviews FOR ALL
    USING (auth.uid() = user_id);

-- =============================================================================
-- ADD COLUMNS TO UPLOADS TABLE
-- =============================================================================

ALTER TABLE public.uploads
ADD COLUMN IF NOT EXISTS review_notes TEXT,
ADD COLUMN IF NOT EXISTS submission_notes TEXT,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id);

-- =============================================================================
-- ADD COLUMNS TO PACKAGES TABLE FOR RESUBMISSION
-- =============================================================================

ALTER TABLE public.packages
ADD COLUMN IF NOT EXISTS original_package_id UUID REFERENCES public.packages(id),
ADD COLUMN IF NOT EXISTS resubmission_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS correction_notes TEXT,
ADD COLUMN IF NOT EXISTS corrected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS corrected_by UUID REFERENCES public.profiles(id);

-- Add processing_results column to uploads if not exists
ALTER TABLE public.uploads
ADD COLUMN IF NOT EXISTS processing_results JSONB;
