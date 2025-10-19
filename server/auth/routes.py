from fastapi import APIRouter, HTTPException, Depends, status, Query
from fastapi.responses import RedirectResponse
from typing import Dict, Any, Optional
from pydantic import BaseModel, EmailStr
from .service import FirebaseService
from .config import FirebaseConfig
from .dependencies import get_current_user

# Create router for authentication endpoints
router = APIRouter(prefix="/auth", tags=["authentication"])

# Initialize config (service will be lazy-loaded)
config = FirebaseConfig()

# Import shared Firebase service
from .firebase_singleton import get_firebase_service

# Pydantic models for request/response
class UserResponse(BaseModel):
    uid: str
    email: str
    display_name: Optional[str] = None
    email_verified: bool
    created_at: Optional[str] = None

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UpdateUserRequest(BaseModel):
    display_name: Optional[str] = None
    email_verified: Optional[bool] = None

class CustomClaimsRequest(BaseModel):
    claims: Dict[str, Any]

@router.post("/register")
async def register_user(request: RegisterRequest):
    """Register a new user with email and password"""
    try:
        firebase_service = get_firebase_service()
        user_data = firebase_service.create_user(
            email=request.email,
            password=request.password,
            display_name=request.display_name
        )
        
        return {
            "message": "User registered successfully",
            "user": UserResponse(**user_data)
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login")
async def login_user(request: LoginRequest):
    """Login user with email and password (returns Firebase config for client-side auth)"""
    try:
        firebase_service = get_firebase_service()
        
        # Verify user exists and credentials are valid
        user_data = firebase_service.get_user_by_email(request.email)
        
        # Return Firebase config for client-side authentication
        firebase_config = firebase_service.get_firebase_config()
        
        return {
            "message": "Login successful - use Firebase client SDK",
            "firebase_config": firebase_config,
            "user": UserResponse(**user_data)
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Login failed: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@router.get("/config")
async def get_firebase_config():
    """Get Firebase configuration for client-side use"""
    try:
        firebase_service = get_firebase_service()
        config = firebase_service.get_firebase_config()
        
        return {
            "firebase_config": config
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get Firebase config: {str(e)}"
        )

@router.get("/me")
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(**current_user)

@router.put("/me")
async def update_me(
    request: UpdateUserRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update current user information"""
    try:
        firebase_service = get_firebase_service()
        
        update_data = {}
        if request.display_name is not None:
            update_data["display_name"] = request.display_name
        if request.email_verified is not None:
            update_data["email_verified"] = request.email_verified
        
        user_data = firebase_service.update_user(current_user["uid"], **update_data)
        
        return {
            "message": "User updated successfully",
            "user": UserResponse(**user_data)
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Update failed: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Update failed: {str(e)}"
        )

@router.post("/logout")
async def logout(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Logout current user by revoking refresh tokens"""
    try:
        firebase_service = get_firebase_service()
        firebase_service.revoke_refresh_tokens(current_user["uid"])
        
        return {"message": "Logout successful"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Logout failed: {str(e)}"
        )

@router.post("/verify")
async def verify_token(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Verify if token is valid and return user info"""
    return {
        "valid": True,
        "user": UserResponse(**current_user)
    }

@router.post("/claims")
async def set_custom_claims(
    request: CustomClaimsRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Set custom claims for current user (admin only)"""
    try:
        firebase_service = get_firebase_service()
        firebase_service.set_custom_claims(current_user["uid"], request.claims)
        
        return {"message": "Custom claims set successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Setting custom claims failed: {str(e)}"
        )

@router.get("/health")
async def auth_health():
    """Health check for authentication service"""
    try:
        config.validate_config()
        return {
            "status": "healthy",
            "service": "firebase-authentication",
            "project_id": config.PROJECT_ID
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Auth service unhealthy: {str(e)}"
        )
@router.post("/get_token")
async def get_token(request: LoginRequest):
    """Get a Firebase token for testing (simplified)"""
    try:
        firebase_service = get_firebase_service()
        user_data = firebase_service.get_user_by_email(request.email)
        
        # Generate a custom token for the user
        from firebase_admin import auth
        custom_token = auth.create_custom_token(user_data["uid"]).decode('utf-8')
        
        return {
            "token": custom_token,
            "uid": user_data["uid"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token generation failed: {str(e)}"
        )

