from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .supabase_auth_service import get_supabase_auth

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        auth = get_supabase_auth()
        response = auth.get_user(credentials.credentials)

        # Extract user from Supabase response
        # The response is a UserResponse object with a 'user' attribute
        if hasattr(response, 'user'):
            user = response.user
        else:
            # Fallback: response might already be the user dict
            user = response

        # Convert to dict if it's not already
        if hasattr(user, '__dict__'):
            user_dict = {
                "id": user.id,
                "email": getattr(user, 'email', None),
                "user_metadata": getattr(user, 'user_metadata', {}),
            }
            return user_dict

        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )