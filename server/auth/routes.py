from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from .supabase_auth_service import get_supabase_auth

router = APIRouter(prefix="/auth", tags=["authentication"])

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@router.post("/register")
async def register(request: RegisterRequest):
    try:
        auth = get_supabase_auth()
        response = auth.sign_up(request.email, request.password)
        return {
            "message": "Registration successful",
            "user": response.user,
            "session": response.session
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login")
async def login(request: LoginRequest):
    try:
        auth = get_supabase_auth()
        response = auth.sign_in(request.email, request.password)
        return {
            "message": "Login successful",
            "user": response.user,
            "session": response.session
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))