# OpenRTB 2.5/2.6 Bidder with Campaign Manager - PRD

## Original Problem Statement
Build a Demand-Side Platform (DSP) Bidder that handles OpenRTB 2.5/2.6 bid requests, manages campaigns with comprehensive targeting, and provides real-time bidding decisions.

## Architecture
- **Backend**: FastAPI + MongoDB + WebSocket
- **Frontend**: React + Tailwind + Shadcn
- **Bidding Engine**: Real-time matching with targeting rules
- **Real-time**: WebSocket for live bid stream

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

### Ad Performance Report (December 2025)

**Report Builder UI:**
- Interactive configuration with dimension selectors
- Date range picker with start/end dates
- Max rows selector (50, 100, 250, 500, 1000)
- Generate Report button with loading state

**Dimensions (Group By):**
- Source (SSP/Exchange)
- Domain (Publisher domain)
- Insertion Order (IO identifier)
- Line Item (Line item name)
- Creative Name (Creative asset)

**Performance Metrics:**
- Impressions, Reach, Clicks, CTR (%), Conversions

**Video Metrics:**
- Q1 (25%), Q2/Midpoint (50%), Q3 (75%)
- Completed Views (100%), Completion Rate (%)

**Export Functionality:**
- CSV download with all columns and headers
- Excel (XLSX) download with colored headers and formatting
- Preview table before export (first 20 rows)
- Summary cards with key metrics

**Note:** Uses MOCK DATA for demonstration

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
