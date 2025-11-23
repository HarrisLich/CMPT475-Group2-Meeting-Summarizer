"""
Groq-powered Transcription Service Module

This module provides FAST cloud-based transcription using Groq's Whisper API.
Perfect for hybrid approach: Groq for transcription, Ollama for summarization.

Benefits:
- 10-30× faster than local Whisper
- Free tier: 25MB files (~45-60 min meetings)
- Minimal rate limit impact (one request per meeting)
"""

import os
import tempfile
from pathlib import Path
from typing import Dict, Any
from groq import Groq
from dotenv import load_dotenv

load_dotenv()


class GroqTranscriptionService:
    """
    Groq-powered transcription service using Whisper Large V3.

    Attributes:
        client: Groq API client
        model: Whisper model to use (default: whisper-large-v3)
    """

    def __init__(self, model: str = "whisper-large-v3"):
        """
        Initialize the Groq transcription service.

        Args:
            model: Groq Whisper model to use.
                Options: whisper-large-v3, whisper-large-v3-turbo (faster)

        Raises:
            ValueError: If GROQ_API_KEY is not set in environment
        """
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError(
                "GROQ_API_KEY not found in environment variables. "
                "Please add it to your .env file."
            )

        self.client = Groq(api_key=api_key)
        self.model = model

    def transcribe_file(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        """
        Transcribe an audio/video file using Groq's Whisper API.

        Args:
            file_content: Binary content of the audio/video file
            filename: Original filename (used for extension detection)

        Returns:
            Dict containing:
                - filename: Original filename
                - transcription: Full transcribed text
                - language: Detected language (if available)
                - segments: List of timestamped segments (if available)
                - model_used: Which Whisper model was used
                - service: "groq" (to identify transcription source)

        Raises:
            Exception: If transcription fails (API error, file too large, etc.)

        Notes:
            - Free tier limit: 25MB per file
            - Supported formats: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm
            - For files >25MB, consider chunking or upgrading to paid tier
        """
        # Create temporary file with proper extension
        suffix = Path(filename).suffix
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(file_content)
            temp_file_path = temp_file.name

        try:
            # Open the file and send to Groq
            with open(temp_file_path, "rb") as audio_file:
                # Call Groq's Whisper API
                transcription = self.client.audio.transcriptions.create(
                    file=(filename, audio_file.read()),
                    model=self.model,
                    response_format="verbose_json",  # Get detailed response with timestamps
                    temperature=0.0  # Deterministic output
                )

            # Parse the response and normalize segments format
            segments = []
            if hasattr(transcription, "segments") and transcription.segments:
                for seg in transcription.segments:
                    # Normalize segment format - handle both dict and object formats
                    if isinstance(seg, dict):
                        segment = {
                            "start": seg.get("start", 0),
                            "end": seg.get("end", 0),
                            "text": seg.get("text", "")
                        }
                    else:
                        # Object format (Groq API response)
                        segment = {
                            "start": getattr(seg, "start", 0),
                            "end": getattr(seg, "end", 0),
                            "text": getattr(seg, "text", "")
                        }
                    segments.append(segment)
            
            result = {
                "filename": filename,
                "transcription": transcription.text,
                "language": getattr(transcription, "language", None),
                "segments": segments,
                "model_used": self.model,
                "service": "groq",
                "duration": getattr(transcription, "duration", None)
            }

            return result

        except Exception as e:
            # Enhanced error handling
            error_message = str(e)

            # Check for common errors
            if "file size" in error_message.lower() or "25" in error_message:
                raise Exception(
                    f"File too large for Groq free tier (max 25MB). "
                    f"Consider compressing audio or using local Whisper. Error: {error_message}"
                )
            elif "rate limit" in error_message.lower():
                raise Exception(
                    f"Groq rate limit reached. Try again later or use local Whisper. Error: {error_message}"
                )
            elif "api key" in error_message.lower():
                raise Exception(
                    f"Invalid Groq API key. Check your .env file. Error: {error_message}"
                )
            else:
                raise Exception(f"Groq transcription failed: {error_message}")

        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)

    def is_supported_file_type(self, content_type: str) -> bool:
        """
        Check if the file type is supported by Groq's Whisper API.

        Args:
            content_type: MIME type of the file

        Returns:
            True if supported, False otherwise
        """
        allowed_types = [
            "audio/flac",
            "audio/mpeg",  # mp3
            "audio/mp3",
            "audio/mp4",
            "audio/mpeg",  # mpga
            "audio/m4a",
            "audio/ogg",
            "audio/wav",
            "audio/webm",
            "video/mp4",
            "video/mpeg",
            "video/quicktime",
            "application/octet-stream"  # Generic binary
        ]
        return content_type in allowed_types

    def check_file_size(self, file_size_bytes: int, is_free_tier: bool = True) -> Dict[str, Any]:
        """
        Check if file size is within Groq's limits.

        Args:
            file_size_bytes: Size of the file in bytes
            is_free_tier: Whether using free tier (default: True)

        Returns:
            Dict containing:
                - is_valid: Whether file size is acceptable
                - size_mb: File size in MB
                - limit_mb: Maximum allowed size
                - message: User-friendly message
        """
        size_mb = file_size_bytes / (1024 * 1024)
        limit_mb = 25 if is_free_tier else 100

        is_valid = size_mb <= limit_mb

        return {
            "is_valid": is_valid,
            "size_mb": round(size_mb, 2),
            "limit_mb": limit_mb,
            "message": (
                f"File size: {size_mb:.2f}MB (limit: {limit_mb}MB)" if is_valid
                else f"File too large: {size_mb:.2f}MB exceeds {limit_mb}MB limit"
            )
        }


class HybridTranscriptionService:
    """
    Hybrid transcription service that intelligently chooses between Groq and local Whisper.

    Strategy:
    - Try Groq first (fast, cloud-based)
    - Fallback to local Whisper if Groq fails (rate limit, file too large, etc.)
    """

    def __init__(self, whisper_model: str = "small", groq_model: str = "whisper-large-v3"):
        """
        Initialize hybrid transcription service.

        Args:
            whisper_model: Local Whisper model size (tiny, small, base, medium, large)
            groq_model: Groq Whisper model (whisper-large-v3, whisper-large-v3-turbo)
        """
        self.whisper_model = whisper_model
        self.groq_model = groq_model

        # Try to initialize Groq (may fail if API key not set)
        try:
            self.groq_service = GroqTranscriptionService(model=groq_model)
            self.groq_available = True
        except ValueError:
            self.groq_service = None
            self.groq_available = False

        # Always have local Whisper as fallback
        from transcription.Local_Whisper import LocalWhisperService
        self.local_service = LocalWhisperService(model_size=whisper_model)

    def transcribe_file(self, file_content: bytes, filename: str, prefer_groq: bool = True) -> Dict[str, Any]:
        """
        Transcribe file using hybrid approach (Groq first, local fallback).

        Args:
            file_content: Binary content of audio/video file
            filename: Original filename
            prefer_groq: Whether to prefer Groq over local (default: True)

        Returns:
            Transcription result dict with additional 'service' field
        """
        # Check file size first
        file_size = len(file_content)

        # Try Groq if available and preferred
        if prefer_groq and self.groq_available:
            size_check = self.groq_service.check_file_size(file_size)

            if size_check["is_valid"]:
                try:
                    print(f"🚀 Using Groq for fast transcription ({size_check['size_mb']}MB)...")
                    result = self.groq_service.transcribe_file(file_content, filename)
                    print(f"✅ Groq transcription complete!")
                    return result
                except Exception as e:
                    print(f"⚠️  Groq failed: {str(e)}")
                    print(f"🔄 Falling back to local Whisper...")
            else:
                print(f"⚠️  File too large for Groq: {size_check['message']}")
                print(f"🔄 Using local Whisper instead...")

        # Fallback to local Whisper
        print(f"🏠 Using local Whisper (model: {self.whisper_model})...")
        result = self.local_service.transcribe_file(file_content, filename)
        result["service"] = "local"
        result["model_used"] = self.whisper_model
        print(f"✅ Local transcription complete!")
        return result

    def is_supported_file_type(self, content_type: str) -> bool:
        """Check if file type is supported by either service."""
        return self.local_service.is_supported_file_type(content_type)
    
    def transcribe_with_speakers(self, file_content: bytes, filename: str, hf_token: str = None, use_assemblyai: bool = True) -> Dict[str, Any]:
        """
        Transcribe file with speaker diarization using FAST AssemblyAI (preferred) or parallel processing.
        
        Strategy:
        - Try AssemblyAI first (fastest: 2-5 min for 30-min meeting, single API call)
        - Fallback to parallel Groq + pyannote if AssemblyAI not available
        
        Args:
            file_content: Binary content of audio/video file
            filename: Original filename
            hf_token: HuggingFace token for pyannote models (not needed if using AssemblyAI)
            use_assemblyai: Whether to try AssemblyAI first (default: True)
            
        Returns:
            Transcription result dict with speaker information
        """
        # Try AssemblyAI first (fastest option)
        if use_assemblyai:
            try:
                from .AssemblyAI_Transcription import AssemblyAITranscriptionService
                print(f" Trying AssemblyAI for FAST speaker diarization...")
                assemblyai_service = AssemblyAITranscriptionService()
                result = assemblyai_service.transcribe_with_speakers(file_content, filename)
                print(f" AssemblyAI transcription complete (fastest method)!")
                return result
            except ValueError as e:
                # AssemblyAI not configured, fall back to parallel processing
                print(f" AssemblyAI not configured: {str(e)}")
                print(f" Falling back to parallel Groq + pyannote...")
            except Exception as e:
                # AssemblyAI failed, fall back
                print(f" AssemblyAI failed: {str(e)}")
                print(f" Falling back to parallel Groq + pyannote...")
        
        # Fallback: Parallel processing with Groq + pyannote
        from .SpeakerDiarization import SpeakerDiarizationService
        from concurrent.futures import ThreadPoolExecutor, as_completed
        import time
        
        print(f" Starting PARALLEL speaker diarization transcription for: {filename}")
        print(f"⚡ Running Groq transcription and pyannote diarization in parallel...")
        
        start_time = time.time()
        transcription_result = None
        speaker_segments = None
        transcription_error = None
        diarization_error = None
        
        # Define transcription function
        def run_transcription():
            nonlocal transcription_result, transcription_error
            try:
                if self.groq_available:
                    print(f"📝 [Thread 1] Starting Groq transcription...")
                    transcription_result = self.groq_service.transcribe_file(file_content, filename)
                    print(f"✅ [Thread 1] Groq transcription complete!")
                else:
                    print(f"📝 [Thread 1] Starting local Whisper transcription...")
                    transcription_result = self.local_service.transcribe_file(file_content, filename)
                    print(f"✅ [Thread 1] Local transcription complete!")
            except Exception as e:
                print(f"❌ [Thread 1] Transcription failed: {str(e)}")
                transcription_error = e
                # Fallback to local if Groq fails
                if self.groq_available:
                    try:
                        print(f"🔄 [Thread 1] Falling back to local Whisper...")
                        transcription_result = self.local_service.transcribe_file(file_content, filename)
                        transcription_error = None
                    except Exception as fallback_error:
                        transcription_error = fallback_error
        
        # Define diarization function
        def run_diarization():
            nonlocal speaker_segments, diarization_error
            try:
                print(f"🎤 [Thread 2] Starting speaker diarization...")
                diarization_service = SpeakerDiarizationService(hf_token=hf_token)
                speaker_segments = diarization_service.process_audio(file_content, filename)
                print(f"✅ [Thread 2] Speaker diarization complete: found {len(set(s['speaker'] for s in speaker_segments))} speakers")
            except Exception as e:
                print(f"❌ [Thread 2] Speaker diarization failed: {str(e)}")
                diarization_error = e
        
        # Run both in parallel using ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=2) as executor:
            # Submit both tasks
            transcription_future = executor.submit(run_transcription)
            diarization_future = executor.submit(run_diarization)
            
            # Wait for both to complete
            for future in as_completed([transcription_future, diarization_future]):
                try:
                    future.result()  # This will raise any exceptions
                except Exception as e:
                    print(f"⚠️ Task completed with error: {str(e)}")
        
        # Check if transcription succeeded
        if transcription_error and not transcription_result:
            raise Exception(f"Transcription failed: {str(transcription_error)}")
        
        if not transcription_result:
            raise Exception("Transcription returned no result")
        
        # Ensure we have segments
        if "segments" not in transcription_result:
            transcription_result["segments"] = []
        
        # If diarization failed, return transcription without speakers
        if diarization_error or not speaker_segments:
            print(f"⚠️ Diarization failed, returning transcription without speaker tags...")
            transcription_result["service"] = "groq" if self.groq_available else "local"
            transcription_result["model_used"] = self.groq_model if self.groq_available else self.whisper_model
            return transcription_result
        
        # Combine results - match each transcription segment with speakers
        print(f"🔗 Combining transcription with speaker tags...")
        for segment in transcription_result.get("segments", []):
            start_time_seg = segment.get("start", 0)
            end_time_seg = segment.get("end", 0)
            
            # Find overlapping speaker segments
            speakers = []
            for spk in speaker_segments:
                if spk["start"] < end_time_seg and spk["end"] > start_time_seg:
                    speakers.append(spk["speaker"])
            
            # Use most frequent speaker if multiple
            if speakers:
                segment["speaker"] = max(set(speakers), key=speakers.count)
            else:
                segment["speaker"] = "UNKNOWN"
        
        # Update metadata
        transcription_result["service"] = "groq_with_speakers_parallel" if self.groq_available else "local_whisper_with_speakers_parallel"
        transcription_result["model_used"] = f"{self.groq_model if self.groq_available else self.whisper_model} + pyannote (parallel)"
        
        elapsed_time = time.time() - start_time
        print(f"✅ Speaker-tagged transcription complete in {elapsed_time:.1f}s (parallel processing)!")
        return transcription_result