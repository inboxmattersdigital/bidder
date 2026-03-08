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
- Campaign Creation Wizard (5-step)

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

## Key API Endpoints

### Bidding
- `POST /api/bid/{endpoint_token}` - SSP-specific bid endpoint
- `WS /api/ws/bid-stream` - Real-time bid stream

### Campaigns & Creatives
- `GET/POST /api/campaigns` - Campaign management
- `GET/POST /api/creatives` - Creative management
- `POST /api/upload/image` - Image upload
- `GET /api/reference/all` - All reference data

### Analytics
- `GET /api/ssp-analytics/overview` - SSP performance
- `GET /api/bid-optimization/status` - Bid optimization
- `GET /api/attribution/analysis` - Attribution analysis

## Navigation Structure
Dashboard | Campaigns | Compare | Creatives | Editor | 
SSP Endpoints | SSP Analytics | Bid Logs | Bid Stream | Reports | 
Budget Pacing | Insights | ML Models | Bid Optimizer | A/B Testing | 
Fraud | Audiences | Attribution | Migration

## Routes
- `/campaigns/new` - DV360-style Campaign Wizard (create)
- `/campaigns/:id/edit` - DV360-style Campaign Wizard (edit)

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

### P1 - Upcoming
- [ ] **SSP Performance Analytics UI** - Build interactive frontend for /api/ssp-analytics
- [ ] **Automated Bid Optimization UI** - Build frontend for /api/bid-optimization
- [ ] Code Refactoring - Split server.py into modular routers
- [ ] Video upload to cloud storage (currently local preview only)
- [ ] VAST tag validation and parsing

### P2 - Future
- [ ] Bulk campaign management
- [ ] Advanced fraud detection algorithms
- [ ] Campaign duplication feature
- [ ] Cross-Campaign Attribution UI

## Files Deleted (Phase 11)
- `/app/frontend/src/pages/CampaignForm.jsx` - Replaced by CampaignWizard.jsx
