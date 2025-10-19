import os
from supabase import create_client
from dotenv import load_dotenv

#Supabase client is the entryway to supabase services/ecosystem
import os
from supabase import create_client, Client
url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")

load_dotenv()

# Singleton pattern
_instance = None

class SupabaseService:
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_KEY")
        self.client = create_client(self.url, self.key)

    def set_auth_override(self,firebase_uid):
        #Pass the firebase uid in with custom header
        self.client.headers.update({"X-Firebase-UID": firebase_uid
        })
        return self
    
    # Meeting functions
    def save_meeting(self, user_id, title, description=None):
        return self.client.table("meetings").insert({
            "user_id": user_id,
            "title": title,
            "description": description,
        }).execute()
        
    def save_transcription(self, meeting_id, transcription_text, language):
        return self.client.table("transcriptions").insert({
            "meeting_id": meeting_id,
            "text": transcription_text,
            "language": language
        }).execute()
        
    def get_user_meetings(self, user_id):
        return self.client.table("meetings").select("*").eq("user_id", user_id).execute()
        
    def get_meeting_transcription(self, meeting_id):
        return self.client.table("transcriptions").select("*").eq("meeting_id", meeting_id).execute()


def get_supabase():
    global _instance
    if _instance is None:
        _instance = SupabaseService()
    return _instance




