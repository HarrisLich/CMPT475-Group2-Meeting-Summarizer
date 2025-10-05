"""
Centralized Firebase service singleton to avoid multiple initialization
"""
from .service import FirebaseService

# Global Firebase service instance - single source of truth
_firebase_service = None

def get_firebase_service():
    """Get or create Firebase service instance - single shared instance"""
    global _firebase_service
    if _firebase_service is None:
        _firebase_service = FirebaseService()
    return _firebase_service