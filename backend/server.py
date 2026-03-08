"""
OpenRTB 2.5/2.6 Bidder with Holistic Campaign Manager
Refactored into modular routers for maintainability
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from routers.shared import client, logger

# Import all routers
from routers.reference import router as reference_router
from routers.campaigns import router as campaigns_router
from routers.creatives import router as creatives_router
from routers.bidding import router as bidding_router, bid_router
from routers.analytics import router as analytics_router
from routers.optimization import router as optimization_router
from routers.attribution import router as attribution_router
from routers.misc import router as misc_router
from routers.media_planning import router as media_planning_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("OpenRTB Bidder starting up...")
    yield
    logger.info("OpenRTB Bidder shutting down...")
    client.close()


# Create FastAPI app
app = FastAPI(
    title="OpenRTB 2.5/2.6 Bidder",
    description="Full-featured DSP with Campaign Manager",
    version="2.0.0",
    lifespan=lifespan
)


# Include all routers with /api prefix
app.include_router(reference_router, prefix="/api")
app.include_router(campaigns_router, prefix="/api")
app.include_router(creatives_router, prefix="/api")
app.include_router(bidding_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(optimization_router, prefix="/api")
app.include_router(attribution_router, prefix="/api")
app.include_router(misc_router, prefix="/api")
app.include_router(media_planning_router, prefix="/api")

# Bid router has its own /api/bid prefix
app.include_router(bid_router, prefix="/api/bid")


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint - API health check"""
    return {
        "service": "OpenRTB Bidder",
        "version": "2.0.0",
        "status": "healthy"
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
