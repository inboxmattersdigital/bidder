# OpenRTB 2.5/2.6 Bidder with Campaign Manager - PRD

## Original Problem Statement
Build a Demand-Side Platform (DSP) Bidder that handles OpenRTB 2.5/2.6 bid requests, manages campaigns with comprehensive targeting, and provides real-time bidding decisions.

## Architecture
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + Tailwind + Shadcn
- **Bidding Engine**: Real-time matching with targeting rules
- **Protocol Handler**: Version detection, field migration

## Implemented Features

### Phase 1 - Core MVP
- OpenRTB parser with 2.5/2.6 version detection
- Campaign Manager APIs (CRUD, activate/pause)
- Creative Management (banner/video/native/audio)
- SSP Endpoint Management
- Bid endpoint with targeting engine
- Dark theme dashboard with charts

### Phase 2 - Advanced Bidding
- Win/Billing notification callbacks
- Budget pacing (even distribution)
- Campaign performance reporting
- Bid shading (automatic price optimization)

### Phase 3 - Optimization Features
- Frequency capping (in-memory via MongoDB)
- Supply Path Optimization (SPO)
- ML-based bid prediction (heuristic model)
- Custom report exports (CSV/JSON)

### Phase 4 - Insights & Management
- Campaign Performance Insights with health scores
- ML Model Management page
- Multi-Currency Support (USD, EUR, GBP, CAD, AUD, JPY)

### Phase 5 - Enhanced Targeting
- Ad Placements (In-App, In-Stream, Interstitial, etc.)
- Geo Targeting with Lat/Long/Radius
- Device Targeting with carriers by country
- Video Targeting with full dropdowns
- SSP ORTB version selector
- Theme toggle (Dark/Light mode)
- Creative preview functionality

### Phase 6 - Advanced Platform Features (December 2025)
- **Campaign Comparison Tool**
  - Compare 2-3 campaigns side-by-side
  - Metrics comparison (bids, wins, win rate, price)
  - Targeting differences analysis
  - Optimization recommendations

- **A/B Testing Framework**
  - Create tests with 2-4 campaigns
  - Traffic split configuration
  - Real-time winner determination
  - Status management (active/paused/completed)

- **Fraud Detection**
  - Bot user agent detection
  - Invalid geo pattern filtering
  - High frequency threshold monitoring
  - Real-time fraud checking API
  - Fraud score calculation

- **Viewability Prediction**
  - Device type impact scoring
  - Placement impact analysis
  - Banner size optimization
  - Video viewability factors

- **Custom Audience Segments**
  - Create/manage audience segments
  - Rule-based targeting
  - Geo and category filters
  - Size estimation

- **Real-Time Bid Stream**
  - Live bid activity feed
  - Auto-refresh every 2 seconds
  - Pause/resume functionality
  - Bid/No-bid status tracking

- **X-API Auth Removal**
  - Bid endpoint works without authentication
  - POST /api/bid accepts requests with no headers

## Key API Endpoints

### Bidding
- `POST /api/bid` - Main bid endpoint (NO AUTH REQUIRED)

### Campaigns
- `GET/POST /api/campaigns` - List/create campaigns
- `POST /api/campaigns/compare` - Compare campaigns

### A/B Testing
- `GET/POST /api/ab-tests` - List/create tests
- `PUT /api/ab-tests/{id}/status` - Update status

### Fraud Detection
- `GET /api/fraud/stats` - Fraud statistics
- `POST /api/fraud/check` - Check request for fraud

### Viewability
- `GET /api/viewability/stats` - Viewability stats
- `POST /api/viewability/predict` - Predict score

### Audiences
- `GET/POST /api/audiences` - List/create segments
- `DELETE /api/audiences/{id}` - Delete segment

### Real-Time
- `GET /api/bid-stream` - Live bid activity

## Navigation Pages
- Dashboard
- Campaigns
- Compare
- Creatives
- SSP Endpoints
- Bid Logs
- Bid Stream
- Reports
- Budget Pacing
- Insights
- ML Models
- A/B Testing
- Fraud
- Audiences
- Migration

## Prioritized Backlog

### Completed
- [x] All core bidding features
- [x] Campaign management
- [x] Advanced targeting
- [x] ML prediction
- [x] Campaign comparison
- [x] A/B testing
- [x] Fraud detection
- [x] Viewability prediction
- [x] Custom audiences
- [x] Real-time bid stream
- [x] X-API auth removal

### P1 - Upcoming
- [ ] Intelligent Campaign Creation Wizard
- [ ] Real-Time Creative Preview System
- [ ] WebSocket for live updates

### P2 - Future
- [ ] Advanced Creative Editor
- [ ] Automated bid optimization
- [ ] Cross-campaign attribution

## Tech Stack
- **Backend**: FastAPI, Motor (async MongoDB), Pydantic
- **Frontend**: React, Tailwind CSS, Shadcn/UI, Recharts, Axios
- **Database**: MongoDB
- **Domain**: Ad-Tech, OpenRTB, Programmatic Advertising
