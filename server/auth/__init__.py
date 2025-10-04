# Auth module exports
from .routes import router as auth_router
from .dependencies import (
    get_current_user,
    get_current_user_optional,
    require_custom_claim,
    require_admin
)
from .service import FirebaseService
from .config import FirebaseConfig

__all__ = [
    "auth_router",
    "get_current_user",
    "get_current_user_optional", 
    "require_custom_claim",
    "require_admin",
    "FirebaseService",
    "FirebaseConfig"
]
