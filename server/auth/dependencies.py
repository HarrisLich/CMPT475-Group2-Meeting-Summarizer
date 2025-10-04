from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any
from .service import FirebaseService, get_firebase_app
from .config import FirebaseConfig

# HTTP Bearer token scheme
security = HTTPBearer()

# Import shared Firebase service
from .firebase_singleton import get_firebase_service

class AuthDependency:
    """Dependency class for handling Firebase authentication"""
    
    def __init__(self):
        self.config = FirebaseConfig()
    
    @property
    def firebase_service(self):
        """Lazy initialization of Firebase service"""
        return get_firebase_service()
    
    async def get_current_user(self, credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
        """Dependency to get current authenticated user"""
        try:
            # Verify the Firebase ID token
            user_data = self.firebase_service.verify_token(credentials.credentials)
            
            return user_data
            
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Authentication failed: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    async def get_current_user_optional(self, credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
        """Optional authentication dependency - returns user if authenticated, None otherwise"""
        try:
            return await self.get_current_user(credentials)
        except HTTPException:
            return None
    
    def require_custom_claim(self, claim_key: str, claim_value: Any = True):
        """Decorator factory for requiring specific custom claims"""
        async def claim_checker(user: Dict[str, Any] = Depends(self.get_current_user)) -> Dict[str, Any]:
            custom_claims = user.get("custom_claims", {})
            if custom_claims.get(claim_key) != claim_value:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Custom claim '{claim_key}' with value '{claim_value}' required"
                )
            return user
        return claim_checker
    
    def require_admin(self):
        """Decorator factory for requiring admin role"""
        return self.require_custom_claim("admin", True)

# Create global instance
auth_dependency = AuthDependency()

# Convenience functions for common use cases
get_current_user = auth_dependency.get_current_user
get_current_user_optional = auth_dependency.get_current_user_optional
require_custom_claim = auth_dependency.require_custom_claim
require_admin = auth_dependency.require_admin
