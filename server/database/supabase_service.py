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
    def save_meeting(self, user_id, title, date=None, participants=None):
        meeting_data = {
            "user_id": user_id,
            "title": title
        }
        if date is not None:
            meeting_data["date"] = date
        if participants is not None:
            meeting_data["participants"] = participants

        return self.client.table("meetings").insert(meeting_data).execute()
        
    def save_transcription(self, meeting_id, transcription_text, audio_url=None, segments=None):
        transcription_data = {
            "meeting_id": meeting_id,
            "transcription_text": transcription_text
        }
        if audio_url is not None:
            transcription_data["audio_url"] = audio_url
        if segments is not None:
            transcription_data["segments"] = segments

        return self.client.table("transcriptions").insert(transcription_data).execute()
        
    def get_user_meetings(self, user_id):
        return self.client.table("meetings").select("*").eq("user_id", user_id).execute()
        
    def get_meeting_transcription(self, meeting_id):
        return self.client.table("transcriptions").select("*").eq("meeting_id", meeting_id).execute()

    # Conversation functions
    def create_conversation(self, user_id, meeting_id, title, model_version="llama3.2:3b"):
        """Create a new conversation for a user and meeting"""
        return self.client.table("conversations").insert({
            "user_id": user_id,
            "meeting_id": meeting_id,
            "title": title,
            "model_version": model_version
        }).execute()

    def get_user_conversations(self, user_id):
        """Get all conversations for a user, ordered by most recent"""
        return self.client.table("conversations").select("*").eq("user_id", user_id).order("updated_at", desc=True).execute()

    def get_conversation_by_id(self, conversation_id):
        """Get a specific conversation by ID"""
        return self.client.table("conversations").select("*").eq("id", conversation_id).execute()

    def update_conversation_title(self, conversation_id, title):
        """Update the title of a conversation"""
        return self.client.table("conversations").update({"title": title}).eq("id", conversation_id).execute()

    def archive_conversation(self, conversation_id, archived=True):
        """Archive or unarchive a conversation"""
        return self.client.table("conversations").update({"archived": archived}).eq("id", conversation_id).execute()

    # Message functions
    def save_message(self, conversation_id, role, content, token_count=None):
        """Save a message to a conversation (role: 'user' or 'assistant')"""
        message_data = {
            "conversation_id": conversation_id,
            "role": role,
            "content": content
        }
        if token_count is not None:
            message_data["token_count"] = token_count

        return self.client.table("messages").insert(message_data).execute()

    def get_conversation_messages(self, conversation_id):
        """Get all messages for a conversation, ordered chronologically"""
        return self.client.table("messages").select("*").eq("conversation_id", conversation_id).order("created_at", desc=False).execute()

    # Summary functions
    def save_summary(self, meeting_id, summary_text, key_points=None):
        """Save a summary for a meeting"""
        summary_data = {
            "meeting_id": meeting_id,
            "summary_text": summary_text
        }
        if key_points is not None:
            summary_data["key_points"] = key_points

        return self.client.table("summaries").insert(summary_data).execute()

    def get_meeting_summary(self, meeting_id):
        """Get the summary for a meeting"""
        return self.client.table("summaries").select("*").eq("meeting_id", meeting_id).execute()

    # Action items functions
    def save_action_items(self, conversation_id, action_items):
        """Save action items for a conversation"""
        # Transform action items to match database schema
        action_items_data = []
        for item in action_items:
            # Use defaults only if values are None or empty string
            priority = item.get("priority")
            if not priority:  # Catches None, empty string, etc.
                priority = "medium"

            assigned_to = item.get("assigned_to")
            if not assigned_to:
                assigned_to = "Unassigned"

            action_items_data.append({
                "conversation_id": conversation_id,
                "task": item.get("task"),
                "priority": priority,
                "assigned_to": assigned_to
            })

        return self.client.table("action_items").insert(action_items_data).execute()

    def get_conversation_action_items(self, conversation_id):
        """Get all action items for a conversation"""
        return self.client.table("action_items").select("*").eq("conversation_id", conversation_id).order("created_at", desc=False).execute()


def get_supabase():
    global _instance
    if _instance is None:
        _instance = SupabaseService()
    return _instance




