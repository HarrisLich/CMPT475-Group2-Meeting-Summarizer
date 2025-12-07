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
        # Adapt to existing schema (no description field)
        from datetime import datetime
        # Use current date/time for the date field (timestamp)
        return self.client.table("meetings").insert({
            "user_id": user_id,
            "title": title,
            # Use current timestamp for date field
            "date": datetime.now().isoformat()
        }).execute()
        
    def upload_audio_file(self, file_content: bytes, filename: str, user_id: str):
        """
        Upload audio file to Supabase Storage.

        Args:
            file_content: Audio file content as bytes
            filename: Original filename
            user_id: User ID for organizing files

        Returns:
            Public URL of the uploaded file
        """
        import uuid
        from datetime import datetime

        # Generate unique filename to prevent collisions
        file_extension = filename.split('.')[-1] if '.' in filename else 'mp3'
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_filename = f"{user_id}/{timestamp}_{uuid.uuid4().hex[:8]}.{file_extension}"

        # Upload to Supabase Storage
        try:
            # Upload file to meeting-audio bucket
            self.client.storage.from_('meeting-audio').upload(
                path=unique_filename,
                file=file_content,
                file_options={
                    "content-type": f"audio/{file_extension}",
                    "upsert": "false"
                }
            )

            # Get public URL
            public_url = self.client.storage.from_('meeting-audio').get_public_url(unique_filename)
            return public_url

        except Exception as e:
            print(f"Error uploading audio to Supabase Storage: {str(e)}")
            raise Exception(f"Failed to upload audio file: {str(e)}")

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
    
    def save_transcription_with_speakers(self, meeting_id, transcription_data):
        """
        Save transcription with speaker information.

        Args:
            meeting_id: The meeting ID
            transcription_data: Dict containing:
                - transcription: Full text
                - segments: List of segments with speaker info
                - language: Detected language
                - filename: Original filename
                - audio_url: Optional Supabase Storage URL for the audio file
        """
        # Prepare segments data including speaker information
        segments = transcription_data.get("segments", [])

        # Prepare segment data with language info
        segment_data = {
            "segments": segments,
            "language": transcription_data.get("language", "en")
        }

        # Extract audio_url if provided
        audio_url = transcription_data.get("audio_url")

        # Save the full transcription with segments embedded in the JSON field
        transcription_result = self.save_transcription(
            meeting_id,
            transcription_data.get("transcription", ""),
            audio_url=audio_url,
            segments=segment_data
        )

        return transcription_result
    
    def get_meeting_speakers(self, meeting_id):
        """
        Get unique speakers from a meeting transcription.
        
        Returns:
            List of speakers with their IDs and sample text
        """
        # Get transcription with segments
        response = self.client.table("transcriptions")\
            .select("segments")\
            .eq("meeting_id", meeting_id)\
            .execute()
        
        # Group by speaker and get sample text
        speakers_dict = {}
        
        if response.data and len(response.data) > 0:
            # Extract segments from response
            transcription = response.data[0]
            segments_data = transcription.get("segments", {})
            
            # Handle both formats - segments as an array or as an object with segments property
            segments = []
            if isinstance(segments_data, list):
                segments = segments_data
            elif isinstance(segments_data, dict) and "segments" in segments_data:
                segments = segments_data.get("segments", [])
            
            # Process each segment
            for segment in segments:
                speaker_id = segment.get("speaker", "UNKNOWN")
                text = segment.get("text", "")
                
                if speaker_id not in speakers_dict:
                    speakers_dict[speaker_id] = {
                        "id": speaker_id,
                        "sample_text": text[:100] if text else ""  # First 100 chars as sample
                    }
        
        return list(speakers_dict.values())
    
    def save_speaker_mappings(self, meeting_id, mappings, user_id=None):
        """
        Save speaker name mappings for a meeting.
        
        Args:
            meeting_id: The meeting ID
            mappings: Dict mapping speaker IDs to names (e.g., {"SPEAKER_01": "John Doe"})
            user_id: Optional user ID (for authentication/ownership)
            
        Returns:
            Dict with success status and optional error message
        """
        # Adapt to your schema which has individual records per mapping
        try:
            # Delete existing mappings for this meeting to replace them
            # This simulates an update operation
            self.client.table("speaker_mappings")\
                .delete()\
                .eq("meeting_id", meeting_id)\
                .execute()
                
            # Insert new mappings one by one
            mapping_entries = []
            for speaker_id, name in mappings.items():
                entry = {
                    "meeting_id": meeting_id,
                    "speaker_id": speaker_id,
                    "name": name
                }
                # Add user_id if provided
                if user_id:
                    entry["user_id"] = user_id
                mapping_entries.append(entry)
                
            # Bulk insert all mappings
            if mapping_entries:
                result = self.client.table("speaker_mappings")\
                    .insert(mapping_entries)\
                    .execute()
                
                # Check if result has data (successful insert)
                if hasattr(result, 'data') and result.data:
                    return {"success": True, "data": result.data, "count": len(result.data)}
                else:
                    return {"success": True, "data": [], "count": 0}
            
            return {"success": True, "data": [], "count": 0}
                
        except Exception as e:
            print(f"Error saving speaker mappings: {str(e)}")
            # Return error in response
            return {"success": False, "error": str(e), "data": [], "count": 0}
    
    def get_speaker_mappings(self, meeting_id):
        """
        Get speaker name mappings for a meeting.
        
        Returns:
            Dict mapping speaker IDs to names
        """
        try:
            response = self.client.table("speaker_mappings")\
                .select("speaker_id, name")\
                .eq("meeting_id", meeting_id)\
                .execute()
            
            # Convert from array of records to dictionary
            mappings = {}
            if response.data:
                for mapping in response.data:
                    speaker_id = mapping.get("speaker_id")
                    name = mapping.get("name")
                    if speaker_id and name:
                        mappings[speaker_id] = name
            
            return mappings
        except Exception as e:
            print(f"Error retrieving speaker mappings: {str(e)}")
            return {}

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

    def delete_conversation(self, conversation_id):
        """
        Delete a conversation and ALL associated data including:
        - Messages
        - Action items
        - Meeting
        - Transcription
        - Summary

        This is a complete cleanup to avoid wasted database space.
        """
        # Get the conversation to find the meeting_id
        conversation = self.client.table("conversations").select("meeting_id").eq("id", conversation_id).execute()

        if not conversation.data:
            raise ValueError(f"Conversation {conversation_id} not found")

        meeting_id = conversation.data[0].get("meeting_id")

        # Delete conversation-related records
        self.client.table("messages").delete().eq("conversation_id", conversation_id).execute()
        self.client.table("action_items").delete().eq("conversation_id", conversation_id).execute()

        # Delete the conversation
        self.client.table("conversations").delete().eq("id", conversation_id).execute()

        # If there's a meeting, delete all meeting-related records
        if meeting_id:
            # Delete transcription
            self.client.table("transcriptions").delete().eq("meeting_id", meeting_id).execute()

            # Delete summary
            self.client.table("summaries").delete().eq("meeting_id", meeting_id).execute()

            # Finally, delete the meeting itself
            self.client.table("meetings").delete().eq("id", meeting_id).execute()

        return {"success": True, "deleted_conversation_id": conversation_id, "deleted_meeting_id": meeting_id}

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
    def save_action_items(self, conversation_id, action_items, contact_mappings=None):
        """
        Save action items for a conversation.
        
        Args:
            conversation_id: Conversation ID
            action_items: List of action item dicts
            contact_mappings: Optional dict mapping assigned_to names to contact_ids
        """
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
    
    def update_action_items_with_speaker_names(self, meeting_id, speaker_mappings):
        """
        Update action items to replace speaker IDs with actual names.
        
        Args:
            meeting_id: The meeting ID
            speaker_mappings: Dict mapping speaker IDs to names (e.g., {"SPEAKER_01": "Marko Pavic"})
            
        Returns:
            Number of action items updated
        """
        try:
            # Get the conversation for this meeting
            conversations = self.client.table("conversations")\
                .select("id")\
                .eq("meeting_id", meeting_id)\
                .execute()
            
            if not conversations.data or len(conversations.data) == 0:
                return 0
            
            conversation_id = conversations.data[0]["id"]
            
            # Get all action items for this conversation
            action_items_result = self.get_conversation_action_items(conversation_id)
            
            if not action_items_result.data:
                return 0
            
            updated_count = 0
            
            # Update each action item if assigned_to matches a speaker ID
            for item in action_items_result.data:
                assigned_to = item.get("assigned_to")
                
                # Check if assigned_to is a speaker ID that we have a mapping for
                if assigned_to in speaker_mappings:
                    actual_name = speaker_mappings[assigned_to]
                    
                    # Update the action item in the database
                    self.client.table("action_items")\
                        .update({"assigned_to": actual_name})\
                        .eq("id", item["id"])\
                        .execute()
                    
                    print(f"[DB] Updated action item: {assigned_to} → {actual_name}")
                    updated_count += 1
            
            return updated_count
            
        except Exception as e:
            print(f"[DB ERROR] Failed to update action items with speaker names: {str(e)}")
            return 0
    
    def get_action_items_by_assigned(self, assigned_to: str, conversation_id: str = None):
        """Get action items filtered by assigned person"""
        query = self.client.table("action_items").select("*").eq("assigned_to", assigned_to)
        if conversation_id:
            query = query.eq("conversation_id", conversation_id)
        return query.order("created_at", desc=False).execute()
    
    def get_pending_action_items(self, conversation_ids: list = None):
        """Get all pending action items, optionally filtered by conversation IDs"""
        query = self.client.table("action_items").select("*").neq("assigned_to", "Unassigned")
        if conversation_ids:
            query = query.in_("conversation_id", conversation_ids)
        return query.order("created_at", desc=False).execute()

    # User account functions
    def delete_user_account(self, user_id):
        """
        Delete a user account and ALL associated data including:
        - All user meetings (and their transcriptions, summaries, conversations)
        - All user conversations (and their messages, action items)
        - User profile
        - Authentication account

        This performs a complete account deletion with cascading cleanup.

        Note: This method uses the service role key (backend only) to execute the deletion,
        but should only be called after verifying the user's identity via JWT token.
        """
        # Step 1: Get all conversations for the user
        conversations_result = self.client.table("conversations").select("id").eq("user_id", user_id).execute()
        conversation_ids = [conv["id"] for conv in conversations_result.data]

        # Step 2: Delete all messages and action items for each conversation
        for conversation_id in conversation_ids:
            self.client.table("messages").delete().eq("conversation_id", conversation_id).execute()
            self.client.table("action_items").delete().eq("conversation_id", conversation_id).execute()

        # Step 3: Get all meetings for the user
        meetings_result = self.client.table("meetings").select("id").eq("user_id", user_id).execute()
        meeting_ids = [meeting["id"] for meeting in meetings_result.data]

        # Step 4: Delete all transcriptions and summaries for each meeting
        for meeting_id in meeting_ids:
            self.client.table("transcriptions").delete().eq("meeting_id", meeting_id).execute()
            self.client.table("summaries").delete().eq("meeting_id", meeting_id).execute()

        # Step 5: Delete all conversations
        self.client.table("conversations").delete().eq("user_id", user_id).execute()

        # Step 6: Delete all meetings
        self.client.table("meetings").delete().eq("user_id", user_id).execute()

        # Step 7: Delete the user profile
        self.client.table("profiles").delete().eq("id", user_id).execute()

        # Step 8: Delete the authentication account (requires service role key)
        self.client.auth.admin.delete_user(user_id)

        return {
            "success": True,
            "deleted_user_id": user_id,
            "deleted_conversations": len(conversation_ids),
            "deleted_meetings": len(meeting_ids)
        }


    # Contact Management Functions
    def create_contact(self, user_id, name, email=None, slack_user_id=None, slack_email=None, phone=None, company=None, job_title=None):
        """
        Create a new contact for a user.
        
        Args:
            user_id: Owner of this contact
            name: Contact name (required)
            email: Email address (optional)
            slack_user_id: Slack user ID or handle (optional)
            slack_email: Slack email (optional)
            phone: Phone number (optional)
            company: Company name (optional)
            job_title: Job title (optional)
        
        Returns:
            Created contact data
        """
        contact_data = {
            "user_id": user_id,
            "name": name
        }
        
        if email:
            contact_data["email"] = email
        if slack_user_id:
            contact_data["slack_user_id"] = slack_user_id
        if slack_email:
            contact_data["slack_email"] = slack_email
        if phone:
            contact_data["phone"] = phone
        if company:
            contact_data["company"] = company
        if job_title:
            contact_data["job_title"] = job_title
        
        return self.client.table("contacts").insert(contact_data).execute()
    
    def get_user_contacts(self, user_id):
        """
        Get all contacts for a user.
        
        Args:
            user_id: User ID
        
        Returns:
            List of contacts ordered by name
        """
        return self.client.table("contacts").select("*").eq("user_id", user_id).order("name", desc=False).execute()
    
    def get_contact_by_id(self, contact_id):
        """
        Get a specific contact by ID.
        
        Args:
            contact_id: Contact UUID
        
        Returns:
            Contact data
        """
        return self.client.table("contacts").select("*").eq("id", contact_id).execute()
    
    def update_contact(self, contact_id, name=None, email=None, slack_user_id=None, slack_email=None, phone=None, company=None, job_title=None):
        """
        Update a contact.
        
        Args:
            contact_id: Contact UUID
            name, email, etc.: Fields to update (optional)
        
        Returns:
            Updated contact data
        """
        update_data = {}
        
        if name is not None:
            update_data["name"] = name
        if email is not None:
            update_data["email"] = email
        if slack_user_id is not None:
            update_data["slack_user_id"] = slack_user_id
        if slack_email is not None:
            update_data["slack_email"] = slack_email
        if phone is not None:
            update_data["phone"] = phone
        if company is not None:
            update_data["company"] = company
        if job_title is not None:
            update_data["job_title"] = job_title
        
        if not update_data:
            return {"data": [], "error": "No fields to update"}
        
        return self.client.table("contacts").update(update_data).eq("id", contact_id).execute()
    
    def delete_contact(self, contact_id):
        """
        Delete a contact.
        
        Args:
            contact_id: Contact UUID
        
        Returns:
            Deletion result
        """
        return self.client.table("contacts").delete().eq("id", contact_id).execute()
    
    def get_contact_by_email(self, user_id, email):
        """
        Find a contact by email for a specific user.
        
        Args:
            user_id: User ID
            email: Email address to search for
        
        Returns:
            Contact data if found, None otherwise
        """
        result = self.client.table("contacts").select("*").eq("user_id", user_id).eq("email", email).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        return None

def get_supabase():
    global _instance
    if _instance is None:
        _instance = SupabaseService()
    return _instance




