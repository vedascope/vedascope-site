from fastapi import FastAPI

from app.api.routes.account import router as account_router
from app.api.routes.health import router as health_router
from app.core.config import settings


def create_app() -> FastAPI:
    application = FastAPI(title=settings.app_name)
    application.include_router(health_router)
    application.include_router(account_router, prefix="/api/account")
    return application


app = create_app()
