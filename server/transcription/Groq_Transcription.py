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

            # Parse the response
            result = {
                "filename": filename,
                "transcription": transcription.text,
                "language": getattr(transcription, "language", None),
                "segments": getattr(transcription, "segments", []),
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
    
    def transcribe_with_speakers(self, file_content: bytes, filename: str, hf_token: str = None) -> Dict[str, Any]:
        """
        Transcribe file with speaker diarization using local Whisper + pyannote.
        
        Note: Speaker diarization requires local processing, so this always uses LocalWhisperService
        even if Groq is available, since Groq doesn't support speaker diarization.
        
        Args:
            file_content: Binary content of audio/video file
            filename: Original filename
            hf_token: HuggingFace token for pyannote models
            
        Returns:
            Transcription result dict with speaker information
        """
        print(f"Starting speaker diarization transcription for: {filename}")
        print(f"Using local Whisper + pyannote for speaker identification")
        
        # Always use local service for speaker diarization
        result = self.local_service.transcribe_with_speakers(file_content, filename, hf_token)
        result["service"] = "local_whisper_with_speakers"
        result["model_used"] = f"{self.whisper_model} + pyannote"
        
        print(f"✅ Speaker diarization transcription complete!")
        return result