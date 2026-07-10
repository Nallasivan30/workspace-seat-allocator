from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.limiter import limiter

# Import Routers
from app.routers import (
    auth,
    employees,
    projects,
    buildings,
    floors,
    seats,
    seat_allocations,
    search,
    dashboard,
    analytics,
    ai,
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Set Rate Limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Set all CORS enabled origins
if settings.CORS_ALLOWED_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.CORS_ALLOWED_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Register Exception Handlers
register_exception_handlers(app)


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": "1.0.0"
    }


# Router registrations
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(employees.router, prefix=f"{settings.API_V1_STR}/employees", tags=["Employees"])
app.include_router(projects.router, prefix=f"{settings.API_V1_STR}/projects", tags=["Projects"])
app.include_router(buildings.router, prefix=f"{settings.API_V1_STR}/buildings", tags=["Buildings"])
app.include_router(floors.router, prefix=f"{settings.API_V1_STR}/floors", tags=["Floors"])
app.include_router(seats.router, prefix=f"{settings.API_V1_STR}/seats", tags=["Seats"])
app.include_router(
    seat_allocations.router,
    prefix=f"{settings.API_V1_STR}/seat-allocations",
    tags=["Seat Allocations"],
)
app.include_router(search.router, prefix=f"{settings.API_V1_STR}/search", tags=["Global Search"])
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["Dashboard"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["Analytics"])
app.include_router(ai.router, prefix=f"{settings.API_V1_STR}/ai", tags=["AI Assistant"])
