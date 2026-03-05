# OpenRTB 2.5/2.6 Bidder with Campaign Manager - PRD

## Original Problem Statement
Build a Demand-Side Platform (DSP) Bidder that:
1. Receives and parses bid requests in OpenRTB 2.5 and 2.6 formats
2. Integrates with a Campaign Manager with comprehensive targeting
3. Makes real-time bidding decisions matching requests against campaigns
4. Constructs valid OpenRTB bid responses
5. Generates SSP endpoints with API key authentication

## User Personas
- **Ad Tech Professionals**: DSP operators managing programmatic campaigns
- **Campaign Managers**: Setting up targeting and budgets
- **SSP Integration Partners**: Sending bid requests via API

## Core Requirements (Static)
- OpenRTB 2.5 and 2.6 protocol support
- Dual-parse logic for version detection
- Campaign CRUD with comprehensive targeting
- Creative management (banner/video/native)
- SSP endpoint management with API keys
- Real-time bid logging and analytics
- Migration matrix documentation

## Architecture
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + Tailwind + Shadcn
- **Bidding Engine**: Real-time matching with targeting rules
- **Protocol Handler**: Version detection, field migration

## What's Been Implemented

### Phase 1 (March 5, 2026)
✅ Backend Core:
- OpenRTB parser with 2.5/2.6 version detection
- Campaign Manager APIs (CRUD, activate/pause)
- Creative Management (banner/video/native)
- SSP Endpoint Management with API key auth
- Bid endpoint POST /api/bid with targeting engine
- Bid logging and statistics
- Migration matrix endpoint

✅ Frontend Core:
- Dark theme dashboard with charts (Recharts)
- Campaigns list with status management
- Campaign form with 7-tab targeting configuration
- Creatives grid with type badges
- SSP Endpoints with API key reveal/copy
- Bid Logs with real-time monitoring
- Migration Matrix reference page

### Phase 2 - Advanced Features (March 5, 2026)
✅ Win/Billing Notifications:
- POST /api/notify/win/{bid_id} - Win notification callback
- POST /api/notify/billing/{bid_id} - Billing notification
- Automatic campaign stats update on win
- Win rate tracking for bid shading

✅ Budget Pacing:
- Even pacing algorithm (24-hour distribution)
- Hourly budget enforcement
- GET /api/pacing/status - Monitor all campaigns
- POST /api/pacing/reset-all - Reset daily budgets
- Overpacing/underpacing detection

✅ Campaign Performance Reporting:
- GET /api/reports/summary - Overall performance
- GET /api/reports/campaign/{id} - Per-campaign analytics
- Reports page with interactive charts
- Date range filtering (1d, 7d, 30d)
- Campaign breakdown table

✅ Bid Shading:
- Automatic bid price optimization
- Target win rate configuration
- Learning rate adjustment
- Min/max shade factor bounds
- Real-time factor updates based on wins

## Prioritized Backlog

### P0 - Completed
- [x] Core bidding engine
- [x] Campaign targeting
- [x] API key authentication
- [x] Dashboard analytics
- [x] Win notification callbacks
- [x] Budget pacing algorithms
- [x] Performance reporting
- [x] Bid shading optimization

### P1 - Next Phase
- [ ] Frequency capping
- [ ] Real-time bid adjustment ML model
- [ ] Multi-currency support
- [ ] Supply path optimization (SPO)

### P2 - Future
- [ ] Advanced fraud detection
- [ ] Viewability prediction
- [ ] A/B testing framework
- [ ] Custom audience segments

## Next Tasks
1. Add frequency capping to prevent over-exposure
2. Implement supply path optimization
3. Build custom reporting exports (CSV/Excel)
4. Add multi-currency bid support
