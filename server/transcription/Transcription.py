import whisper
import tempfile
import os
import ssl
from pathlib import Path
from typing import Dict, Any

# Bypass SSL verification for Whisper model download
ssl._create_default_https_context = ssl._create_unverified_context

class TranscriptionService:
    def __init__(self, model_size: str = "small"):
        """
        Initialize the TranscriptionService with a specified Whisper model.

        Args:
            model_size: Whisper model size. Options:
                - 'tiny': Fastest, lowest accuracy (~1GB RAM, 5x faster)
                - 'small': Good balance for CPU-only (2-3x faster, recommended)
                - 'base': Default, moderate speed/accuracy
                - 'medium': Slower but more accurate
                - 'large': Slowest, highest accuracy (not recommended for CPU-only)
        """
        self.model_size = model_size
        self._model = None

    def _load_model(self):
        if self._model is None:
            self._model = whisper.load_model(self.model_size)
        return self._model

    def transcribe_file(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix) as temp_file:
            temp_file.write(file_content)
            temp_file_path = temp_file.name

        try:
            # Load model and transcribe
            model = self._load_model()
            # CPU optimization: Use fp16=False for better CPU performance
            result = model.transcribe(
                temp_file_path,
                fp16=False,  # Disable half-precision (not supported on CPU)
                verbose=False  # Reduce console output
            )

            return {
                "filename": filename,
                "transcription": result["text"],
                "language": result.get("language"),
                "segments": result.get("segments", [])
            }

        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)

    def is_supported_file_type(self, content_type: str) -> bool:
        allowed_types = [
            "audio/mpeg",
            "audio/wav",
            "audio/mp3",
            "audio/mp4",
            "audio/m4a",
            "audio/flac",
            "video/mp4",
            "video/mpeg",
            "video/quicktime",
            "application/octet-stream"
        ]
        return content_type in allowed_types