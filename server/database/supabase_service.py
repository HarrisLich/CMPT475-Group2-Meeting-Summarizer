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
        return self.client.table("meetings").insert({
            "user_id": user_id,
            "title": title,
            # Use date field instead of description
            "date": description
        }).execute()
        
    def save_transcription(self, meeting_id, transcription_text, language):
        # Adapt to your schema's column names
        return self.client.table("transcriptions").insert({
            "meeting_id": meeting_id,
            "transcription_text": transcription_text,
            # Store language in segments since you don't have a language column
            "segments": {"language": language}
        }).execute()
        
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
        """
        # Prepare segments data including speaker information
        segments = transcription_data.get("segments", [])
        
        # Save the full transcription with segments embedded in the JSON field
        transcription_result = self.save_transcription(
            meeting_id, 
            transcription_data.get("transcription", ""),
            transcription_data.get("language", "en")
        )
        
        # Store segments directly in the transcriptions table's segments field
        if segments and len(segments) > 0:
            # Update the segments field in the transcription record
            segment_data = {
                "segments": segments,
                "language": transcription_data.get("language", "en")
            }
            
            try:
                # Update the segments in the transcriptions record
                self.client.table("transcriptions")\
                    .update({"segments": segment_data})\
                    .eq("meeting_id", meeting_id)\
                    .execute()
            except Exception as e:
                print(f"Warning: Failed to update segments: {str(e)}")
        
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
    
    def save_speaker_mappings(self, meeting_id, mappings):
        """
        Save speaker name mappings for a meeting.
        
        Args:
            meeting_id: The meeting ID
            mappings: Dict mapping speaker IDs to names (e.g., {"SPEAKER_01": "John Doe"})
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
                mapping_entries.append({
                    "meeting_id": meeting_id,
                    "speaker_id": speaker_id,
                    "name": name,
                    "user_id": "test_user"  # Default for testing, would normally come from auth
                })
                
            # Bulk insert all mappings
            if mapping_entries:
                return self.client.table("speaker_mappings")\
                    .insert(mapping_entries)\
                    .execute()
            
            return {"data": [], "count": 0}
                
        except Exception as e:
            print(f"Error saving speaker mappings: {str(e)}")
            # Return empty response on error
            return {"data": [], "count": 0, "error": str(e)}
    
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


def get_supabase():
    global _instance
    if _instance is None:
        _instance = SupabaseService()
    return _instance




