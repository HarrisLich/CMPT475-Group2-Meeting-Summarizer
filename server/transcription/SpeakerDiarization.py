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
        Process audio file with speaker diarization using pyannote.audio.

        Uses preloaded waveform method to bypass torchcodec issues.
        This is the recommended fallback when torchcodec is not properly installed.
        """
        from pydub import AudioSegment
        import soundfile as sf

        # Create temporary file with original format
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix) as temp_file:
            temp_file.write(file_content)
            temp_file_path = temp_file.name

        # Pre-process audio to standardized WAV format
        wav_file_path = None
        try:
            # Convert to WAV format with standard sample rate (16kHz is optimal for speech)
            # Normalize to mono channel for consistent processing
            audio = AudioSegment.from_file(temp_file_path)
            audio = audio.set_channels(1).set_frame_rate(16000)

            # Create standardized WAV file
            wav_file_path = tempfile.NamedTemporaryFile(delete=False, suffix='.wav').name
            audio.export(wav_file_path, format="wav")

            # Load audio as waveform using soundfile
            waveform_numpy, sample_rate = sf.read(wav_file_path)

            # Convert numpy array to torch tensor
            waveform_numpy = waveform_numpy.astype('float32')
            if waveform_numpy.ndim == 1:
                # Mono audio: add channel dimension
                waveform = torch.from_numpy(waveform_numpy).unsqueeze(0)
            else:
                # Stereo/multi-channel: transpose to (channels, samples)
                waveform = torch.from_numpy(waveform_numpy).T
            waveform = waveform.float()

            # Load pipeline and process with preloaded waveform
            # This bypasses torchcodec/AudioDecoder completely
            pipeline = self._load_pipeline()
            print("Processing audio with preloaded waveform method (torchcodec bypass)")
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

            print(f"✅ Speaker diarization complete: found {len(set(s['speaker'] for s in result))} speakers")
            return result

        finally:
            # Clean up temporary files
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
            if wav_file_path and os.path.exists(wav_file_path):
                os.unlink(wav_file_path)