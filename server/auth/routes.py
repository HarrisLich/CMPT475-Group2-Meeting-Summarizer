from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from .supabase_auth_service import get_supabase_auth

router = APIRouter(prefix="/auth", tags=["Authentication"])

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@router.post(
    "/register",
    summary="Register New User Account",
    description="""
Register a new user account with email and password.

### Request Body
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

### Response Format
```json
{
  "message": "Registration successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "timestamp"
  },
  "session": {
    "access_token": "jwt_token_here",
    "refresh_token": "refresh_token_here",
    "expires_at": timestamp
  }
}
```

### Password Requirements
- Minimum length: 6 characters
- Recommended: Include uppercase, lowercase, numbers, and special characters

### Session Management
- Returns JWT access token for API authentication
- Include token in `Authorization: Bearer <token>` header for protected endpoints
- Use refresh token to obtain new access tokens when expired

### Use Cases
- Create new user accounts
- Enable access to protected features (conversations, meetings, summaries)
- Establish user identity for data ownership

### Error Responses
- **400**: Invalid email format or password too short
- **409**: Email already registered (if applicable)
- **500**: Server error during registration

### Next Steps
After registration, use the returned `access_token` to authenticate requests to protected endpoints.
    """,
    response_description="User account details and authentication session tokens"
)
async def register(request: RegisterRequest):
    """
    Register a new user account with email and password.

    Creates a new user in Supabase Auth and returns authentication tokens.
    """
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

@router.post(
    "/login",
    summary="Login to User Account",
    description="""
Authenticate with email and password to receive access tokens.

### Request Body
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

### Response Format
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "timestamp",
    "last_sign_in_at": "timestamp"
  },
  "session": {
    "access_token": "jwt_token_here",
    "refresh_token": "refresh_token_here",
    "expires_at": timestamp,
    "expires_in": 3600
  }
}
```

### Authentication Flow
1. **Submit credentials** - Send email and password to this endpoint
2. **Receive tokens** - Get JWT access token and refresh token
3. **Use access token** - Include in `Authorization: Bearer <token>` header for protected endpoints
4. **Refresh when expired** - Use refresh token to get new access token (token expires after 1 hour)

### Session Security
- Access tokens are short-lived (typically 1 hour)
- Refresh tokens are long-lived for session persistence
- JWT tokens are cryptographically signed and verified
- Store tokens securely (httpOnly cookies or secure storage)

### Protected Endpoints Requiring Authentication
After login, you can access protected endpoints including:
- **Conversations**: Create, view, update, delete conversations
- **Messages**: Save and retrieve chat messages
- **Meetings**: Get summaries and transcriptions
- **Account**: Delete account and manage user data

### Use Cases
- Access protected API features
- Persist user sessions across requests
- Identify user for data ownership and RLS (Row-Level Security)

### Error Responses
- **401**: Invalid credentials (wrong email or password)
- **400**: Malformed request (invalid email format)
- **429**: Too many login attempts (rate limiting)
- **500**: Server error during authentication

### Security Best Practices
- Never expose tokens in URLs or logs
- Use HTTPS for all authentication requests
- Implement token refresh before expiration
- Clear tokens on logout
    """,
    response_description="User details and authentication session with JWT tokens"
)
async def login(request: LoginRequest):
    """
    Authenticate user with email and password.

    Returns JWT access token and refresh token for API authentication.
    """
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