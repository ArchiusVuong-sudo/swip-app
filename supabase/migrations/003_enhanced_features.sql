-- SWIP SafePackage - Enhanced Features Migration
-- Adds: API failures tracking, tracking events, user platforms, user stamping, environment support

-- =============================================================================
-- API FAILURES TABLE
-- Store API call failures for debugging and retry logic
-- =============================================================================

CREATE TABLE public.api_failures (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    upload_id UUID REFERENCES public.uploads(id) ON DELETE CASCADE,
    package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
    shipment_id UUID REFERENCES public.shipments(id) ON DELETE SET NULL,

    -- Request details
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    request_body JSONB,

    -- Response details
    status_code INTEGER,
    error_code TEXT,
    error_message TEXT,
    error_details JSONB,

    -- Context
    environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
    external_id TEXT, -- Package or shipment external ID for easy lookup
    row_number INTEGER, -- CSV row number if applicable

    -- Retry tracking
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_retry_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    retry_status TEXT DEFAULT 'pending' CHECK (retry_status IN ('pending', 'retrying', 'success', 'exhausted', 'manual_required')),

    -- Resolution
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.profiles(id),
    resolution_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- TRACKING EVENTS TABLE
-- Store tracking events from SafePackage Tracking API
-- =============================================================================

CREATE TABLE public.tracking_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

    -- Entity reference (either package or shipment)
    package_id UUID REFERENCES public.packages(id) ON DELETE CASCADE,
    shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('package', 'shipment')),

    -- SafePackage IDs
    safepackage_package_id TEXT,
    safepackage_shipment_id TEXT,

    -- Event details from API
    event_type TEXT NOT NULL,
    event_description TEXT NOT NULL,
    event_time TIMESTAMPTZ NOT NULL,
    event_data JSONB, -- Additional tracking data (from, to, locationId, containerId, errorCode, status)

    -- Metadata
    environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicates
    UNIQUE(entity_type, COALESCE(package_id::text, ''), COALESCE(shipment_id::text, ''), event_type, event_time)
);

-- =============================================================================
-- USER PLATFORMS TABLE
-- Manage which platforms users have enabled
-- =============================================================================

CREATE TABLE public.user_platforms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    platform_id TEXT NOT NULL,
    platform_url TEXT,
    is_enabled BOOLEAN DEFAULT true,
    seller_id TEXT, -- User's default seller ID for this platform
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, platform_id)
);

-- =============================================================================
-- ADD USER STAMPING COLUMNS TO EXISTING TABLES
-- =============================================================================

-- Uploads table
ALTER TABLE public.uploads
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production'));

-- Packages table
ALTER TABLE public.packages
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
ADD COLUMN IF NOT EXISTS screening_response JSONB, -- Full API response for debugging
ADD COLUMN IF NOT EXISTS api_error_code TEXT,
ADD COLUMN IF NOT EXISTS api_error_message TEXT,
ADD COLUMN IF NOT EXISTS api_error_details JSONB,
ADD COLUMN IF NOT EXISTS submission_hash TEXT, -- Hash to prevent duplicate submissions
ADD COLUMN IF NOT EXISTS last_submitted_at TIMESTAMPTZ;

-- Products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production'));

-- Shipments table
ALTER TABLE public.shipments
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
ADD COLUMN IF NOT EXISTS registration_response JSONB,
ADD COLUMN IF NOT EXISTS verification_response JSONB,
ADD COLUMN IF NOT EXISTS api_error_code TEXT,
ADD COLUMN IF NOT EXISTS api_error_message TEXT,
ADD COLUMN IF NOT EXISTS api_error_details JSONB;

-- API configurations - add last_used tracking
ALTER TABLE public.api_configurations
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

-- =============================================================================
-- ADD UPLOAD BATCH RETRY SUPPORT
-- =============================================================================

-- Add batch retry columns to uploads
ALTER TABLE public.uploads
ADD COLUMN IF NOT EXISTS failed_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_retry_enabled BOOLEAN DEFAULT true;

-- =============================================================================
-- INDEXES FOR NEW TABLES
-- =============================================================================

-- API failures indexes
CREATE INDEX idx_api_failures_user_id ON public.api_failures(user_id);
CREATE INDEX idx_api_failures_upload_id ON public.api_failures(upload_id);
CREATE INDEX idx_api_failures_package_id ON public.api_failures(package_id);
CREATE INDEX idx_api_failures_shipment_id ON public.api_failures(shipment_id);
CREATE INDEX idx_api_failures_retry_status ON public.api_failures(retry_status);
CREATE INDEX idx_api_failures_environment ON public.api_failures(environment);
CREATE INDEX idx_api_failures_created_at ON public.api_failures(created_at DESC);
CREATE INDEX idx_api_failures_external_id ON public.api_failures(external_id);

-- Tracking events indexes
CREATE INDEX idx_tracking_events_user_id ON public.tracking_events(user_id);
CREATE INDEX idx_tracking_events_package_id ON public.tracking_events(package_id);
CREATE INDEX idx_tracking_events_shipment_id ON public.tracking_events(shipment_id);
CREATE INDEX idx_tracking_events_event_type ON public.tracking_events(event_type);
CREATE INDEX idx_tracking_events_event_time ON public.tracking_events(event_time DESC);
CREATE INDEX idx_tracking_events_environment ON public.tracking_events(environment);

-- User platforms indexes
CREATE INDEX idx_user_platforms_user_id ON public.user_platforms(user_id);
CREATE INDEX idx_user_platforms_platform_id ON public.user_platforms(platform_id);

-- New indexes on existing tables for environment filtering
CREATE INDEX IF NOT EXISTS idx_uploads_environment ON public.uploads(environment);
CREATE INDEX IF NOT EXISTS idx_packages_environment ON public.packages(environment);
CREATE INDEX IF NOT EXISTS idx_products_environment ON public.products(environment);
CREATE INDEX IF NOT EXISTS idx_shipments_environment ON public.shipments(environment);

-- Index for duplicate prevention
CREATE INDEX IF NOT EXISTS idx_packages_submission_hash ON public.packages(submission_hash);

-- =============================================================================
-- ROW LEVEL SECURITY FOR NEW TABLES
-- =============================================================================

ALTER TABLE public.api_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_platforms ENABLE ROW LEVEL SECURITY;

-- API failures policies
CREATE POLICY "Users can view own API failures"
    ON public.api_failures FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own API failures"
    ON public.api_failures FOR ALL
    USING (auth.uid() = user_id);

-- Tracking events policies
CREATE POLICY "Users can view own tracking events"
    ON public.tracking_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own tracking events"
    ON public.tracking_events FOR ALL
    USING (auth.uid() = user_id);

-- User platforms policies
CREATE POLICY "Users can view own platforms"
    ON public.user_platforms FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own platforms"
    ON public.user_platforms FOR ALL
    USING (auth.uid() = user_id);

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================================================

CREATE TRIGGER update_api_failures_updated_at
    BEFORE UPDATE ON public.api_failures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_platforms_updated_at
    BEFORE UPDATE ON public.user_platforms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to generate submission hash for duplicate prevention
CREATE OR REPLACE FUNCTION generate_submission_hash(
    p_external_id TEXT,
    p_platform_id TEXT,
    p_barcode TEXT,
    p_house_bill_number TEXT
) RETURNS TEXT AS $$
BEGIN
    RETURN md5(COALESCE(p_external_id, '') || '|' ||
               COALESCE(p_platform_id, '') || '|' ||
               COALESCE(p_barcode, '') || '|' ||
               COALESCE(p_house_bill_number, ''));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if package was already successfully submitted
CREATE OR REPLACE FUNCTION is_duplicate_submission(
    p_submission_hash TEXT,
    p_user_id UUID,
    p_environment TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.packages
        WHERE submission_hash = p_submission_hash
        AND user_id = p_user_id
        AND environment = p_environment
        AND screening_code = 1 -- Only check accepted packages
        AND safepackage_id IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get pending retries for a user
CREATE OR REPLACE FUNCTION get_pending_retries(p_user_id UUID)
RETURNS TABLE (
    failure_id UUID,
    endpoint TEXT,
    external_id TEXT,
    error_message TEXT,
    retry_count INTEGER,
    next_retry_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        f.id,
        f.endpoint,
        f.external_id,
        f.error_message,
        f.retry_count,
        f.next_retry_at
    FROM public.api_failures f
    WHERE f.user_id = p_user_id
    AND f.retry_status IN ('pending', 'manual_required')
    ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;
