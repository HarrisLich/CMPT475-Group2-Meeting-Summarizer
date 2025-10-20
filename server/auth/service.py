import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from typing import Dict, Any, Optional
from .config import FirebaseConfig
import threading
import requests
import os

# Thread-safe Firebase app initialization
_firebase_app = None
_firebase_lock = threading.Lock()
_is_initialized = False
_app_name = "meeting_summarizer_app"

def initialize_firebase():
    """Initialize Firebase Admin SDK once with a named app"""
    global _firebase_app, _is_initialized

    with _firebase_lock:
        if _is_initialized:
            return _firebase_app

        try:
            # Check if named app already exists
            _firebase_app = firebase_admin.get_app(_app_name)
            _is_initialized = True
        except ValueError:
            # Named app doesn't exist, create it
            config = FirebaseConfig()
            config.validate_config()
            service_account_info = config.get_service_account_info()
            cred = credentials.Certificate(service_account_info)
            _firebase_app = firebase_admin.initialize_app(cred, name=_app_name)
            _is_initialized = True

        return _firebase_app

def get_firebase_app():
    """Get Firebase app instance"""
    if not _is_initialized:
        return initialize_firebase()
    return _firebase_app

class FirebaseService:
    """Service for handling Firebase authentication operations"""
    
    def __init__(self):
        self.config = FirebaseConfig()
        self.config.validate_config()
    
    def _get_app(self):
        """Get Firebase Admin SDK app"""
        return get_firebase_app()
    
    def create_user(self, email: str, password: str, display_name: str = None) -> Dict[str, Any]:
        """Create a new user with email and password"""
        try:
            app = self._get_app()
            
            user_record = firebase_auth.create_user(
                email=email,
                password=password,
                display_name=display_name,
                email_verified=False,
                app=app
            )
            
            return {
                "uid": user_record.uid,
                "email": user_record.email,
                "display_name": user_record.display_name,
                "email_verified": user_record.email_verified,
                "created_at": user_record.user_metadata.creation_timestamp.isoformat() if hasattr(user_record.user_metadata.creation_timestamp, 'isoformat') else str(user_record.user_metadata.creation_timestamp) if user_record.user_metadata.creation_timestamp else None
            }
            
        except Exception as e:
            raise ValueError(f"User creation failed: {str(e)}")
    
    def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify Firebase ID token and return user info"""
        try:
            app = self._get_app()

            decoded_token = firebase_auth.verify_id_token(token, app=app)
            uid = decoded_token['uid']

            # Get additional user info
            user_record = firebase_auth.get_user(uid, app=app)

            return {
                "uid": user_record.uid,
                "email": user_record.email,
                "display_name": user_record.display_name,
                "email_verified": user_record.email_verified,
                "custom_claims": decoded_token.get('custom_claims', {}),
                "token_claims": decoded_token
            }

        except Exception as e:
            raise ValueError(f"Token verification failed: {str(e)}")
    
    def get_user_by_email(self, email: str) -> Dict[str, Any]:
        """Get user information by email"""
        try:
            app = self._get_app()
            
            user_record = firebase_auth.get_user_by_email(email, app=app)
            
            return {
                "uid": user_record.uid,
                "email": user_record.email,
                "display_name": user_record.display_name,
                "email_verified": user_record.email_verified,
                "disabled": user_record.disabled,
                "created_at": user_record.user_metadata.creation_timestamp.isoformat() if hasattr(user_record.user_metadata.creation_timestamp, 'isoformat') else str(user_record.user_metadata.creation_timestamp) if user_record.user_metadata.creation_timestamp else None
            }
            
        except Exception as e:
            raise ValueError(f"Failed to get user: {str(e)}")
    
    def update_user(self, uid: str, **kwargs) -> Dict[str, Any]:
        """Update user information"""
        try:
            app = self._get_app()
            
            user_record = firebase_auth.update_user(uid, app=app, **kwargs)
            
            return {
                "uid": user_record.uid,
                "email": user_record.email,
                "display_name": user_record.display_name,
                "email_verified": user_record.email_verified,
                "disabled": user_record.disabled
            }
            
        except Exception as e:
            raise ValueError(f"User update failed: {str(e)}")
    
    def delete_user(self, uid: str) -> bool:
        """Delete a user"""
        try:
            app = self._get_app()
            firebase_auth.delete_user(uid, app=app)
            return True
            
        except Exception as e:
            raise ValueError(f"User deletion failed: {str(e)}")
    
    def set_custom_claims(self, uid: str, claims: Dict[str, Any]) -> bool:
        """Set custom claims for a user"""
        try:
            app = self._get_app()
            firebase_auth.set_custom_user_claims(uid, claims, app=app)
            return True
            
        except Exception as e:
            raise ValueError(f"Setting custom claims failed: {str(e)}")
    
    def revoke_refresh_tokens(self, uid: str) -> bool:
        """Revoke all refresh tokens for a user"""
        try:
            app = self._get_app()
            firebase_auth.revoke_refresh_tokens(uid, app=app)
            return True
            
        except Exception as e:
            raise ValueError(f"Revoking refresh tokens failed: {str(e)}")
    
    def get_firebase_config(self) -> Dict[str, Any]:
        """Get Firebase configuration for client-side use"""
        return self.config.get_firebase_config()

    def authenticate_user(self, email: str, password: str) -> Dict[str, Any]:
        """
        Authenticate user with email and password using Firebase REST API.
        Returns user info and tokens on success.
        """
        try:
            # Get Firebase Web API Key from environment
            api_key = os.getenv("FIREBASE_WEB_API_KEY")
            if not api_key:
                raise ValueError("FIREBASE_WEB_API_KEY not found in environment variables")

            # Firebase Authentication REST API endpoint
            url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}"

            payload = {
                "email": email,
                "password": password,
                "returnSecureToken": True
            }

            # Make request to Firebase Auth REST API
            response = requests.post(url, json=payload)

            if response.status_code != 200:
                error_data = response.json()
                error_message = error_data.get("error", {}).get("message", "Authentication failed")

                # Map Firebase error messages to user-friendly messages
                if "INVALID_PASSWORD" in error_message or "INVALID_LOGIN_CREDENTIALS" in error_message:
                    raise ValueError("Invalid email or password")
                elif "EMAIL_NOT_FOUND" in error_message:
                    raise ValueError("Invalid email or password")
                elif "USER_DISABLED" in error_message:
                    raise ValueError("User account has been disabled")
                elif "TOO_MANY_ATTEMPTS_TRY_LATER" in error_message:
                    raise ValueError("Too many failed login attempts. Please try again later")
                else:
                    raise ValueError(f"Authentication failed: {error_message}")

            # Parse successful response
            data = response.json()

            # Get additional user info from Firebase Admin SDK
            app = self._get_app()
            user_record = firebase_auth.get_user(data["localId"], app=app)

            return {
                "uid": data["localId"],
                "email": data["email"],
                "display_name": user_record.display_name,
                "id_token": data["idToken"],
                "refresh_token": data["refreshToken"],
                "expires_in": data["expiresIn"],
                "email_verified": user_record.email_verified
            }

        except requests.exceptions.RequestException as e:
            raise ValueError(f"Network error during authentication: {str(e)}")
        except Exception as e:
            if isinstance(e, ValueError):
                raise
            raise ValueError(f"Authentication failed: {str(e)}")
