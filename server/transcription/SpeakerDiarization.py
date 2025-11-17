# Workaround for missing torchaudio.list_audio_backends() method
# This is needed because speechbrain (a dependency of pyannote.audio) calls this method
# during import, but some torchaudio installations don't have it
import torchaudio
if not hasattr(torchaudio, 'list_audio_backends'):
    def list_audio_backends():
        """Mock implementation for missing method - returns common audio backends"""
        return ['soundfile', 'sox']  # Common backends that pyannote.audio can use
    torchaudio.list_audio_backends = list_audio_backends

# Fix torchcodec library loading by setting rpath for PyTorch libraries
import torch
import os
from pathlib import Path

# Set library path so torchcodec can find PyTorch libraries (if needed)
torch_lib_path = os.path.join(os.path.dirname(torch.__file__), "lib")
# Note: DYLD_LIBRARY_PATH has limited effect on macOS due to SIP, but we set it anyway
if 'DYLD_FALLBACK_LIBRARY_PATH' in os.environ:
    os.environ['DYLD_FALLBACK_LIBRARY_PATH'] = torch_lib_path + ':' + os.environ['DYLD_FALLBACK_LIBRARY_PATH']
else:
    os.environ['DYLD_FALLBACK_LIBRARY_PATH'] = torch_lib_path

from pyannote.audio import Pipeline
import tempfile
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
                "pyannote/speaker-diarization-community-1",
                token=self.hf_token,
                
            )
        return self._pipeline

    def process_audio(self, file_content, filename):
        """
        Process audio file with speaker diarization using pyannote.audio with torchcodec.
        
        Pre-processes audio to standardized WAV format to ensure torchcodec can process it correctly.
        Falls back to preloaded waveform method if torchcodec encounters issues.
        """
        from pydub import AudioSegment
        
        # Create temporary file with original format
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix) as temp_file:
            temp_file.write(file_content)
            temp_file_path = temp_file.name
        
        # Pre-process audio to standardized WAV format for torchcodec
        # This ensures torchcodec gets a clean, consistent format to work with
        wav_file_path = None
        try:
            # Convert to WAV format with standard sample rate (16kHz is common for speech)
            # This helps torchcodec process the file without sample count mismatches
            audio = AudioSegment.from_file(temp_file_path)
            # Normalize to mono and 16kHz sample rate (optimal for speech diarization)
            audio = audio.set_channels(1).set_frame_rate(16000)
            
            # Create standardized WAV file for torchcodec
            wav_file_path = tempfile.NamedTemporaryFile(delete=False, suffix='.wav').name
            audio.export(wav_file_path, format="wav")
            
            pipeline = self._load_pipeline()
            
            # Try torchcodec with the standardized WAV file (the proper way)
            try:
                diarization = pipeline(wav_file_path)
                print("Successfully processed audio with torchcodec")
            except (RuntimeError, ImportError, OSError, ValueError) as e:
                # If torchcodec fails, use preloaded waveform fallback
                error_msg = str(e)
                if "torchcodec" in error_msg.lower() or "AudioDecoder" in error_msg or "libtorchcodec" in error_msg:
                    print(f"torchcodec unavailable, using preloaded waveform method")
                elif "samples" in error_msg.lower() and "expected" in error_msg.lower():
                    print(f"torchcodec sample count mismatch, using preloaded waveform method")
                else:
                    print(f"Audio processing failed, using preloaded waveform fallback: {error_msg}")
                
                import soundfile as sf
                
                # Load the standardized WAV file we created
                waveform_numpy, sample_rate = sf.read(wav_file_path)
                
                # Convert to torch tensor
                waveform_numpy = waveform_numpy.astype('float32')
                if waveform_numpy.ndim == 1:
                    waveform = torch.from_numpy(waveform_numpy).unsqueeze(0)
                else:
                    waveform = torch.from_numpy(waveform_numpy).T
                waveform = waveform.float()
                
                # Pass as dictionary to pipeline (official fallback method)
                diarization = pipeline({"waveform": waveform, "sample_rate": sample_rate})
            
            # Convert to usable format
            # In pyannote.audio 4.x, the output is a DiarizeOutput object
            result = []
            for turn, _, speaker in diarization.speaker_diarization.itertracks(yield_label=True):
                result.append({
                    "start": turn.start, 
                    "end": turn.end,
                    "speaker": speaker
                })
                
            return result
        
        finally:
            # Clean up temporary files
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
            if wav_file_path and os.path.exists(wav_file_path):
                os.unlink(wav_file_path)