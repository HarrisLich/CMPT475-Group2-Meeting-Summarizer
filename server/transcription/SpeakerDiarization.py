from pyannote.audio import Pipeline
import torch
import tempfile
import os
from pathlib import Path
import warnings
warnings.filterwarnings("ignore", message="torchcodec is not installed correctly")

class SpeakerDiarizationService:
    def __init__(self, hf_token=None):
        self.hf_token = hf_token
        self._pipeline = None

    def _load_pipeline(self):
        if self._pipeline is None:
            if not self.hf_token:
                raise ValueError("HuggingFace token is required for speaker diarization")
            
            self._pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization@2.1",
                token=self.hf_token,
                
            )
        return self._pipeline

    def process_audio(self, file_content, filename):
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix) as temp_file:
            temp_file.write(file_content)
            temp_file_path = temp_file.name
        
        try:
            pipeline = self._load_pipeline()
            diarization = pipeline(temp_file_path)
            
            # Convert to usable format
            result = []
            for turn, _, speaker in diarization.itertracks(yield_label=True):
                result.append({
                    "start": turn.start, 
                    "end": turn.end,
                    "speaker": speaker
                })
                
            return result
        
        finally:
            # Clean up
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)