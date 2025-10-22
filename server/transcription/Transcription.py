"""
Transcription Service Module

This module provides audio transcription using Groq's Whisper API.
"""

import os
import tempfile
from pathlib import Path
from typing import Dict, Any
from groq import Groq
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class TranscriptionService:
    """
    Transcription service using Groq's Whisper API.

    Attributes:
        groq_client (Groq): The Groq API client
        model (str): The Whisper model to use (default: whisper-large-v3-turbo)
    """

    def __init__(self, model_size: str = "whisper-large-v3-turbo"):
        """
        Initialize the TranscriptionService.

        Args:
            model_size (str): Groq Whisper model to use. Options:
                - whisper-large-v3-turbo (fastest, recommended)
                - whisper-large-v3
        """
        # Get Groq API key from environment variable
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY environment variable is required")

        # Initialize Groq client
        self.groq_client = Groq(api_key=api_key)

        # Set the model
        self.model = model_size

    def transcribe_file(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        """
        Transcribe an audio file using Groq's Whisper API.

        Args:
            file_content (bytes): The audio file content as bytes
            filename (str): The original filename (used to determine file type)

        Returns:
            Dict[str, Any]: A dictionary containing:
                - filename (str): The original filename
                - transcription (str): The transcribed text
                - language (str): Detected language (if available)
                - segments (list): Timestamped segments (if available)
                - error (str): Error message if failed
                - error_type (str): Type of error (rate_limit, api_error, etc.)
        """
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix) as temp_file:
            temp_file.write(file_content)
            temp_file_path = temp_file.name

        try:
            # Open the file and send to Groq Whisper API
            with open(temp_file_path, "rb") as audio_file:
                transcription = self.groq_client.audio.transcriptions.create(
                    file=(filename, audio_file.read()),
                    model=self.model,
                    response_format="verbose_json",  # Get detailed response with timestamps
                )

            # Extract segments with timestamps if available
            segments = []
            if hasattr(transcription, 'segments') and transcription.segments:
                segments = [
                    {
                        "start": segment.get("start"),
                        "end": segment.get("end"),
                        "text": segment.get("text")
                    }
                    for segment in transcription.segments
                ]

            return {
                "filename": filename,
                "transcription": transcription.text,
                "language": getattr(transcription, 'language', None),
                "segments": segments
            }

        except Exception as e:
            error_message = str(e)
            error_type = "api_error"

            # Check if this is a rate limit error
            if "rate_limit" in error_message.lower() or "429" in error_message or "quota" in error_message.lower():
                error_type = "rate_limit"
                error_message = "Groq API rate limit exceeded. Please wait a moment before trying again."
            elif "503" in error_message or "service unavailable" in error_message.lower():
                error_type = "rate_limit"
                error_message = "Groq API is temporarily unavailable (likely due to rate limits). Please try again in a few moments."

            return {
                "filename": filename,
                "error": error_message,
                "error_type": error_type,
                "transcription": None
            }

        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)

    def is_supported_file_type(self, content_type: str) -> bool:
        """
        Check if the file type is supported for transcription.

        Args:
            content_type (str): The MIME type of the file

        Returns:
            bool: True if supported, False otherwise
        """
        allowed_types = [
            "audio/mpeg",
            "audio/wav",
            "audio/mp3",
            "audio/mp4",
            "audio/m4a",
            "audio/flac",
            "audio/webm",
            "audio/ogg",
            "video/mp4",
            "video/mpeg",
            "video/quicktime",
            "video/webm",
            "application/octet-stream"
        ]
        return content_type in allowed_types
