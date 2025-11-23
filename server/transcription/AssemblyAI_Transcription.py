import os
import tempfile
from pathlib import Path
from typing import Dict, Any
from dotenv import load_dotenv

# Try to import AssemblyAI, but handle gracefully if not available
try:
    import assemblyai as aai
    ASSEMBLYAI_AVAILABLE = True
except ImportError:
    ASSEMBLYAI_AVAILABLE = False
    aai = None

load_dotenv()


class AssemblyAITranscriptionService:
    """
    AssemblyAI transcription service with built-in speaker diarization.
    
    Attributes:
        client: AssemblyAI API client
    """
    
    def __init__(self):
        """
        Initialize the AssemblyAI transcription service.
        
        Raises:
            ValueError: If AssemblyAI is not installed or ASSEMBLYAI_API_KEY is not set
        """
        if not ASSEMBLYAI_AVAILABLE:
            raise ValueError(
                "AssemblyAI package not installed. "
                "Install it with: pip install assemblyai"
            )
        
        api_key = os.getenv("ASSEMBLYAI_API_KEY")
        if not api_key:
            raise ValueError(
                "ASSEMBLYAI_API_KEY not found in environment variables. "
                "Please add it to your .env file. "
                "Get your free API key at https://www.assemblyai.com/"
            )
        
        # Set API key globally
        aai.settings.api_key = api_key
        # Initialize transcriber
        self.transcriber = aai.Transcriber()
    
    def transcribe_with_speakers(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        """
        Transcribe file with speaker diarization using AssemblyAI.
        - Runs on AssemblyAI's optimized cloud infrastructure
        - Single API call handles both transcription and diarization
        
        
        Args:
            file_content: Binary content of audio/video file
            filename: Original filename
            
        Returns:
            Transcription result dict with speaker information
        """
        import time
        start_time = time.time()
        
        print(f" Starting AssemblyAI transcription with speaker diarization for: {filename}")
        print(f"⚡ Using AssemblyAI cloud service (fast!)...")
        
        # Create temporary file
        suffix = Path(filename).suffix
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(file_content)
            temp_file_path = temp_file.name
        
        try:
            # Configure transcription with speaker diarization
            config = aai.TranscriptionConfig(
                speaker_labels=True,  # Enable speaker diarization
            )
            
            # Transcribe with speaker diarization
            print(f" Uploading and transcribing with AssemblyAI...")
            transcript = self.transcriber.transcribe(
                temp_file_path,
                config=config
            )
            
            # Wait for transcription to complete
            print(f" Waiting for transcription to complete...")
            max_wait_time = 600  # 10 minutes max
            wait_start = time.time()
            
            while transcript.status not in [aai.TranscriptStatus.completed, aai.TranscriptStatus.error]:
                if time.time() - wait_start > max_wait_time:
                    raise Exception("AssemblyAI transcription timed out after 10 minutes")
                
                time.sleep(3)  # Poll every 3 seconds
                try:
                    transcript = self.transcriber.get_by_id(transcript.id)
                except Exception as e:
                    print(f"⚠️ Error polling transcript: {str(e)}")
                    time.sleep(2)
                    continue
                
                if transcript.status == aai.TranscriptStatus.processing:
                    print(f" Processing... (status: {transcript.status})")
                elif transcript.status == aai.TranscriptStatus.queued:
                    print(f" Queued... (status: {transcript.status})")
            
            if transcript.status == aai.TranscriptStatus.error:
                error_msg = getattr(transcript, 'error', 'Unknown error')
                raise Exception(f"AssemblyAI transcription failed: {error_msg}")
            
            print(f"✅ AssemblyAI transcription complete!")
            
            # Extract transcription text
            transcription_text = transcript.text if transcript.text else ""
            
            # Extract segments with speaker information
            segments = []
            
            # Try utterances first (best format)
            if hasattr(transcript, 'utterances') and transcript.utterances:
                print(f"📊 Using utterances format ({len(transcript.utterances)} utterances)")
                for utterance in transcript.utterances:
                    # Handle speaker - it might be a string or integer
                    if utterance.speaker is not None:
                        if isinstance(utterance.speaker, (int, float)):
                            speaker_label = f"SPEAKER_{int(utterance.speaker):02d}"
                        else:
                            # Already a string - check if it's already formatted
                            speaker_str = str(utterance.speaker)
                            if speaker_str.startswith("SPEAKER_"):
                                speaker_label = speaker_str
                            else:
                                # Try to parse as number, otherwise use as-is
                                try:
                                    speaker_num = int(speaker_str)
                                    speaker_label = f"SPEAKER_{speaker_num:02d}"
                                except (ValueError, TypeError):
                                    speaker_label = f"SPEAKER_{speaker_str}"
                    else:
                        speaker_label = "UNKNOWN"
                    
                    segments.append({
                        "start": utterance.start / 1000.0,  # Convert ms to seconds
                        "end": utterance.end / 1000.0,
                        "text": utterance.text,
                        "speaker": speaker_label
                    })
            # Fallback: use words if utterances not available
            elif hasattr(transcript, 'words') and transcript.words:
                print(f"📊 Using words format ({len(transcript.words)} words)")
                current_speaker = None
                current_segment = None
                
                for word in transcript.words:
                    # Handle speaker - it might be a string or integer
                    if hasattr(word, 'speaker') and word.speaker is not None:
                        if isinstance(word.speaker, (int, float)):
                            speaker = f"SPEAKER_{int(word.speaker):02d}"
                        else:
                            # Already a string - check if it's already formatted
                            speaker_str = str(word.speaker)
                            if speaker_str.startswith("SPEAKER_"):
                                speaker = speaker_str
                            else:
                                # Try to parse as number, otherwise use as-is
                                try:
                                    speaker_num = int(speaker_str)
                                    speaker = f"SPEAKER_{speaker_num:02d}"
                                except (ValueError, TypeError):
                                    speaker = f"SPEAKER_{speaker_str}"
                    else:
                        speaker = "UNKNOWN"
                    
                    if speaker != current_speaker or current_segment is None:
                        # Start new segment
                        if current_segment:
                            segments.append(current_segment)
                        current_speaker = speaker
                        current_segment = {
                            "start": word.start / 1000.0 if hasattr(word, 'start') else 0,
                            "end": word.end / 1000.0 if hasattr(word, 'end') else 0,
                            "text": word.text if hasattr(word, 'text') else "",
                            "speaker": speaker
                        }
                    else:
                        # Continue current segment
                        if hasattr(word, 'end'):
                            current_segment["end"] = word.end / 1000.0
                        if hasattr(word, 'text'):
                            current_segment["text"] += " " + word.text
                
                if current_segment:
                    segments.append(current_segment)
            else:
                # No segments available, create a single segment from full text
                print(f"⚠️ No utterances or words found, creating single segment")
                segments.append({
                    "start": 0,
                    "end": transcript.audio_duration / 1000.0 if hasattr(transcript, 'audio_duration') else 0,
                    "text": transcription_text,
                    "speaker": "UNKNOWN"
                })
            
            # Build result
            result = {
                "filename": filename,
                "transcription": transcription_text,
                "language": transcript.language_code if hasattr(transcript, 'language_code') else None,
                "segments": segments,
                "model_used": "assemblyai",
                "service": "assemblyai_with_speakers",
                "duration": transcript.audio_duration / 1000.0 if hasattr(transcript, 'audio_duration') else None
            }
            
            elapsed_time = time.time() - start_time
            print(f"✅ AssemblyAI transcription with speakers complete in {elapsed_time:.1f}s!")
            print(f"📊 Found {len(set(s['speaker'] for s in segments))} speakers")
            
            return result
            
        except Exception as e:
            error_message = str(e)
            print(f"❌ AssemblyAI transcription failed: {error_message}")
            
            # Check for common errors
            if "api key" in error_message.lower() or "unauthorized" in error_message.lower():
                raise Exception(
                    f"Invalid AssemblyAI API key. Check your .env file. "
                    f"Get your free API key at https://www.assemblyai.com/"
                )
            elif "quota" in error_message.lower() or "limit" in error_message.lower():
                raise Exception(
                    f"AssemblyAI quota exceeded. Check your usage at https://www.assemblyai.com/app/usage"
                )
            else:
                raise Exception(f"AssemblyAI transcription failed: {error_message}")
        
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
    
    def is_supported_file_type(self, content_type: str) -> bool:
        """Check if file type is supported by AssemblyAI."""
        # AssemblyAI supports many formats
        supported_types = [
            "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav",
            "audio/mp4", "audio/m4a", "audio/x-m4a",
            "audio/flac", "audio/x-flac",
            "audio/webm", "audio/ogg", "audio/opus",
            "video/mp4", "video/mpeg", "video/quicktime",
            "application/octet-stream"  # Generic fallback
        ]
        return content_type.lower() in supported_types

