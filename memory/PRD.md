# OpenRTB 2.5/2.6 Bidder with Campaign Manager - PRD

## Application Name: Innoviedge DSP Platform

## Original Problem Statement
Build a Demand-Side Platform (DSP) Bidder that handles OpenRTB 2.5/2.6 bid requests, manages campaigns with comprehensive targeting, and provides real-time bidding decisions.

## Architecture
- **Backend**: FastAPI + MongoDB + WebSocket
- **Frontend**: React + Tailwind + Shadcn
- **Bidding Engine**: Real-time matching with targeting rules
- **Real-time**: WebSocket for live bid stream

## Bug Fixes (March 2026)

### 1. WebSocket Reconnection Loop Fix
- **Issue**: Platform was logging out frequently with "Failed to execute postMessage on Window: Request object could not be cloned" error
- **Root Cause**: Infinite WebSocket reconnection attempts when token was invalid/expired
- **Fix Applied**:
  - Added response interceptor in `/app/frontend/src/lib/api.js` to handle 401/403 errors cleanly
  - Limited WebSocket reconnection attempts to 3 with exponential backoff in `/app/frontend/src/context/NotificationContext.jsx`
  - Clean error objects now prevent postMessage cloning issues

### 2. Impression Pixel Integration in Bid Response
- **Issue**: Impression pixels were not being included in the bid response when running campaigns
- **Fix Applied**:
  - Updated `/app/backend/openrtb_handler.py` to inject impression pixels into `adm` field
  - Banner creatives: Appends 1x1 pixel `<img>` tags to ad markup
  - Video creatives: Injects `<Impression>` tags into VAST XML
  - Native creatives: Adds `imptrackers` array to native response
  - JS Tag creatives: Appends pixel tags to tag content

### 3. Frequency Capping Input Fields Fix
- **Issue**: Unable to change field values in frequency capping section during campaign create/update
- **Fix Applied**:
  - Updated `/app/frontend/src/pages/CampaignWizard/steps/ScheduleStep.jsx`
  - Changed `value={form.frequency_cap_count}` to `value={form.frequency_cap_count ?? ""}`
  - Improved onChange handlers to properly handle empty values and partial input
  - Added `data-testid` attributes for all frequency capping fields

## Implemented Features

### Core Bidding (Phases 1-3)
- OpenRTB 2.5/2.6 parser with version detection
- Campaign Manager with full CRUD
- Creative Management (banner/video/native/audio)
- Win/Billing notification callbacks
- Budget pacing, Bid shading
- Frequency capping, SPO, ML-based prediction

### Analytics & Management (Phases 4-8)
- Campaign Performance Insights
- SSP Token Authentication (16-char hex tokens)
- SSP Performance Analytics
- Automated Bid Optimization
- Cross-Campaign Attribution
- WebSocket Real-time Bid Stream
- Campaign Creation Wizard (8-step) - IO step removed

### Creative Tracking & Verification (March 2026)

**Third Party JS Tag Creative Type (NEW):**
- New creative type: "Third Party JS Tag" (`js_tag`)
- Full settings UI with:
  - Vendor Name (e.g., Google, Criteo, TTD)
  - Tag Type selection: Script Tag, iFrame, Document.write
  - Tag URL (optional external URL)
  - Tag Content/Code textarea for pasting complete tag
  - Container Width/Height for ad dimensions
  - HTTPS Secure checkbox
- Live preview panel showing tag configuration
- Full CRUD support (create, read, update, delete)

**Backend Models Added:**
- `JSTagCreative` model with: tag_content, tag_url, width, height, is_secure, vendor, tag_type
- `ImpressionPixel` model with: id, name, url, event, enabled
- Added `js_tag_data` field to Creative and CreativeCreate models

**Impression Pixels:**
- Standalone section (removed from Third Party Tags tab)
- 1x1 tracking pixels for impression counting
- Fire events: Impression, Viewable, Click, Complete, First Quartile, Midpoint, Third Quartile
- Enable/disable toggle per pixel
- Full CRUD support (add, edit, remove)

### Campaign Wizard Enhancements (December 2025)

**Optimization & Pricing:**
- New optimization goals: CPS (Cost per Session), CPTV (Cost per True View), CPCV (Cost per Completed View)
- Bid Pricing Type dropdown with CPM, CPC, CPA, CPV, CPCV, CPS options

**Advanced Geographic Targeting:**
- Include/Exclude logic for countries, states, cities, regions, postal codes
- Hyper-Local Radius Targeting with lat/lon coordinates
- Include/Exclude type for each radius point
- Enhanced Exclude Location tab matching Include functionality

**Audience Segments:**
- Affinity Segments (15 categories: Tech Enthusiasts, Auto Enthusiasts, etc.)
- In-Market Segments (16 categories: Autos, Real Estate, Travel, etc.)

**Inventory & Supply Control:**
- Domain/URL Allowlist and Blocklist with bulk input (CSV upload, comma-separated, line-by-line)
- App Allowlist and Blocklist (bundle IDs) with bulk input
- Enhanced Ad Placement Controls:
  - Display Placements: Above Fold, Below Fold, Unknown (Include/Exclude)
  - Display in Content: In-article, In-feed, Interstitial, In-banner, Unknown (Include/Exclude)
  - Native Placements: In-article, In-feed, Peripheral, Recommendation, Unknown (Include/Exclude)
- Supply Source filtering with Include/Exclude SSPs (14 SSPs)

**Device & Tech Targeting:**
- OS Version targeting (Android 8-14, iOS 13-18, Windows 7-11, etc.)
- Browser Include/Exclude targeting (10 browsers: Chrome, Safari, Firefox, Edge, Opera, Samsung Internet, UC Browser, Brave, IE, Other/Unknown)
- Language Include/Exclude with full language list

**Demographics:**
- Parental Status (Parent vs Non-Parent)

**Frequency Capping:**
- User Level vs Campaign Level capping
- Daily and Lifetime caps per user
- Flexible period options (hour, day, week, month, lifetime)

**Workflow Simplification:**
- Removed Insertion Orders (IOs) and Line Items from campaign creation
- Campaign Wizard reduced from 9 to 8 steps
- IO page removed from platform sidebar and routes

### Creative Management (December 2025)

**Format-Based Organization:**
- Tabbed interface: All, Display, Video, Native, JS Tags
- Count badges showing creatives per format
- Video sub-categories: Pre-roll 15s, Pre-roll 30s, Mid-roll/Other

**Visual Previews:**
- Card-based layout with aspect-ratio preview areas
- Display: HTML Banner icons, image previews
- Video: Play button with duration badge (15s, 30s, etc.)
- Native: Card preview with icon and title
- JS Tags: Code icon preview
- Size badges on all creatives
- Hover effects with Preview button overlay

### UI/UX Improvements (Phase 10 - December 2025)

**Campaign Wizard Enhancements:**
- Full country dropdown with 50+ countries (searchable)
- Country selection shows as removable badges
- Improved device type and OS targeting badges

**Creative Editor - Video Support:**
- Video Source Type toggle: VAST Tag vs RAW Video Upload
- VAST Tag Configuration with version selection (2.0 - 4.2)
- RAW Video file upload support
- Video preview panel:
  - VAST Tag: Shows icon, version badge, URL, duration, "Test VAST Tag" button
  - RAW Upload: Native video player with controls

**Theme Consistency:**
- Dropdowns properly styled in both dark/light themes
- Toggle switches respect theme colors
- All form inputs have theme-aware styling
- Badge colors optimized for both themes

**Badge Color Improvements:**
- Active: Vibrant green (#10B981)
- Paused: Amber/orange (#F59E0B)
- Draft: Neutral gray (#94A3B8)
- Error: Clear red (#EF4444)
- Info: Blue (#3B82F6)

### Ad Performance Report (December 2025 - March 2026 Enhancements)

**Report Builder UI:**
- Interactive configuration with dimension selectors
- Date range picker with start/end dates
- Campaign and Creative filter dropdowns
- Generate Report button with loading state
- Three-tab workflow: Templates → Configure → Results

**Dimensions (11 Total - Group By):**
- Campaign Name (Campaign identifier)
- Creative Name (Creative asset name)
- Source (SSP/Exchange source)
- Domain (Publisher domain)
- Bundle (App bundle ID) - NEW
- App Name (Application name) - NEW
- Country (User country) - NEW
- City (User city) - NEW
- IP Address (User IP) - NEW
- OS (Operating system) - NEW
- Make (Device manufacturer) - NEW

**Selectable Metrics (15 Total):**

*Core Metrics (6):*
- Impressions, Clicks, CTR, Conversions, Spend, Win Rate

*Derived Metrics (3):*
- eCPM, CPC, CPV

*Video Metrics (6):*
- Q1 (25%), Q2 (50%), Q3 (75%), Completed (100%), Completion Rate, VTR

**Quick Metric Selection:**
- "All" button - selects all 15 metrics
- "Core" button - selects core + derived metrics
- "Video" button - selects video metrics only

**Results Display:**
- 5 Summary Cards: Total Impressions, Total Clicks, Total Spend, Total Conversions, Video Completed
- Search in results functionality
- Sortable columns (click headers)
- Pagination with configurable rows per page (10/25/50/100)
- Real Data / Mock Data badge indicator

**Export Functionality:**
- CSV download with all columns and headers
- Excel (XLSX) download with colored headers and formatting

**Data Sources:**
- Uses REAL DATA from bid_logs when available
- Falls back to MOCK DATA for demonstration when no bid activity exists

## Key API Endpoints

### Bidding
- `POST /api/bid/{endpoint_token}` - SSP-specific bid endpoint
- `WS /api/ws/bid-stream` - Real-time bid stream

### Campaigns & Creatives
- `GET/POST /api/campaigns` - Campaign management
- `GET/POST /api/creatives` - Creative management
- `POST /api/upload/image` - Image upload
- `GET /api/reference/all` - All reference data

### Media Planning & IOs
- `POST /api/media-planner/forecast` - Campaign performance forecast
- `GET /api/media-planner/benchmarks` - Industry benchmarks
- `POST /api/media-planner/recommend-strategy` - Strategy recommendations
- `GET/POST /api/insertion-orders` - Insertion Orders CRUD
- `GET/POST /api/line-items` - Line Items CRUD
- `POST /api/line-items/recommend` - Line Item recommendations

### Analytics
- `GET /api/ssp-analytics/overview` - SSP performance
- `GET /api/bid-optimization/status` - Bid optimization
- `GET /api/attribution/analysis` - Attribution analysis

## Navigation Structure
Dashboard | Campaigns | Compare | Media Planner | Insertion Orders | Creatives | Editor | 
SSP Endpoints | SSP Analytics | Bid Logs | Bid Stream | Reports | 
Budget Pacing | Insights | ML Models | Bid Optimizer | A/B Testing | 
Fraud | Audiences | Attribution | Migration

## Routes
- `/campaigns/new` - DV360-style Campaign Wizard (8 steps, create)
- `/campaigns/:id/edit` - DV360-style Campaign Wizard (8 steps, edit)
- `/media-planner` - Media Planning & Forecasting
- `/creatives` - Creative Management with format tabs

## Campaign Wizard Steps
1. **Campaign Overview** - Name, IAB Categories, Goals, KPIs
2. **Budget & Bidding** - Currency, Pricing Type, Budget, Pacing, Inventory Sources
3. **Targeting** - Geography, Device, Inventory, Supply, Contextual, Technical (6 tabs)
4. **Audience** - Affinity, In-Market, 1st/3rd Party Audiences, Demographics, Lookalike
5. **Creatives** - Creative Selection
6. **Schedule & Pacing** - Flight Dates, Frequency Capping, Dayparting
7. **Brand Safety** - Safety Level, Blocked Categories/Keywords/Domains
8. **Measurement** - Conversion Tracking, Attribution Model

## Tech Stack
- **Backend**: FastAPI, Motor, Pydantic, WebSockets
- **Frontend**: React, Tailwind CSS, Shadcn/UI, Recharts
- **Database**: MongoDB

## Prioritized Backlog

### Completed (December 2025)
- [x] Full country dropdown in Campaign Wizard
- [x] Theme support for all dropdowns and toggles
- [x] Video creative with VAST tag OR RAW upload
- [x] VAST version selection (2.0-4.2)
- [x] Video preview for VAST tags
- [x] Improved badge color scheme
- [x] **DV360-Style Campaign Wizard (Phase 11)**
  - Redesigned to match Google DV360 UI
  - Persistent sidebar navigation with 5 steps
  - Step indicators: blue (active), green (completed), gray (pending)
  - Steps: Campaign basics → Budget & bidding → Targeting → Creatives → Additional settings
  - Removed old tabbed CampaignForm.jsx
  - Single "Create Campaign" button on campaigns list
  - Edit mode pre-populates all fields and shows all steps as completed
- [x] **SSP Performance Analytics UI (Phase 12)**
  - Overview stats cards: Total SSPs, Requests, Bid Rate, Win Rate, Spend
  - Performance comparison bar chart (Recharts)
  - Request distribution donut chart
  - SSP rankings table with ranking badges
  - Top performers tabbed panel (Requests, Win Rate, Spend)
  - Interactive SSP details panel with:
    - Bid Rate / Win Rate metrics
    - Response time stats with progress bar
    - Hourly activity area chart
    - Top campaigns distribution
    - Regenerate token button
  - Empty state when no SSPs exist
  - Refresh button for real-time updates
- [x] **Automated Bid Optimization UI (Phase 13)**
  - Overview stats cards: Total Campaigns, Optimization Enabled, Below Target, On Target
  - Campaign Bid & Win Rate comparison bar chart
  - Recommendations panel with actionable suggestions and "Optimize" buttons
  - Campaign table with tabs (All, Enabled, Below Target)
  - Win rate progress bar and status icons (up/down arrows)
  - Enable optimization dialog with:
    - Target win rate configuration
    - Auto-adjust vs Manual mode toggle
    - "How it works" explanation
  - Run optimization, View history, Disable buttons
  - Optimization history panel with bid adjustment timeline
- [x] **Backend Refactoring (Phase 14)**
  - Refactored server.py from 3,650 lines to ~80 lines
  - Created modular router architecture:
    - `routers/shared.py` - DB connection, utilities, WebSocket manager
    - `routers/reference.py` - Reference data (IAB categories, device types, etc.)
    - `routers/campaigns.py` - Campaign CRUD operations
    - `routers/creatives.py` - Creative CRUD operations
    - `routers/bidding.py` - SSP endpoints, bid handling, win/billing notifications
    - `routers/analytics.py` - SSP analytics, reports, pacing, dashboard
    - `routers/optimization.py` - Bid optimization, ML, frequency capping, SPO
    - `routers/attribution.py` - Cross-campaign attribution
    - `routers/misc.py` - Currencies, A/B testing, audiences, uploads, insights, fraud
  - Fixed Dashboard chartData format compatibility
  - All 25 backend API tests passing
  - 100% frontend page functionality verified

### Completed (December 2025 - Phase 15)
- [x] **Advanced Campaign Enhancement System**
  - Enhanced Campaign Wizard with 8 steps (was 5):
    - Campaign Overview (Goals, KPIs, Target Audience)
    - Budget & Bidding (6 strategies, pacing, inventory sources)
    - Targeting (Geography, Device, Contextual, Technical tabs)
    - Audience (Demographics, Age, Gender, Income, Languages, Lookalike)
    - Creatives (selection with best practices)
    - Schedule & Pacing (Flight dates, Frequency capping, Dayparting)
    - Brand Safety (Levels, Content exclusions, Blocked keywords/domains)
    - Measurement (Conversion tracking, Attribution models)
  - Strategy recommendations based on campaign goal
  - Performance forecast integration in wizard
- [x] **Media Planner Module**
  - Campaign Planning Parameters (Budget, Duration, Goal, Creative Type)
  - Generate Plan with forecasting:
    - Estimated Impressions, Reach, Clicks, Conversions
    - CPM, CPC, CPA projections
    - Confidence level indicator
  - Budget Allocation Recommendations (pie chart)
  - Strategy Recommendations (Bidding, Frequency, Pacing, Inventory)
  - Line Item Recommendations (Prospecting, Retargeting, Lookalike, Contextual)
  - Optimization Checkpoints timeline
  - Industry Benchmarks by Format (Display, Video, Native, CTV, Audio)
  - **"Create Campaign from Plan" Feature**: One-click campaign creation with pre-filled:
    - Budget (Total and Daily calculated)
    - Bidding Strategy from recommendations
    - Pacing type
    - Frequency caps
    - Inventory sources
    - Forecast reference data
  - **MOCKED**: Forecasting uses mock data (YouTube/GDN real APIs flagged for later)
- [x] **IO & Line Items Integrated into Campaign Wizard** (Step 7 of 9)
  - Toggle to enable Insertion Order structure
  - IO configuration: Name, Structure Type (Audience/Tactic/Goal)
  - Real-time budget tracking:
    - Total Campaign Budget
    - Allocated to Line Items
    - Remaining (color-coded)
  - Line Item Management:
    - Add/Remove line items inline
    - Configure per line item: Type, Budget, Bid Strategy, Inventory Source
    - Line Item Types: Prospecting, Retargeting, Contextual, Audience, Lookalike
    - Suggested Line Items quick-add buttons
  - Data persisted with campaign creation
- [x] **Standalone Insertion Orders Page** at `/insertion-orders`
  - Full CRUD for IOs with stats overview
  - Expandable IOs showing nested Line Items
  - AI-powered Line Item recommendations
- [x] **Navigation Updates**
  - Added "Media Planner" to sidebar
  - Added "Insertion Orders" to sidebar
  - Total 20 navigation items
- [x] **Bulk Campaign Management**
  - Multi-select checkboxes for campaigns
  - Bulk actions bar: Activate, Pause, Delete selected campaigns
  - Select all / Clear selection
  - Confirmation dialog for bulk delete
- [x] **Table Column Sorting**
  - Sortable columns: Name, Status, Bid Price, Daily Budget, Bids, Wins
  - Click column header to sort ascending/descending
  - Visual indicators (arrows) for sort direction
- [x] **Campaign Duplication**
  - "Duplicate" option in campaign dropdown menu
  - Creates copy with "(Copy)" suffix
  - Resets status to draft, clears metrics (bids/wins)
  - Resets budget spent counters
- [x] **Video Upload to Cloud Storage**
  - Video upload endpoint with chunked upload support (5MB chunks)
  - Supports MP4, WebM, OGG formats up to 100MB
  - Upload progress indicator with percentage
  - Video preview after upload
  - Three video source options in CreativeForm:
    - VAST URL with validation
    - VAST XML with validation
    - Direct video upload
- [x] **VAST Tag Validation**
  - Full VAST 2.0/3.0/4.x XML parsing
  - Validates: Ad element, InLine/Wrapper, Impression, Creatives, MediaFiles
  - Extracts: Duration, Click URL, Media Files, Tracking Events
  - Reports errors and warnings separately
  - Auto-fills duration from valid VAST
  - Shows media file details (type, dimensions, bitrate)
  - Wrapper detection
- [x] **Campaign Wizard UI Enhancements (Phase 16)**
  - **Overview Step:**
    - Replaced "Business/Product" with IAB Categories dropdown (200+ categories)
    - Removed "Target Audience Description"
  - **Budget & Bidding Step:**
    - Removed Bid Price field
    - Added Currency dropdown (AED, USD, INR)
    - Added Bid Pricing Type dropdown (CPM, CPC, CPA, CPV)
    - All selections use dropdowns
  - **Targeting Step - Enhanced Geo Targeting:**
    - Countries dropdown (50+ countries globally)
    - States/Regions dropdown (dynamically based on selected country)
    - Cities dropdown (dynamically based on selected country)
    - Pincodes/ZIP codes input with tags
    - Latitude/Longitude input with radius selector
    - Telecom Operators dropdown (dynamically based on country)
  - **Audience Step:**
    - First Party Audiences: Create/Import input + Existing dropdown
    - Third Party Audiences: Create/Import input + Data Provider segments dropdown
    - All demographic selections converted to dropdowns (Age, Gender, Income, Languages)

### Bug Fixes (March 2026)
- [x] **Campaign Validation Errors Fixed** - Resolved two validation issues:
  1. Added missing `bid_price` field to campaign payload (was causing "Field required" error)
  2. Fixed `latitude`/`longitude` empty string issue - now converts empty strings to `null` (was causing "Input should be a valid number" error)
- [x] **Integer Input '0' Prefix Bug Fixed** - Created custom NumberInput component (`/app/frontend/src/components/ui/number-input.jsx`) to handle numeric inputs correctly without prepending '0'
- [x] **India Geo-Targeting Enhancement** - Implemented comprehensive India states and tiered cities (Tier 1/2/3) in targeting step
- [x] **Creative Preview Not Working** - Fixed preview modal to handle missing `ad_markup` or `image_url` gracefully
- [x] **Campaign KPI Not Saving** - Fixed form hook to properly load `kpi_target` value for existing campaigns
- [x] **Bid Stream Total Requests Bug Fixed (P0)** - Added global `bid_stream_stats` counter that syncs from `ssp_endpoints` collection. Frontend now uses server-provided stats instead of local array length. Shows accurate total requests (47,588 vs previous stuck ~50)
- [x] **SSP Analytics Spend Calculation Fixed (P1)** - Fixed corrupt spend data ($561.25 → $0.59). Added `POST /api/ssp-analytics/recalculate-stats` endpoint to recalculate from bid_logs using correct formula: `sum(win_price/1000)`. Old bug was adding full CPM value instead of CPM/1000 per impression
- [x] **Ad Performance Report Data Accuracy Verified (P2)** - Confirmed dimensions (source, domain, bundle, app_name, ip, device_ifa) are correctly pulled from `request_summary` in bid_logs. "Unknown" domain for app inventory is expected (apps have bundles, not domains)
- [x] **Ad Performance Report Campaign Filter Fixed** - Fixed frontend filter logic that was comparing campaign_id (UUID) with campaign_name (string). Now correctly looks up campaign name from ID before filtering
- [x] **Ad Performance Report Spend Calculation Fixed** - Fixed spend formula in `analytics.py` to use `win_price/1000` (correct) instead of raw `win_price` (was inflating spend by 1000x)
- [x] **Ad Performance Report Win Rate Display Fixed** - Fixed `formatPercent` function that was multiplying already-calculated percentages by 100 again (turning 25% into 2500%)
- [x] **Ad Performance Report Impressions Filter** - Now only shows rows where impressions > 0, filtering out bid-only entries without wins
- [x] **Campaign KPI Target Field Fix** - Fixed NumberInput component to properly handle editing and display values. Added focus/blur tracking, selection on focus, and proper value sync between internal state and external prop
- [x] **Audio Creative Type Support** - Added full Audio creative support including:
  - Audio VAST URL with validation
  - Audio VAST XML with validation  
  - Direct audio file upload (MP3, OGG, WAV, AAC)
  - Companion banner configuration (optional)
  - Duration selection (15/30/60 seconds)
  - MIME types configuration
- [x] **Native Creative Enhancements** - Enhanced native creative form with:
  - Icon upload (80x80) with both URL input and file upload button
  - Main image upload (1200x627) with both URL input and file upload button
  - Sponsored By field
  - Rating field (1-5)
  - Price field
- [x] **Creatives List Audio Tab** - Added Audio tab to creatives listing page with pink/magenta color scheme
- [x] **Campaign KPI Fields Fixed (CRITICAL)** - Added kpi_type and kpi_target fields to Campaign model (were missing). Now properly saved to database during create/update operations
- [x] **Unified Create Creative Button** - Merged "Advanced Editor" and "Create Creative" buttons into single dropdown with:
  - Standard Creatives: Banner/Display, Video, Native, Audio
  - Advanced: JS Tag / Code Editor
- [x] **Enhanced Creative Preview** - Fixed preview modal for all types including audio (VAST URL/XML display, audio player), native (with rating/price), and proper fallbacks
- [x] **Audio Creative Live Preview Enhancements (March 2026)** - Enhanced Audio creative editor with:
  - Live preview shows companion banner first (on top), then audio player below
  - Auto-capture height/width from uploaded companion banner image
  - Auto-detect dimensions from banner URL via refresh button
  - Width/Height input fields allow manual size adjustment
  - Preview reflects the adjusted banner size with "Banner: WxHpx" label
  - Upload Companion Banner button with file input
  - Companion banner URL input with dimension detection button
- [x] **Creative Preview Fixes (March 2026)** - Fixed preview issues in Creatives.jsx:
  - Video preview: Added onError handler with fallback message for expired blob URLs (was showing infinite loading)
  - Audio preview: Corrected layout order - companion banner displays FIRST (on top), audio player BELOW
  - Both previews now show user-friendly "session expired" messages with re-upload instructions
- [x] **Creative List & Editor Fixes (March 2026)** - Multiple bug fixes:
  - Fixed creative card preview - added isValidUrl helper that properly detects null, 'None', empty strings, and blob URLs
  - Banner cards show actual image if image_url exists, or 'HTML Banner' with code icon if only ad_markup exists
  - Video cards show play icon with duration
  - Audio cards show music icon with duration (with fallback for expired blob URLs)
  - Removed "Learn More" CTA Text and CTA Color fields from Banner creative form
  - Added sorting by created_at descending (newest first) in fetchCreatives
- [x] **Persistent File Upload Storage (March 2026)** - Fixed video/audio preview expiration issue:
  - Added /api/upload/audio backend endpoint for audio file uploads (max 50MB)
  - Updated frontend video upload to use /api/upload/video endpoint (returns server URL)
  - Updated frontend audio upload to use /api/upload/audio endpoint (returns server URL)
  - Updated companion banner upload to use /api/upload/image endpoint (returns server URL)
  - Files stored persistently in /app/backend/uploads/ directory
  - Server URLs (e.g., https://.../api/uploads/audio_xxx.mp3) replace temporary blob URLs
  - Creatives now persist across page refreshes and sessions
- [x] **Role-Based Access Control (RBAC) (March 2026)** - Complete authentication and authorization system:
  - **4 Roles**: User, Advertiser, Admin, Super Admin
  - **Backend Auth Endpoints**: /api/auth/login, /api/auth/register, /api/auth/logout, /api/auth/me
  - **User Management**: Admin Panel for creating, updating, deactivating, and deleting users
  - **Sidebar Access Control**: Super Admin can configure which menu items each role can see
  - **Permissions System**: Super Admin can configure granular permissions per role
  - **Frontend Auth Context**: AuthProvider with hasPermission(), hasSidebarAccess(), hasRole() helpers
  - **Protected Routes**: Unauthenticated users redirected to /login
  - **Demo Accounts Created**:
    - User: user@demo.com / demo123
    - Advertiser: advertiser@demo.com / demo123
    - Admin: admin@demo.com / demo123
    - Super Admin: superadmin@demo.com / demo123
- [x] **Hierarchical RBAC Enhancement (March 2026)** - Advanced multi-tenant hierarchy system:
  - **Hierarchy Tracking**: Users have parent_id to track who created them
  - **Role Creation Rules**: Super Admin → creates Admins → Admins create Advertisers/Users
  - **Data Isolation**: Admin sees only their team, Super Admin sees all
  - **User Hierarchy Tab**: Tree view of Admins and their team members
  - **Impersonation Feature**: Super Admin can "View As" any user without switching accounts
  - **Bulk Access Update**: Multi-select sidebar/permissions with Save Changes button
  - **Improved Admin Panel UI**: 3 tabs (Users, Hierarchy, Access Control), proper grid alignment
- [x] **Security Features (March 2026)** - Comprehensive security enhancements:
  - **Password Reset**: Token-based password reset flow (/api/auth/password-reset/request, /api/auth/password-reset/confirm)
  - **Change Password**: Current password verification required (/api/auth/change-password)
  - **Two-Factor Authentication (2FA)**: 
    - TOTP-based using pyotp library
    - Setup returns secret, QR code URL, 8 backup codes
    - Enable/Disable with code verification
    - Login flow: returns temp_token → verify-2fa → session token
    - Backup codes can be used for login (single use)
    - Admin and Super Admin roles can enable 2FA
  - **Audit Logging**: All security events logged to audit_logs collection
    - Login events (success and failed)
    - Password reset requests and completions
    - 2FA setup, enable, disable events
    - GET /api/admin/audit-logs (Super Admin only)
  - **Data Ownership Filtering**:
    - Campaigns and Creatives filtered by owner_id
    - Super Admin sees all data
    - Admin sees own + children's data (hierarchical)
    - Advertiser/User sees only own data
  - **Frontend Security Tab**: 2FA enable/disable UI in Admin Panel
  - **Frontend Audit Logs Tab**: View all audit events with filtering
- [x] **3-Tier RBAC Hierarchy (March 2026)** - Refined access control system:
  - **Hierarchy**: Super Admin → Admin → Advertiser (removed User role)
  - **Creation Rules**:
    - Super Admin can ONLY create Admins
    - Admin can ONLY create Advertisers
    - Advertisers cannot create accounts
  - **View Access**:
    - Super Admin: All Admins, all Advertisers under any Admin
    - Admin: Only their created Advertisers
    - Advertiser: Own campaigns and reports only
  - **Seamless Navigation**: Breadcrumb navigation for viewing Admin/Advertiser dashboards
  - **New Backend Endpoints**:
    - GET /api/admin/stats: Quick stats (total admins, advertisers, campaigns, etc.)
    - GET /api/admin/activity-timeline: Recent platform actions
    - GET /api/admin/users/search: Search users with filters
    - GET /api/admin/users/export: Export users to CSV
    - GET /api/admin/advertiser/{id}/dashboard-data: Advertiser dashboard view
    - GET /api/admin/admin/{id}/dashboard-data: Admin dashboard view (Super Admin only)
  - **Enhanced Admin Panel UI**:
    - Quick Stats cards (Admins, Advertisers, Campaigns, Active, Creatives)
    - Activity Timeline sidebar showing recent actions
    - Search input and Role filter dropdown
    - Export to CSV functionality
    - "Add Admin" button for Super Admin, "Add Advertiser" for Admin
  - **Login Page**: 3 demo account buttons (Advertiser, Admin, Super Admin)
- [x] **Role-Based Dashboard Templates (March 2026)** - Tailored first-login experience:
  - **Super Admin Dashboard**:
    - Platform Health Banner (Logins 24h, Failed Logins 24h, Platform Online status)
    - 6 Metric Cards (Total Admins, Advertisers, Campaigns, SSP Endpoints, Win Rate, Total Spend)
    - Top Admins section with advertiser/campaign counts and spend
    - Platform Campaigns pie chart showing status breakdown
    - Platform Activity feed showing all user actions
  - **Admin Dashboard**:
    - Team Overview with 5 Metric Cards (Advertisers, Campaigns, Team Bids, Win Rate, Total Spend)
    - Top Advertisers section with spend and campaign info
    - Campaigns by Status pie chart
    - Team Activity feed showing team actions
  - **Advertiser Dashboard**:
    - Campaign Performance focus with 5 Metric Cards (Active Campaigns, Total Bids, Win Rate, Total Spend, CTR)
    - Bidding Activity area chart showing bids/wins over time
    - Top Campaigns section ranked by wins
    - Recent Creatives section
  - **New Backend Endpoint**: GET /api/dashboard/role-data returns role-specific data
- [x] **Access Control Enhancements (March 2026)** - Improved UX and bulk management:
  - **Access Not Allocated Page**:
    - Clear "Access Not Allocated" message with red shield icon
    - Shows current user role and required access
    - "Go Back" and "Dashboard" navigation buttons
    - ProtectedRoute wrapper for all routes with sidebar access checks
  - **Bulk Delete Feature (Super Admin only)**:
    - Checkboxes in user table for multi-select
    - Select All checkbox in table header
    - "Delete (N)" button appears when users selected
    - Row highlighting for selected users
    - Confirmation dialog showing users to be deleted
    - POST /api/admin/users/bulk-delete endpoint
    - Cannot delete self, returns deleted_count
  - **Real-Time WebSocket Notifications**:
    - WebSocket endpoint: /api/ws/notifications?token=<jwt>
    - ConnectionManager for user-based and role-based broadcasting
    - Notification types: campaign_update, user_activity, security_alert, new_advertiser, budget_alert, system_message
    - NotificationContext for frontend state management
    - NotificationBell component in sidebar with unread count badge
    - Popover showing notifications with Live/Offline status
    - Mark as read, mark all as read, clear notifications
    - Auto-reconnect on connection loss
    - GET /api/notifications/status (connected users count)
    - POST /api/notifications/broadcast (Super Admin)
- [x] **Email Notifications with Resend (March 2026)** - Transactional email system:
  - **Resend API Integration**:
    - Configured with API key in backend/.env
    - Professional HTML email templates with dark theme styling
    - GET /api/email/status - check if email service is configured
    - POST /api/email/test - send test emails (Super Admin only)
  - **Notification Events**:
    - **New User Created**: Admin receives email when they create a new advertiser
    - **Password Reset**: User receives email with reset link (1 hour expiry)
    - **Budget Alert**: Campaign owner receives email when budget hits 75% (warning) or 90% (critical)
    - **Suspicious Login**: User receives email when login detected from new IP address
  - **Email Templates**:
    - new_user_email_template - Welcome notification for admins
    - password_reset_email_template - Reset password with link
    - budget_alert_email_template - Budget warning with progress bar
    - suspicious_login_email_template - Security alert with login details
  - **Note**: In Resend test mode, emails can only be sent to verified addresses. Production requires domain verification at resend.com/domains
- [x] **Email Preferences System (March 2026)** - User-customizable notification settings:
  - **Notification Toggles**:
    - Security Alerts (suspicious login from new IP)
    - Budget Alerts (campaign budget thresholds)
    - New User Notifications (admin only - when user created under them)
    - Password Reset confirmations
    - System Announcements
  - **Budget Alert Thresholds**:
    - Warning Threshold (10-95%, default 75%)
    - Critical Threshold (50-100%, default 90%)
    - Critical must be greater than warning (validated)
  - **Delivery Preferences**:
    - Weekly Digest option (aggregate instead of individual emails)
    - Digest Day selector (Monday-Sunday)
    - Quiet Hours toggle (pause non-critical notifications)
    - Quiet Hours Period (handles overnight, e.g., 22:00-08:00)
  - **Backend Endpoints**:
    - GET /api/auth/email-preferences - returns preferences with defaults
    - PUT /api/auth/email-preferences - updates with validation
    - POST /api/auth/email-preferences/reset - resets to defaults
  - **Helper Functions**:
    - should_send_notification(user_id, type) - checks preferences before sending
    - get_budget_thresholds(user_id) - returns custom thresholds
  - **Settings Page** (/settings):
    - Modern UI with toggle switches
    - Budget threshold sliders
    - Conditional fields (digest day shows when digest enabled)
    - Unsaved changes indicator
    - Reset and Save buttons

### P0 Bug Fix - Data Leak Resolution (March 2026)
- [x] **Fixed Advertiser Dashboard Data Leak** - The "Bidding Activity Chart" was showing global data from all users instead of user-specific data
  - Created new `/api/dashboard/user-chart-data` endpoint with role-based filtering
  - Advertiser: Only sees their own campaign data
  - Admin: Sees their team's campaign data (own + advertisers under them)
  - Super Admin: Sees all platform data
  - Updated `Dashboard.jsx` to use `getUserChartData()` instead of global `getChartData()`
  - Added auth interceptor to `api.js` for automatic token inclusion
  - Testing: 100% pass rate (11/11 backend tests, frontend verified)

### Campaign Ownership Enhancement (March 2026)
- [x] **Automatic Campaign Ownership Assignment** - Campaigns are now automatically linked to the user who creates them
  - New campaigns get `owner_id` and `owner_email` from the authenticated user
  - Existing campaigns/creatives can be migrated using `/api/migrate/assign-ownership`
  - Updated seed data to assign ownership to demo advertiser account
  - Data isolation enforced: Advertisers only see their own campaigns/creatives
  - Admins see their own + their team's data
  - Super Admins see all platform data

### Refactoring (March 2026)
- [x] **CampaignWizard.jsx Refactored** - Broke down 3,933 line monolithic file into 12 modular components:
  - `/pages/CampaignWizard/constants.js` - All constants and initial state
  - `/pages/CampaignWizard/index.jsx` - Main orchestration component
  - `/pages/CampaignWizard/hooks/useWizardForm.js` - Form state and validation logic
  - `/pages/CampaignWizard/components/WizardSidebar.jsx` - Sidebar navigation
  - `/pages/CampaignWizard/steps/` - 8 step components (OverviewStep, BudgetStep, TargetingStep, AudienceStep, CreativesStep, ScheduleStep, BrandSafetyStep, MeasurementStep)

### P1 - Upcoming
- [ ] **Real YouTube & GDN API Integration** - Replace mock forecasting data
- [ ] CDN integration for video hosting (currently local storage)

### P2 - Future
- [ ] Advanced fraud detection algorithms
- [ ] Scheduled report delivery (daily/weekly emails)

## Files Deleted (Phase 11)
- `/app/frontend/src/pages/CampaignForm.jsx` - Replaced by CampaignWizard.jsx

## Architecture Changes (Phase 14-15)
```
/app/backend/
├── server.py           # Main app (~80 lines) - Imports routers, CORS, lifespan
├── models.py           # Pydantic models (heavily updated for advanced targeting, IOs, Line Items)
├── openrtb_handler.py  # Core bidding engine
└── routers/            # Feature-based modular routers
    ├── __init__.py
    ├── shared.py       # DB connection, WebSocket manager, utilities
    ├── reference.py    # Reference data endpoints
    ├── campaigns.py    # Campaign CRUD
    ├── creatives.py    # Creative CRUD
    ├── bidding.py      # Bid handling, SSP endpoints, notifications
    ├── analytics.py    # SSP analytics, reports, pacing
    ├── optimization.py # Bid optimization, ML, SPO
    ├── attribution.py  # Attribution tracking
    ├── media_planning.py  # Media Planner, IOs, Line Items (NEW)
    └── misc.py         # Currencies, A/B testing, audiences, uploads

/app/frontend/src/pages/
├── MediaPlanner.jsx      # Media Planning & Forecasting (NEW)
├── InsertionOrders.jsx   # IO & Line Item Management (NEW)
├── CampaignWizard.jsx    # Enhanced 8-step Campaign Creation
└── ... (existing pages)
```
