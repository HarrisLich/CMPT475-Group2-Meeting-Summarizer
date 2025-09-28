import whisper
import tempfile
import os
import ssl
from pathlib import Path
from typing import Dict, Any

# Bypass SSL verification for Whisper model download
ssl._create_default_https_context = ssl._create_unverified_context

class TranscriptionService:
    def __init__(self, model_size: str = "base"):
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
            result = model.transcribe(temp_file_path)

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
            "application/octet-stream"
        ]
        return content_type in allowed_types