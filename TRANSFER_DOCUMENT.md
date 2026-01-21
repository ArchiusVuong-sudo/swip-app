# SWIP - Project Transfer Document

## Complete End-to-End Documentation for Knowledge Transfer

**Document Version:** 1.1
**Last Updated:** January 2026
**Project:** SWIP (SafePackage Workflow Integration Platform)
**SafePackage API Version:** v1.23

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Project Structure](#4-project-structure)
5. [Environment Setup](#5-environment-setup)
6. [Supabase Database](#6-supabase-database)
7. [Vercel Deployment](#7-vercel-deployment)
8. [GitHub Integration](#8-github-integration)
9. [SafePackage API Integration](#9-safepackage-api-integration)
10. [Key Features & Workflows](#10-key-features--workflows)
11. [API Routes Reference](#11-api-routes-reference)
12. [Credentials & Secrets](#12-credentials--secrets)
13. [Development Workflow](#13-development-workflow)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Project Overview

### What is SWIP?

SWIP (SafePackage Workflow Integration Platform) is a **Next.js application** for customs screening and international shipment management. It integrates with the **SafePackage API** to streamline:

- **Batch screening** of packages via CSV upload
- **Real-time validation** of shipment data
- **Customs decision management** (accepted, rejected, inconclusive, audit required)
- **Shipment consolidation** and CBP (U.S. Customs and Border Protection) verification
- **Document generation** (commercial invoices, packing lists, shipment registers)
- **Complete audit logging** of all data changes

### Business Flow

```
CSV Upload → Parse → Validate Schema → Edit (optional) → Submit
    ↓
SafePackage API (Screen Package)
    ↓
Store Results in Supabase
    ↓
View Packages → Edit/Audit → Submit to Shipment
    ↓
SafePackage API (Register Shipment)
    ↓
Verify with CBP → Generate Docs
```

---

## 2. Tech Stack

### Frontend & Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.2 | React framework with App Router |
| React | 19.2.3 | UI library with concurrent rendering |
| TypeScript | 5 | Type safety (strict mode) |
| Tailwind CSS | 4 | Utility-first CSS styling |
| Radix UI | Latest | Unstyled accessible UI primitives |
| shadcn/ui | - | Pre-styled Radix components |

### State Management & Forms
| Technology | Version | Purpose |
|------------|---------|---------|
| Zustand | 5.0.10 | Client-side state management |
| react-hook-form | 7.71.1 | Form state and validation |
| @hookform/resolvers | 5.2.2 | Zod integration for forms |
| Zod | 4.3.5 | TypeScript-first schema validation |

### Backend & Data
| Technology | Version | Purpose |
|------------|---------|---------|
| Supabase | 2.90.1 | PostgreSQL database + Auth |
| @supabase/ssr | 0.8.0 | Server-side authentication |
| Node.js | - | Runtime for API routes |

### Utilities
| Library | Version | Purpose |
|---------|---------|---------|
| PapaParse | 5.5.3 | CSV parsing |
| date-fns | 4.1.0 | Date formatting |
| qrcode | 1.5.4 | QR code generation |
| xlsx | 0.18.5 | Excel file generation |
| react-dropzone | 14.3.8 | Drag-and-drop uploads |
| Lucide React | 0.562.0 | Icon library |
| Sonner | 2.0.7 | Toast notifications |

---

## 3. Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      SWIP Application                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Browser   │  │  Next.js    │  │    Supabase         │ │
│  │   Client    │──│  API Routes │──│  PostgreSQL + Auth  │ │
│  │  (React 19) │  │  (Node.js)  │  │  (Row Level Sec.)   │ │
│  └─────────────┘  └──────┬──────┘  └─────────────────────┘ │
│                          │                                  │
│                          ▼                                  │
│                  ┌───────────────┐                         │
│                  │  SafePackage  │                         │
│                  │     API       │                         │
│                  │  (External)   │                         │
│                  └───────────────┘                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌─────────────────────┐
              │       Vercel        │
              │  (Hosting + Edge)   │
              └─────────────────────┘
```

### Data Flow

1. **User uploads CSV** → Parsed by PapaParse
2. **Validation** → Zod schemas validate each row
3. **Editing** → Users can fix validation errors
4. **Submission** → Data sent to SafePackage API
5. **Storage** → Results stored in Supabase
6. **Shipment** → Packages grouped into shipments
7. **CBP Verification** → Verify with customs
8. **Documents** → Generate invoices, packing lists

---

## 4. Project Structure

```
/Users/khanhvuongtuan/Desktop/Projects/Coderpush/SWIP/
├── swip-app/                          # Main Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/                # Authentication routes
│   │   │   │   ├── login/page.tsx     # Login page
│   │   │   │   ├── register/page.tsx  # Registration page
│   │   │   │   └── layout.tsx         # Auth layout wrapper
│   │   │   ├── (dashboard)/           # Protected dashboard routes
│   │   │   │   ├── dashboard/page.tsx # Overview statistics
│   │   │   │   ├── uploads/page.tsx   # CSV upload interface
│   │   │   │   ├── packages/          # Package management
│   │   │   │   │   ├── page.tsx       # Package list
│   │   │   │   │   └── [id]/page.tsx  # Package details
│   │   │   │   ├── shipments/         # Shipment management
│   │   │   │   │   ├── page.tsx       # Shipment list
│   │   │   │   │   └── [id]/page.tsx  # Shipment details
│   │   │   │   ├── settings/page.tsx  # User settings
│   │   │   │   └── layout.tsx         # Dashboard layout
│   │   │   ├── api/                   # Server-side API routes
│   │   │   │   ├── uploads/           # Upload endpoints
│   │   │   │   ├── packages/          # Package endpoints
│   │   │   │   ├── shipments/         # Shipment endpoints
│   │   │   │   ├── exports/           # Document generation
│   │   │   │   └── safepackage/       # SafePackage API proxies
│   │   │   ├── layout.tsx             # Root layout
│   │   │   ├── page.tsx               # Root redirect
│   │   │   └── globals.css            # Global styles
│   │   ├── components/
│   │   │   ├── layout/                # Navigation components
│   │   │   ├── uploads/               # CSV upload components
│   │   │   ├── packages/              # Package components
│   │   │   ├── shipments/             # Shipment components
│   │   │   └── ui/                    # 40+ Radix/shadcn components
│   │   ├── lib/
│   │   │   ├── supabase/              # Supabase clients
│   │   │   │   ├── client.ts          # Browser client
│   │   │   │   ├── server.ts          # Server client
│   │   │   │   └── middleware.ts      # Auth middleware
│   │   │   ├── safepackage/           # SafePackage integration
│   │   │   │   ├── client.ts          # API client class
│   │   │   │   ├── types.ts           # API types
│   │   │   │   └── platforms.ts       # Platform list
│   │   │   ├── csv/                   # CSV processing
│   │   │   │   ├── parser.ts          # CSV parsing
│   │   │   │   ├── constants.ts       # Column mappings
│   │   │   │   └── shipment-parser.ts # Shipment CSV
│   │   │   ├── validation/            # Validation schemas
│   │   │   │   └── schemas.ts         # Zod schemas (302 lines)
│   │   │   ├── audit/                 # Audit logging
│   │   │   └── utils/                 # Helper utilities
│   │   ├── types/
│   │   │   └── database.ts            # Supabase types (758 lines)
│   │   ├── stores/
│   │   │   └── environment-store.ts   # Zustand store
│   │   └── middleware.ts              # Auth middleware
│   ├── .vercel/                       # Vercel config
│   │   └── project.json               # Project linking
│   ├── package.json                   # Dependencies
│   ├── tsconfig.json                  # TypeScript config
│   ├── next.config.ts                 # Next.js config
│   ├── vercel.json                    # Vercel settings
│   ├── .env.local                     # Environment variables
│   └── README.md                      # Project README
├── docs/                              # Documentation
│   ├── SafePackage API Specification v1.20.md
│   ├── SafePackage API summary.md
│   └── SWIP credential.md
├── example/                           # Example files
│   └── API_data_template_v2.csv
├── .env                               # Root env vars
└── .mcp.json                          # MCP server config
```

---

## 5. Environment Setup

### Prerequisites

- **Node.js 20+**
- **npm** or **yarn**
- **Supabase account** with project
- **SafePackage API credentials**
- **Vercel account** (for deployment)

### Environment Variables

Create `.env.local` in `/swip-app/`:

```bash
# Vercel (auto-generated when linking)
VERCEL_OIDC_TOKEN="<your-vercel-oidc-token>"

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://jeiigksxxzdaahxpwkhs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>

# SafePackage API Keys (server-side only - NO NEXT_PUBLIC_ prefix!)
SAFEPACKAGE_SANDBOX_API_KEY=<your-sandbox-api-key>
SAFEPACKAGE_PRODUCTION_API_KEY=<your-production-api-key>

# SafePackage Environment (sandbox or production)
NEXT_PUBLIC_SAFEPACKAGE_ENVIRONMENT=sandbox
```

### Installation

```bash
# Navigate to app directory
cd swip-app

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Run linting
npm run lint

# Run tests
npm run test
```

---

## 6. Supabase Database

### Project Details

| Property | Value |
|----------|-------|
| **Project Name** | SWIP |
| **Project ID** | `jeiigksxxzdaahxpwkhs` |
| **Region** | `eu-west-1` |
| **Database URL** | `https://jeiigksxxzdaahxpwkhs.supabase.co` |
| **Database Host** | `db.jeiigksxxzdaahxpwkhs.supabase.co` |
| **PostgreSQL Version** | 17.6.1 |
| **Organization** | `zernzlieosthlajzadbz` |

### Database Schema

#### Core Tables

| Table | Rows | Purpose |
|-------|------|---------|
| `profiles` | 2 | User accounts with company info |
| `uploads` | 11 | CSV upload tracking |
| `upload_rows` | 0 | Individual row validation |
| `products` | 0 | Product details from screening |
| `packages` | 202 | Screened packages |
| `package_products` | 0 | Links products to packages |
| `shipments` | 7 | Consolidated shipments |
| `api_logs` | 6 | API request/response audit |
| `api_configurations` | 0 | User API credentials |
| `audit_logs` | 22 | Change audit trail |
| `submission_reviews` | 0 | Submission review records |

#### Enums

```sql
-- Upload Status
CREATE TYPE upload_status AS ENUM (
  'pending', 'validating', 'validated', 'validation_failed',
  'processing', 'completed', 'completed_with_errors', 'failed'
);

-- Screening Status
CREATE TYPE screening_status AS ENUM (
  'pending', 'accepted', 'rejected', 'inconclusive', 'audit_required'
);

-- Package Status
CREATE TYPE package_status AS ENUM (
  'pending', 'screening', 'accepted', 'rejected', 'inconclusive',
  'audit_required', 'audit_submitted', 'duty_pending', 'duty_paid', 'registered'
);

-- Shipment Status
CREATE TYPE shipment_status AS ENUM (
  'pending', 'registered', 'verification_pending', 'verified', 'rejected', 'failed'
);

-- Row Status
CREATE TYPE row_status AS ENUM (
  'pending', 'valid', 'invalid', 'processing', 'processed', 'failed'
);

-- Audit Action
CREATE TYPE audit_action AS ENUM (
  'row_created', 'row_edited', 'row_deleted', 'bulk_edit',
  'submission_reviewed', 'submission_approved', 'api_submission_confirmed',
  'package_resubmitted', 'validation_override'
);
```

#### Migrations Applied

| Version | Name | Description |
|---------|------|-------------|
| 20260115041411 | `initial_schema` | Base tables and relationships |
| 20260115041440 | `rls_and_triggers` | Row Level Security policies |
| 20260115043759 | `add_processing_results_to_uploads` | Processing results field |
| 20260115065414 | `add_audit_logs_and_hitl_features` | Audit logging system |

#### Row Level Security (RLS)

All tables have RLS enabled. Policies ensure users can only access their own data:

- Users can only view/edit their own uploads, packages, shipments
- `profiles` table links to `auth.users`
- Foreign key constraints maintain referential integrity

### Supabase Client Setup

**Browser Client** (`src/lib/supabase/client.ts`):
```typescript
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Server Client** (`src/lib/supabase/server.ts`):
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```

---

## 7. Vercel Deployment

### Vercel Project Configuration

| Property | Value |
|----------|-------|
| **Project ID** | `prj_5glxxENoRrHqpgr4fhP9nj8Pcm9Q` |
| **Organization ID** | `team_tB2zUrMYqxVXsjpIoGcwzm8s` |
| **Project Name** | `swip-app` |

### vercel.json Configuration

```json
{
  "functions": {
    "src/app/api/uploads/[id]/process/route.ts": {
      "maxDuration": 300
    }
  }
}
```

**Key Settings:**
- **Extended timeout (300 seconds)** for CSV processing endpoint
- Default Next.js 16 configuration for other routes
- Automatic HTTPS and edge caching

### Deployment Methods

#### Method 1: Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Link project (first time)
cd swip-app
vercel link

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

#### Method 2: Git Integration (Recommended)

1. **Connect GitHub Repository** to Vercel
2. Configure **automatic deployments**:
   - `main` branch → Production
   - Other branches → Preview deployments
3. Set **environment variables** in Vercel dashboard

### Environment Variables in Vercel

Configure these in the Vercel dashboard under **Settings → Environment Variables**:

| Variable | Type | Environment |
|----------|------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Plain | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Secret | All |
| `SAFEPACKAGE_SANDBOX_API_KEY` | Secret | Development, Preview |
| `SAFEPACKAGE_PRODUCTION_API_KEY` | Secret | Production |
| `NEXT_PUBLIC_SAFEPACKAGE_ENVIRONMENT` | Plain | Per environment |

### Vercel OIDC Authentication

The project uses OIDC tokens for secure deployments:

```
VERCEL_OIDC_TOKEN=eyJhbGciOiJSUzI1NiIs...
```

This token contains:
- `owner`: `khanhsaypiens-projects`
- `project`: `swip-app`
- `environment`: `development`

---

## 8. GitHub Integration

### Current Status

The project currently has **NO GitHub Actions or CI/CD workflows** configured (`.github/` folder doesn't exist).

### Recommended GitHub Setup

#### Step 1: Initialize Git Repository (if not done)

```bash
cd /Users/khanhvuongtuan/Desktop/Projects/Coderpush/SWIP
git init
git add .
git commit -m "Initial commit"
```

#### Step 2: Create GitHub Repository

```bash
# Using GitHub CLI
gh repo create swip-app --private --source=. --push

# Or manually create on GitHub and add remote
git remote add origin https://github.com/<your-username>/swip-app.git
git push -u origin main
```

#### Step 3: Connect to Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **Add New Project**
3. Import from GitHub
4. Select the `swip-app` repository
5. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `swip-app`
   - **Environment Variables**: Add all from section above

#### Step 4: Enable Automatic Deployments

Vercel automatically deploys on:
- **Push to main** → Production deployment
- **Pull request** → Preview deployment with unique URL

### Recommended GitHub Actions (Optional)

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: swip-app/package-lock.json

      - name: Install dependencies
        working-directory: swip-app
        run: npm ci

      - name: Run linting
        working-directory: swip-app
        run: npm run lint

      - name: Run tests
        working-directory: swip-app
        run: npm run test:run

      - name: Type check
        working-directory: swip-app
        run: npx tsc --noEmit

  build:
    runs-on: ubuntu-latest
    needs: test

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: swip-app/package-lock.json

      - name: Install dependencies
        working-directory: swip-app
        run: npm ci

      - name: Build
        working-directory: swip-app
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
        run: npm run build
```

### Branch Strategy

Recommended Git workflow:

```
main (production)
  ↑
develop (staging)
  ↑
feature/* (feature branches)
```

---

## 9. SafePackage API Integration

### API Environments

| Environment | Base URL | Purpose |
|-------------|----------|---------|
| **Sandbox** | `https://sandbox.safepackage.com` | Development & testing |
| **Production** | `https://api.safepackage.com` | Live operations |

### Client Credentials

**Sandbox:**
- Client ID: `72efc51f-60c5-44fb-b727-c669f8fcf12b`
- API Key: `qmHpZv4dDPBqYOtnMfdv5H3SXAiUYRRCGHsOeDV3paQ1WdqET6RbytnCB0Sa14LR`

**Production:**
- Client ID: `a69b0a00-76e6-4ac5-b8e2-573bb9e92e7a`
- API Key: `KYBty0Gp8c9EwGbEvz32OXxYA76NEosvGSYPuqG6KeCKsBfBAxqIEKVDkusjkoXj`

### Authentication

All requests must include the `Authorization` header:

```
Authorization: ApiKey <your-api-key>
```

### SafePackage Client Class

Located at `src/lib/safepackage/client.ts`:

```typescript
import { SafePackageClient, getSafePackageClient } from "@/lib/safepackage/client";

// Get client for current environment
const client = getSafePackageClient();

// Or specify environment
const sandboxClient = getSafePackageClient("sandbox");
const prodClient = getSafePackageClient("production");

// Available methods:
await client.getPlatforms();              // Get e-commerce platforms
await client.screenProduct(data);         // Screen single product
await client.screenPackage(data);         // Screen complete package
await client.submitAudit(data);           // Submit audit images
await client.payDuty(data);               // Process duty payment
await client.registerShipment(data);      // Register shipment
await client.verifyShipment(data);        // Verify with CBP
```

### API Endpoints Used (v1.23)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/v1/platform` | List supported e-commerce platforms |
| POST | `/v1/product/screen` | Screen a single product for compliance |
| POST | `/v1/package/screen` | Screen a package (multiple products) |
| POST | `/v1/package/audit` | Upload audit images if required |
| POST | `/v1/duty/pay` | Pay customs duties and obtain DDP proof |
| POST | `/v1/shipment/register` | Register a shipment (consolidation) |
| POST | `/v1/shipment/verify` | Verify shipment and obtain CBP document |

> **Note:** The endpoint `POST /v1/customs/s321/shipment` (Section 321 pilot data submission) has been **removed** in API v1.23 and is no longer supported.

---

## 10. Key Features & Workflows

### Feature 1: CSV Upload & Validation

**Flow:**
1. User drags CSV file to dropzone
2. PapaParse parses CSV data
3. Zod schemas validate each row
4. Validation errors displayed per row
5. User can edit rows individually or bulk
6. Changes logged to audit trail
7. Final review before submission

**Key Files:**
- `src/app/(dashboard)/uploads/page.tsx`
- `src/components/uploads/csv-dropzone.tsx`
- `src/components/uploads/csv-preview.tsx`
- `src/lib/csv/parser.ts`
- `src/lib/validation/schemas.ts`

### Feature 2: Package Screening

**Flow:**
1. Valid rows submitted to SafePackage API
2. API returns screening decision
3. Results stored in Supabase
4. User views packages with status
5. For inconclusive: submit audit images
6. Process duty payments if required

**Status Workflow:**
```
pending → screening → accepted
                   → rejected
                   → inconclusive → audit_submitted
                   → audit_required → audit_submitted
                                   → duty_pending → duty_paid → registered
```

### Feature 3: Shipment Management

**Flow:**
1. Create shipment with packages
2. Register with SafePackage API
3. Verify with CBP
4. Generate customs documents
5. Track verification status

**Status Workflow:**
```
pending → registered → verification_pending → verified
                                           → rejected
                                           → failed
```

### Feature 4: Document Generation

**Available Documents:**
- Commercial Invoice (Excel)
- Packing List (Excel)
- Shipment Register (Excel)

**Endpoints:**
- `GET /api/exports/commercial-invoice`
- `GET /api/exports/packing-list`
- `GET /api/exports/shipment-register`

---

## 11. API Routes Reference

### Upload Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/uploads` | List user's uploads |
| POST | `/api/uploads` | Create new upload |
| GET | `/api/uploads/[id]` | Get upload details |
| POST | `/api/uploads/[id]/process` | Process CSV (5-min timeout) |
| DELETE | `/api/uploads/[id]` | Delete upload |

### Package Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/packages` | List packages (with filters) |
| POST | `/api/packages` | Create new package |
| GET | `/api/packages/[id]` | Get package details |
| PUT | `/api/packages/[id]` | Update package |
| DELETE | `/api/packages/[id]` | Delete package |
| POST | `/api/packages/[id]/resubmit` | Resubmit rejected package |

### Shipment Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/shipments` | List shipments |
| POST | `/api/shipments` | Create and register shipment |
| GET | `/api/shipments/[id]` | Get shipment details |
| PUT | `/api/shipments/[id]` | Update shipment |
| DELETE | `/api/shipments/[id]` | Delete shipment |
| POST | `/api/shipments/[id]/verify` | Verify with CBP |
| GET | `/api/shipments/[id]/document` | Get shipment documents |
| POST | `/api/shipments/upload` | Bulk shipment upload |

### Exports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/exports/commercial-invoice` | Generate commercial invoice |
| GET | `/api/exports/packing-list` | Generate packing list |
| GET | `/api/exports/shipment-register` | Generate shipment register |

### SafePackage Proxy

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/safepackage/platforms` | Get supported platforms |

---

## 12. Credentials & Secrets

### Summary of All Credentials

| Service | Credential Type | Location |
|---------|-----------------|----------|
| Supabase | Project URL | `.env.local` |
| Supabase | Anon Key | `.env.local` |
| Supabase | MCP Token | `.mcp.json` |
| SafePackage | Sandbox API Key | `.env.local` |
| SafePackage | Production API Key | `.env.local` |
| Vercel | OIDC Token | `.env.local` |

### Security Notes

1. **Never commit secrets** to Git
2. Add `.env.local` to `.gitignore`
3. Use Vercel environment variables for production
4. Rotate keys periodically
5. SafePackage keys are **server-side only** (no `NEXT_PUBLIC_` prefix)

### Supabase MCP Configuration

For AI assistant integration (`.mcp.json`):

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp",
      "headers": {
        "Authorization": "Bearer <supabase-mcp-token>"
      }
    }
  }
}
```

---

## 13. Development Workflow

### Daily Development

```bash
# Start development server
cd swip-app
npm run dev

# Open browser
open http://localhost:3000
```

### Making Changes

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes
3. Run linting: `npm run lint`
4. Run tests: `npm run test:run`
5. Commit changes: `git commit -m "Add my feature"`
6. Push to GitHub: `git push origin feature/my-feature`
7. Create Pull Request
8. Vercel creates preview deployment
9. Review and merge to `main`
10. Vercel deploys to production

### Database Changes

1. Create migration in Supabase dashboard
2. Test locally
3. Update `src/types/database.ts` if needed
4. Run migration on production

### Adding New Dependencies

```bash
# Add production dependency
npm install <package-name>

# Add dev dependency
npm install -D <package-name>
```

---

## 14. Troubleshooting

### Common Issues

#### 1. "NEXT_PUBLIC_SUPABASE_URL is not defined"

**Cause:** Environment variables not loaded

**Solution:**
```bash
# Ensure .env.local exists and has correct values
cat swip-app/.env.local

# Restart development server
npm run dev
```

#### 2. SafePackage API returns 401

**Cause:** Invalid or expired API key

**Solution:**
1. Check `SAFEPACKAGE_*_API_KEY` in `.env.local`
2. Verify key matches environment (sandbox vs production)
3. Check `NEXT_PUBLIC_SAFEPACKAGE_ENVIRONMENT` value

#### 3. Vercel deployment fails

**Cause:** Missing environment variables in Vercel

**Solution:**
1. Go to Vercel dashboard → Settings → Environment Variables
2. Add all required variables
3. Redeploy

#### 4. CSV processing times out

**Cause:** Large CSV file exceeding 2-minute default

**Solution:** Already configured in `vercel.json`:
```json
{
  "functions": {
    "src/app/api/uploads/[id]/process/route.ts": {
      "maxDuration": 300
    }
  }
}
```

#### 5. RLS policy blocking data access

**Cause:** User trying to access another user's data

**Solution:**
1. Verify user is authenticated
2. Check RLS policies in Supabase
3. Ensure `user_id` matches authenticated user

### Debug Mode

Enable verbose logging:

```typescript
// In SafePackage client
console.log("SafePackage request:", JSON.stringify(data, null, 2));
```

### Logs

- **Vercel Logs:** Dashboard → Deployments → Functions
- **Supabase Logs:** Dashboard → Logs
- **Browser Console:** DevTools → Console

---

## Quick Reference

### Scripts

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
npm run test     # Run tests (watch mode)
npm run test:run # Run tests once
```

### Important URLs

| Service | URL |
|---------|-----|
| Local Dev | http://localhost:3000 |
| Supabase Dashboard | https://supabase.com/dashboard/project/jeiigksxxzdaahxpwkhs |
| Vercel Dashboard | https://vercel.com/khanhsaypiens-projects/swip-app |
| SafePackage Sandbox | https://sandbox.safepackage.com |
| SafePackage Production | https://api.safepackage.com |

### Key File Paths

| Purpose | Path |
|---------|------|
| Main app | `swip-app/src/app/` |
| Components | `swip-app/src/components/` |
| Libraries | `swip-app/src/lib/` |
| Types | `swip-app/src/types/database.ts` |
| Validation | `swip-app/src/lib/validation/schemas.ts` |
| SafePackage Client | `swip-app/src/lib/safepackage/client.ts` |
| Environment | `swip-app/.env.local` |
| Vercel Config | `swip-app/vercel.json` |

---

**Document End**

*For questions or issues, contact the development team.*
