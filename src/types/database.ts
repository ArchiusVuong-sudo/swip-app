export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UploadStatus =
  | "pending"
  | "validating"
  | "validated"
  | "validation_failed"
  | "processing"
  | "completed"
  | "completed_with_errors"
  | "failed";

export type ScreeningStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "inconclusive"
  | "audit_required";

export type PackageStatus =
  | "pending"
  | "screening"
  | "accepted"
  | "rejected"
  | "inconclusive"
  | "audit_required"
  | "audit_submitted"
  | "duty_pending"
  | "duty_paid"
  | "registered";

export type ShipmentStatus =
  | "pending"
  | "registered"
  | "verification_pending"
  | "verified"
  | "rejected"
  | "failed";

export type RowStatus =
  | "pending"
  | "valid"
  | "invalid"
  | "processing"
  | "processed"
  | "failed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          company_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          company_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          company_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      api_configurations: {
        Row: {
          id: string;
          user_id: string;
          environment: "sandbox" | "production";
          api_key: string;
          base_url: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          environment: "sandbox" | "production";
          api_key: string;
          base_url: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          environment?: "sandbox" | "production";
          api_key?: string;
          base_url?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      uploads: {
        Row: {
          id: string;
          user_id: string;
          file_name: string;
          file_size: number;
          row_count: number;
          valid_row_count: number;
          invalid_row_count: number;
          status: UploadStatus;
          raw_data: Json | null;
          validation_errors: Json | null;
          processing_started_at: string | null;
          processing_completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_name: string;
          file_size: number;
          row_count?: number;
          valid_row_count?: number;
          invalid_row_count?: number;
          status?: UploadStatus;
          raw_data?: Json | null;
          validation_errors?: Json | null;
          processing_started_at?: string | null;
          processing_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          file_name?: string;
          file_size?: number;
          row_count?: number;
          valid_row_count?: number;
          invalid_row_count?: number;
          status?: UploadStatus;
          raw_data?: Json | null;
          validation_errors?: Json | null;
          processing_started_at?: string | null;
          processing_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      upload_rows: {
        Row: {
          id: string;
          upload_id: string;
          row_number: number;
          raw_data: Json;
          status: RowStatus;
          validation_errors: Json | null;
          package_id: string | null;
          product_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          upload_id: string;
          row_number: number;
          raw_data: Json;
          status?: RowStatus;
          validation_errors?: Json | null;
          package_id?: string | null;
          product_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          upload_id?: string;
          row_number?: number;
          raw_data?: Json;
          status?: RowStatus;
          validation_errors?: Json | null;
          package_id?: string | null;
          product_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          upload_id: string | null;
          user_id: string;
          safepackage_reference: string | null;
          sku: string;
          platform_id: string;
          seller_id: string;
          url: string;
          name: string;
          declared_name: string | null;
          description: string;
          price: number;
          origin_country: string;
          destination_country: string;
          hs_code: string | null;
          ean: string | null;
          categories: string[] | null;
          pieces: number;
          normalize: boolean;
          manufacturer_id: string | null;
          manufacturer_name: string | null;
          manufacturer_address: string | null;
          image_urls: string[] | null;
          screening_status: ScreeningStatus;
          screening_code: number | null;
          screening_reason_code: string | null;
          screening_reason_description: string | null;
          screened_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          upload_id?: string | null;
          user_id: string;
          safepackage_reference?: string | null;
          sku: string;
          platform_id: string;
          seller_id: string;
          url: string;
          name: string;
          declared_name?: string | null;
          description: string;
          price: number;
          origin_country: string;
          destination_country?: string;
          hs_code?: string | null;
          ean?: string | null;
          categories?: string[] | null;
          pieces?: number;
          normalize?: boolean;
          manufacturer_id?: string | null;
          manufacturer_name?: string | null;
          manufacturer_address?: string | null;
          image_urls?: string[] | null;
          screening_status?: ScreeningStatus;
          screening_code?: number | null;
          screening_reason_code?: string | null;
          screening_reason_description?: string | null;
          screened_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          upload_id?: string | null;
          user_id?: string;
          safepackage_reference?: string | null;
          sku?: string;
          platform_id?: string;
          seller_id?: string;
          url?: string;
          name?: string;
          declared_name?: string | null;
          description?: string;
          price?: number;
          origin_country?: string;
          destination_country?: string;
          hs_code?: string | null;
          ean?: string | null;
          categories?: string[] | null;
          pieces?: number;
          normalize?: boolean;
          manufacturer_id?: string | null;
          manufacturer_name?: string | null;
          manufacturer_address?: string | null;
          image_urls?: string[] | null;
          screening_status?: ScreeningStatus;
          screening_code?: number | null;
          screening_reason_code?: string | null;
          screening_reason_description?: string | null;
          screened_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      packages: {
        Row: {
          id: string;
          upload_id: string | null;
          user_id: string;
          shipment_id: string | null;
          safepackage_id: string | null;
          external_id: string;
          house_bill_number: string;
          barcode: string;
          container_id: string | null;
          carrier_id: string | null;
          platform_id: string;
          seller_id: string;
          export_country: string;
          destination_country: string;
          weight_value: number;
          weight_unit: "K" | "L";
          shipper_name: string;
          shipper_line1: string;
          shipper_line2: string | null;
          shipper_city: string;
          shipper_state: string;
          shipper_postal_code: string;
          shipper_country: string;
          shipper_phone: string | null;
          shipper_email: string | null;
          shipper_identifiers: Json | null;
          consignee_name: string;
          consignee_line1: string;
          consignee_line2: string | null;
          consignee_city: string;
          consignee_state: string;
          consignee_postal_code: string;
          consignee_country: string;
          consignee_phone: string | null;
          consignee_email: string | null;
          consignee_identifiers: Json | null;
          status: PackageStatus;
          screening_code: number | null;
          screening_status: string | null;
          label_qr_code: string | null;
          ddpn: string | null;
          total_duty: number | null;
          audit_status: string | null;
          audit_images: string[] | null;
          audit_remark: string | null;
          screened_at: string | null;
          duty_paid_at: string | null;
          screening_response: Json | null;
          original_package_id: string | null;
          resubmission_count: number | null;
          correction_notes: string | null;
          corrected_at: string | null;
          corrected_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          upload_id?: string | null;
          user_id: string;
          shipment_id?: string | null;
          safepackage_id?: string | null;
          external_id: string;
          house_bill_number: string;
          barcode: string;
          container_id?: string | null;
          carrier_id?: string | null;
          platform_id: string;
          seller_id: string;
          export_country: string;
          destination_country?: string;
          weight_value: number;
          weight_unit: "K" | "L";
          shipper_name: string;
          shipper_line1: string;
          shipper_line2?: string | null;
          shipper_city: string;
          shipper_state: string;
          shipper_postal_code: string;
          shipper_country: string;
          shipper_phone?: string | null;
          shipper_email?: string | null;
          shipper_identifiers?: Json | null;
          consignee_name: string;
          consignee_line1: string;
          consignee_line2?: string | null;
          consignee_city: string;
          consignee_state: string;
          consignee_postal_code: string;
          consignee_country: string;
          consignee_phone?: string | null;
          consignee_email?: string | null;
          consignee_identifiers?: Json | null;
          status?: PackageStatus;
          screening_code?: number | null;
          screening_status?: string | null;
          label_qr_code?: string | null;
          ddpn?: string | null;
          total_duty?: number | null;
          audit_status?: string | null;
          audit_images?: string[] | null;
          audit_remark?: string | null;
          screened_at?: string | null;
          duty_paid_at?: string | null;
          screening_response?: Json | null;
          original_package_id?: string | null;
          resubmission_count?: number | null;
          correction_notes?: string | null;
          corrected_at?: string | null;
          corrected_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          upload_id?: string | null;
          user_id?: string;
          shipment_id?: string | null;
          safepackage_id?: string | null;
          external_id?: string;
          house_bill_number?: string;
          barcode?: string;
          container_id?: string | null;
          carrier_id?: string | null;
          platform_id?: string;
          seller_id?: string;
          export_country?: string;
          destination_country?: string;
          weight_value?: number;
          weight_unit?: "K" | "L";
          shipper_name?: string;
          shipper_line1?: string;
          shipper_line2?: string | null;
          shipper_city?: string;
          shipper_state?: string;
          shipper_postal_code?: string;
          shipper_country?: string;
          shipper_phone?: string | null;
          shipper_email?: string | null;
          shipper_identifiers?: Json | null;
          consignee_name?: string;
          consignee_line1?: string;
          consignee_line2?: string | null;
          consignee_city?: string;
          consignee_state?: string;
          consignee_postal_code?: string;
          consignee_country?: string;
          consignee_phone?: string | null;
          consignee_email?: string | null;
          consignee_identifiers?: Json | null;
          status?: PackageStatus;
          screening_code?: number | null;
          screening_status?: string | null;
          label_qr_code?: string | null;
          ddpn?: string | null;
          total_duty?: number | null;
          audit_status?: string | null;
          audit_images?: string[] | null;
          audit_remark?: string | null;
          screened_at?: string | null;
          duty_paid_at?: string | null;
          screening_response?: Json | null;
          original_package_id?: string | null;
          resubmission_count?: number | null;
          correction_notes?: string | null;
          corrected_at?: string | null;
          corrected_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      package_products: {
        Row: {
          id: string;
          package_id: string;
          product_id: string;
          quantity: number;
          declared_value: number;
          declared_name: string | null;
          screening_reference: string | null;
          screening_code: number | null;
          screening_status: string | null;
          screening_reason_code: string | null;
          screening_reason_description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          package_id: string;
          product_id: string;
          quantity?: number;
          declared_value: number;
          declared_name?: string | null;
          screening_reference?: string | null;
          screening_code?: number | null;
          screening_status?: string | null;
          screening_reason_code?: string | null;
          screening_reason_description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          package_id?: string;
          product_id?: string;
          quantity?: number;
          declared_value?: number;
          declared_name?: string | null;
          screening_reference?: string | null;
          screening_code?: number | null;
          screening_status?: string | null;
          screening_reason_code?: string | null;
          screening_reason_description?: string | null;
          created_at?: string;
        };
      };
      shipments: {
        Row: {
          id: string;
          user_id: string;
          upload_id: string | null;
          safepackage_shipment_id: string | null;
          external_id: string;
          master_bill_prefix: string;
          master_bill_serial_number: string;
          originator_code: string | null;
          entry_type: "01" | "11" | "86" | "P" | null;
          shipper_name: string;
          shipper_line1: string;
          shipper_line2: string | null;
          shipper_city: string;
          shipper_state: string;
          shipper_postal_code: string;
          shipper_country: string;
          shipper_phone: string | null;
          shipper_email: string | null;
          shipper_identifiers: Json | null;
          consignee_name: string;
          consignee_line1: string;
          consignee_line2: string | null;
          consignee_city: string;
          consignee_state: string;
          consignee_postal_code: string;
          consignee_country: string;
          consignee_phone: string | null;
          consignee_email: string | null;
          consignee_identifiers: Json | null;
          transport_mode: "AIR" | "TRUCK";
          port_of_entry: string;
          port_of_arrival: string | null;
          port_of_origin: string;
          carrier_name: string;
          carrier_code: string;
          line_number: string;
          firms_code: string | null;
          shipping_date: string;
          scheduled_arrival_date: string;
          terminal_operator: string | null;
          status: ShipmentStatus;
          verification_code: number | null;
          verification_status: string | null;
          verification_reason_code: string | null;
          verification_reason_description: string | null;
          verification_document_type: string | null;
          verification_document_content: string | null;
          registered_at: string | null;
          verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          upload_id?: string | null;
          safepackage_shipment_id?: string | null;
          external_id: string;
          master_bill_prefix: string;
          master_bill_serial_number: string;
          originator_code?: string | null;
          entry_type?: "01" | "11" | "86" | "P" | null;
          shipper_name: string;
          shipper_line1: string;
          shipper_line2?: string | null;
          shipper_city: string;
          shipper_state: string;
          shipper_postal_code: string;
          shipper_country: string;
          shipper_phone?: string | null;
          shipper_email?: string | null;
          shipper_identifiers?: Json | null;
          consignee_name: string;
          consignee_line1: string;
          consignee_line2?: string | null;
          consignee_city: string;
          consignee_state: string;
          consignee_postal_code: string;
          consignee_country: string;
          consignee_phone?: string | null;
          consignee_email?: string | null;
          consignee_identifiers?: Json | null;
          transport_mode: "AIR" | "TRUCK";
          port_of_entry: string;
          port_of_arrival?: string | null;
          port_of_origin: string;
          carrier_name: string;
          carrier_code: string;
          line_number: string;
          firms_code?: string | null;
          shipping_date: string;
          scheduled_arrival_date: string;
          terminal_operator?: string | null;
          status?: ShipmentStatus;
          verification_code?: number | null;
          verification_status?: string | null;
          verification_reason_code?: string | null;
          verification_reason_description?: string | null;
          verification_document_type?: string | null;
          verification_document_content?: string | null;
          registered_at?: string | null;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          upload_id?: string | null;
          safepackage_shipment_id?: string | null;
          external_id?: string;
          master_bill_prefix?: string;
          master_bill_serial_number?: string;
          originator_code?: string | null;
          entry_type?: "01" | "11" | "86" | "P" | null;
          shipper_name?: string;
          shipper_line1?: string;
          shipper_line2?: string | null;
          shipper_city?: string;
          shipper_state?: string;
          shipper_postal_code?: string;
          shipper_country?: string;
          shipper_phone?: string | null;
          shipper_email?: string | null;
          shipper_identifiers?: Json | null;
          consignee_name?: string;
          consignee_line1?: string;
          consignee_line2?: string | null;
          consignee_city?: string;
          consignee_state?: string;
          consignee_postal_code?: string;
          consignee_country?: string;
          consignee_phone?: string | null;
          consignee_email?: string | null;
          consignee_identifiers?: Json | null;
          transport_mode?: "AIR" | "TRUCK";
          port_of_entry?: string;
          port_of_arrival?: string | null;
          port_of_origin?: string;
          carrier_name?: string;
          carrier_code?: string;
          line_number?: string;
          firms_code?: string | null;
          shipping_date?: string;
          scheduled_arrival_date?: string;
          terminal_operator?: string | null;
          status?: ShipmentStatus;
          verification_code?: number | null;
          verification_status?: string | null;
          verification_reason_code?: string | null;
          verification_reason_description?: string | null;
          verification_document_type?: string | null;
          verification_document_content?: string | null;
          registered_at?: string | null;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      api_logs: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          method: string;
          request_body: Json | null;
          status_code: number | null;
          response_body: Json | null;
          package_id: string | null;
          product_id: string | null;
          shipment_id: string | null;
          duration_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          method: string;
          request_body?: Json | null;
          status_code?: number | null;
          response_body?: Json | null;
          package_id?: string | null;
          product_id?: string | null;
          shipment_id?: string | null;
          duration_ms?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          method?: string;
          request_body?: Json | null;
          status_code?: number | null;
          response_body?: Json | null;
          package_id?: string | null;
          product_id?: string | null;
          shipment_id?: string | null;
          duration_ms?: number | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      upload_status: UploadStatus;
      screening_status: ScreeningStatus;
      package_status: PackageStatus;
      shipment_status: ShipmentStatus;
      row_status: RowStatus;
    };
  };
}

// Helper types for easier access
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Convenience type aliases
export type Profile = Tables<"profiles">;
export type Upload = Tables<"uploads">;
export type UploadRow = Tables<"upload_rows">;
export type Product = Tables<"products">;
export type Package = Tables<"packages">;
export type PackageProduct = Tables<"package_products">;
export type Shipment = Tables<"shipments">;
export type ApiLog = Tables<"api_logs">;
export type ApiConfiguration = Tables<"api_configurations">;
