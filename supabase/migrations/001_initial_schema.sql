-- SWIP SafePackage Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE upload_status AS ENUM (
    'pending',
    'validating',
    'validated',
    'validation_failed',
    'processing',
    'completed',
    'completed_with_errors',
    'failed'
);

CREATE TYPE screening_status AS ENUM (
    'pending',
    'accepted',
    'rejected',
    'inconclusive',
    'audit_required'
);

CREATE TYPE package_status AS ENUM (
    'pending',
    'screening',
    'accepted',
    'rejected',
    'inconclusive',
    'audit_required',
    'audit_submitted',
    'duty_pending',
    'duty_paid',
    'registered'
);

CREATE TYPE shipment_status AS ENUM (
    'pending',
    'registered',
    'verification_pending',
    'verified',
    'rejected',
    'failed'
);

CREATE TYPE row_status AS ENUM (
    'pending',
    'valid',
    'invalid',
    'processing',
    'processed',
    'failed'
);

-- =============================================================================
-- USERS & PROFILES (extends Supabase Auth)
-- =============================================================================

CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    company_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- API CONFIGURATION
-- =============================================================================

CREATE TABLE public.api_configurations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
    api_key TEXT NOT NULL,
    base_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, environment)
);

-- =============================================================================
-- CSV UPLOADS
-- =============================================================================

CREATE TABLE public.uploads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    row_count INTEGER DEFAULT 0,
    valid_row_count INTEGER DEFAULT 0,
    invalid_row_count INTEGER DEFAULT 0,
    status upload_status DEFAULT 'pending',
    raw_data JSONB,
    validation_errors JSONB,
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- SHIPMENTS (must be created before packages due to FK reference)
-- =============================================================================

CREATE TABLE public.shipments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    upload_id UUID REFERENCES public.uploads(id) ON DELETE SET NULL,
    safepackage_shipment_id TEXT,
    external_id TEXT NOT NULL,
    master_bill_prefix TEXT NOT NULL,
    master_bill_serial_number TEXT NOT NULL,
    originator_code TEXT,
    entry_type TEXT CHECK (entry_type IN ('01', '11', '86', 'P')),
    shipper_name TEXT NOT NULL,
    shipper_line1 TEXT NOT NULL,
    shipper_line2 TEXT,
    shipper_city TEXT NOT NULL,
    shipper_state TEXT NOT NULL,
    shipper_postal_code TEXT NOT NULL,
    shipper_country CHAR(3) NOT NULL,
    shipper_phone TEXT,
    shipper_email TEXT,
    shipper_identifiers JSONB,
    consignee_name TEXT NOT NULL,
    consignee_line1 TEXT NOT NULL,
    consignee_line2 TEXT,
    consignee_city TEXT NOT NULL,
    consignee_state TEXT NOT NULL,
    consignee_postal_code TEXT NOT NULL,
    consignee_country CHAR(3) NOT NULL,
    consignee_phone TEXT,
    consignee_email TEXT,
    consignee_identifiers JSONB,
    transport_mode TEXT NOT NULL CHECK (transport_mode IN ('AIR', 'TRUCK')),
    port_of_entry TEXT NOT NULL,
    port_of_arrival TEXT,
    port_of_origin TEXT NOT NULL,
    carrier_name TEXT NOT NULL,
    carrier_code TEXT NOT NULL,
    line_number TEXT NOT NULL,
    firms_code TEXT,
    shipping_date DATE NOT NULL,
    scheduled_arrival_date DATE NOT NULL,
    terminal_operator TEXT,
    status shipment_status DEFAULT 'pending',
    verification_code INTEGER,
    verification_status TEXT,
    verification_reason_code TEXT,
    verification_reason_description TEXT,
    verification_document_type TEXT,
    verification_document_content TEXT,
    registered_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PRODUCTS
-- =============================================================================

CREATE TABLE public.products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    upload_id UUID REFERENCES public.uploads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    safepackage_reference TEXT,
    sku TEXT NOT NULL,
    platform_id TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    url TEXT NOT NULL,
    name TEXT NOT NULL,
    declared_name TEXT,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    origin_country CHAR(3) NOT NULL,
    destination_country CHAR(3) NOT NULL DEFAULT 'USA',
    hs_code TEXT,
    ean TEXT,
    categories TEXT[],
    pieces INTEGER DEFAULT 1,
    normalize BOOLEAN DEFAULT false,
    manufacturer_id TEXT,
    manufacturer_name TEXT,
    manufacturer_address TEXT,
    image_urls TEXT[],
    screening_status screening_status DEFAULT 'pending',
    screening_code INTEGER,
    screening_reason_code TEXT,
    screening_reason_description TEXT,
    screened_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PACKAGES
-- =============================================================================

CREATE TABLE public.packages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    upload_id UUID REFERENCES public.uploads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    shipment_id UUID REFERENCES public.shipments(id) ON DELETE SET NULL,
    safepackage_id TEXT,
    external_id TEXT NOT NULL,
    house_bill_number TEXT NOT NULL,
    barcode TEXT NOT NULL,
    container_id TEXT,
    carrier_id TEXT,
    platform_id TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    export_country CHAR(3) NOT NULL,
    destination_country CHAR(3) NOT NULL DEFAULT 'USA',
    weight_value DECIMAL(10, 4) NOT NULL,
    weight_unit CHAR(1) NOT NULL CHECK (weight_unit IN ('K', 'L')),
    shipper_name TEXT NOT NULL,
    shipper_line1 TEXT NOT NULL,
    shipper_line2 TEXT,
    shipper_city TEXT NOT NULL,
    shipper_state TEXT NOT NULL,
    shipper_postal_code TEXT NOT NULL,
    shipper_country CHAR(3) NOT NULL,
    shipper_phone TEXT,
    shipper_email TEXT,
    shipper_identifiers JSONB,
    consignee_name TEXT NOT NULL,
    consignee_line1 TEXT NOT NULL,
    consignee_line2 TEXT,
    consignee_city TEXT NOT NULL,
    consignee_state TEXT NOT NULL,
    consignee_postal_code TEXT NOT NULL,
    consignee_country CHAR(3) NOT NULL,
    consignee_phone TEXT,
    consignee_email TEXT,
    consignee_identifiers JSONB,
    status package_status DEFAULT 'pending',
    screening_code INTEGER,
    screening_status TEXT,
    label_qr_code TEXT,
    ddpn TEXT,
    total_duty DECIMAL(10, 2),
    audit_status TEXT,
    audit_images TEXT[],
    audit_remark TEXT,
    screened_at TIMESTAMPTZ,
    duty_paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PACKAGE PRODUCTS (Junction Table)
-- =============================================================================

CREATE TABLE public.package_products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    package_id UUID REFERENCES public.packages(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    declared_value DECIMAL(10, 2) NOT NULL,
    declared_name TEXT,
    screening_reference TEXT,
    screening_code INTEGER,
    screening_status TEXT,
    screening_reason_code TEXT,
    screening_reason_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(package_id, product_id)
);

-- =============================================================================
-- UPLOAD ROW DETAILS
-- =============================================================================

CREATE TABLE public.upload_rows (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    upload_id UUID REFERENCES public.uploads(id) ON DELETE CASCADE NOT NULL,
    row_number INTEGER NOT NULL,
    raw_data JSONB NOT NULL,
    status row_status DEFAULT 'pending',
    validation_errors JSONB,
    package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(upload_id, row_number)
);

-- =============================================================================
-- API LOGS
-- =============================================================================

CREATE TABLE public.api_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    request_body JSONB,
    status_code INTEGER,
    response_body JSONB,
    package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    shipment_id UUID REFERENCES public.shipments(id) ON DELETE SET NULL,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_uploads_user_id ON public.uploads(user_id);
CREATE INDEX idx_uploads_status ON public.uploads(status);
CREATE INDEX idx_products_upload_id ON public.products(upload_id);
CREATE INDEX idx_products_user_id ON public.products(user_id);
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_screening_status ON public.products(screening_status);
CREATE INDEX idx_packages_upload_id ON public.packages(upload_id);
CREATE INDEX idx_packages_user_id ON public.packages(user_id);
CREATE INDEX idx_packages_shipment_id ON public.packages(shipment_id);
CREATE INDEX idx_packages_status ON public.packages(status);
CREATE INDEX idx_packages_external_id ON public.packages(external_id);
CREATE INDEX idx_packages_barcode ON public.packages(barcode);
CREATE INDEX idx_shipments_user_id ON public.shipments(user_id);
CREATE INDEX idx_shipments_status ON public.shipments(status);
CREATE INDEX idx_upload_rows_upload_id ON public.upload_rows(upload_id);
CREATE INDEX idx_api_logs_user_id ON public.api_logs(user_id);
CREATE INDEX idx_api_logs_created_at ON public.api_logs(created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- API configurations policies
CREATE POLICY "Users can view own API configurations"
    ON public.api_configurations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own API configurations"
    ON public.api_configurations FOR ALL
    USING (auth.uid() = user_id);

-- Uploads policies
CREATE POLICY "Users can view own uploads"
    ON public.uploads FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own uploads"
    ON public.uploads FOR ALL
    USING (auth.uid() = user_id);

-- Products policies
CREATE POLICY "Users can view own products"
    ON public.products FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own products"
    ON public.products FOR ALL
    USING (auth.uid() = user_id);

-- Packages policies
CREATE POLICY "Users can view own packages"
    ON public.packages FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own packages"
    ON public.packages FOR ALL
    USING (auth.uid() = user_id);

-- Package products policies
CREATE POLICY "Users can view own package products"
    ON public.package_products FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.packages p
            WHERE p.id = package_products.package_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own package products"
    ON public.package_products FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.packages p
            WHERE p.id = package_products.package_id
            AND p.user_id = auth.uid()
        )
    );

-- Shipments policies
CREATE POLICY "Users can view own shipments"
    ON public.shipments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own shipments"
    ON public.shipments FOR ALL
    USING (auth.uid() = user_id);

-- Upload rows policies
CREATE POLICY "Users can view own upload rows"
    ON public.upload_rows FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.uploads u
            WHERE u.id = upload_rows.upload_id
            AND u.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own upload rows"
    ON public.upload_rows FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.uploads u
            WHERE u.id = upload_rows.upload_id
            AND u.user_id = auth.uid()
        )
    );

-- API logs policies
CREATE POLICY "Users can view own API logs"
    ON public.api_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own API logs"
    ON public.api_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_uploads_updated_at
    BEFORE UPDATE ON public.uploads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_packages_updated_at
    BEFORE UPDATE ON public.packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipments_updated_at
    BEFORE UPDATE ON public.shipments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_upload_rows_updated_at
    BEFORE UPDATE ON public.upload_rows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Profile creation trigger (after auth signup)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
