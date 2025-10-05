import os
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class FirebaseConfig:
    """Firebase configuration settings"""
    
    # Firebase Service Account Configuration
    SERVICE_ACCOUNT_KEY = os.getenv("FIREBASE_SERVICE_ACCOUNT")
    
    # Firebase Project Configuration
    PROJECT_ID = None
    PRIVATE_KEY = None
    CLIENT_EMAIL = None
    
    @classmethod
    def get_service_account_info(cls):
        """Parse Firebase service account JSON"""
        if not cls.SERVICE_ACCOUNT_KEY:
            raise ValueError("FIREBASE_SERVICE_ACCOUNT environment variable is required")
        
        try:
            service_account_info = json.loads(cls.SERVICE_ACCOUNT_KEY)
            cls.PROJECT_ID = service_account_info.get("project_id")
            cls.PRIVATE_KEY = service_account_info.get("private_key")
            cls.CLIENT_EMAIL = service_account_info.get("client_email")
            
            return service_account_info
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid Firebase service account JSON: {str(e)}")
    
    @classmethod
    def validate_config(cls):
        """Validate that Firebase configuration is present"""
        if not cls.SERVICE_ACCOUNT_KEY:
            raise ValueError("Missing required Firebase environment variable: FIREBASE_SERVICE_ACCOUNT")
        
        try:
            cls.get_service_account_info()
            return True
        except Exception as e:
            raise ValueError(f"Firebase configuration validation failed: {str(e)}")
    
    @classmethod
    def get_firebase_config(cls):
        """Get Firebase configuration for client-side use"""
        service_account = cls.get_service_account_info()
        return {
            "apiKey": service_account.get("api_key", ""),
            "authDomain": f"{cls.PROJECT_ID}.firebaseapp.com",
            "projectId": cls.PROJECT_ID,
            "storageBucket": f"{cls.PROJECT_ID}.appspot.com",
            "messagingSenderId": service_account.get("messaging_sender_id", ""),
            "appId": service_account.get("app_id", "")
        }
