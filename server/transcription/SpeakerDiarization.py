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
        Process audio file with speaker diarization using pyannote.audio's Audio class.
        
        Uses pyannote.audio's Audio class which uses torchcodec for audio decoding
        (the original intended method). Falls back to direct file path if needed.
        """
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix) as temp_file:
            temp_file.write(file_content)
            temp_file_path = temp_file.name
        
        try:
            pipeline = self._load_pipeline()
            
            # Try the original intended method: pass file path directly to pipeline
            # This uses torchcodec internally if available (the proper way)
            try:
                diarization = pipeline(temp_file_path)
            except (RuntimeError, ImportError, OSError) as e:
                # If torchcodec fails (common on macOS ARM), use preloaded waveform fallback
                # This is the official fallback method recommended by pyannote.audio
                error_msg = str(e)
                if "torchcodec" in error_msg.lower() or "AudioDecoder" in error_msg or "libtorchcodec" in error_msg:
                    print(f"torchcodec unavailable (known issue on macOS ARM), using preloaded waveform method")
                else:
                    print(f"Audio loading failed, using preloaded waveform fallback: {error_msg}")
                
                import soundfile as sf
                from pydub import AudioSegment
                
                try:
                    waveform_numpy, sample_rate = sf.read(temp_file_path)
                except Exception as sf_error:
                    # Convert to WAV using pydub if soundfile can't read the format
                    print(f"soundfile couldn't read {filename}, converting with pydub: {str(sf_error)}")
                    audio = AudioSegment.from_file(temp_file_path)
                    wav_buffer = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
                    audio.export(wav_buffer.name, format="wav")
                    waveform_numpy, sample_rate = sf.read(wav_buffer.name)
                    os.unlink(wav_buffer.name)
                
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
            # Clean up
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)