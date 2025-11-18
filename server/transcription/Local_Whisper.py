"""
Local Whisper Transcription Service Module

This module provides LOCAL audio transcription using faster-whisper.
Runs entirely on your machine - no API calls, unlimited usage.
4-5x faster than base Whisper with same accuracy!
"""

from faster_whisper import WhisperModel
import tempfile
import os
import ssl
from pathlib import Path
from typing import Dict, Any

# Bypass SSL verification for Whisper model download
ssl._create_default_https_context = ssl._create_unverified_context


class LocalWhisperService:
    def __init__(self, model_size: str = "tiny"):
        """
        Initialize the Local Whisper transcription service.

        Args:
            model_size: Whisper model size. Options:
                - 'tiny': Fastest, lowest accuracy (~1GB RAM, 5x faster) - DEFAULT for failsafe
                - 'small': Good balance for CPU-only (2-3x faster)
                - 'base': Default, moderate speed/accuracy
                - 'medium': Slower but more accurate
                - 'large': Slowest, highest accuracy (not recommended for CPU-only)
        """
        self.model_size = model_size
        self._model = None

    def _load_model(self):
        if self._model is None:
            # Load model with faster-whisper
            # device="cpu" works on all platforms, "auto" will use GPU if available
            self._model = WhisperModel(
                self.model_size,
                device="cpu",
                compute_type="int8"  # 8-bit quantization for speed/memory efficiency
            )
        return self._model

    def transcribe_file(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix) as temp_file:
            temp_file.write(file_content)
            temp_file_path = temp_file.name

        try:
            # Load model and transcribe
            model = self._load_model()

            # faster-whisper returns (segments, info) tuple
            segments, info = model.transcribe(
                temp_file_path,
                beam_size=5,  # Good balance of speed/accuracy
                vad_filter=True  # Voice Activity Detection for better results
            )

            # Convert segments iterator to list and build full text
            segments_list = []
            full_text = []

            for segment in segments:
                segments_list.append({
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text
                })
                full_text.append(segment.text)

            return {
                "filename": filename,
                "transcription": " ".join(full_text),
                "language": info.language,
                "segments": segments_list
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
    
    def transcribe_with_speakers(self, file_content: bytes, filename: str, hf_token: str = None) -> Dict[str, Any]:
        """
        Transcribe file with speaker diarization using Whisper + pyannote.
        
        Args:
            file_content: Binary content of audio/video file
            filename: Original filename
            hf_token: HuggingFace token for pyannote models
            
        Returns:
            Transcription result dict with speaker information
        """
        from .SpeakerDiarization import SpeakerDiarizationService
        
        # First get regular transcription
        transcription_result = self.transcribe_file(file_content, filename)
        
        # Then get speaker diarization
        diarization_service = SpeakerDiarizationService(hf_token=hf_token)
        speaker_segments = diarization_service.process_audio(file_content, filename)
        
        # Combine results - match each transcription segment with speakers
        for segment in transcription_result["segments"]:
            start_time = segment["start"]
            end_time = segment["end"]
            
            # Find overlapping speaker segments
            speakers = []
            for spk in speaker_segments:
                if spk["start"] < end_time and spk["end"] > start_time:
                    speakers.append(spk["speaker"])
            
            # Use most frequent speaker if multiple
            if speakers:
                segment["speaker"] = max(set(speakers), key=speakers.count)
            else:
                segment["speaker"] = "UNKNOWN"
        
        return transcription_result