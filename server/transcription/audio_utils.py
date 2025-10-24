"""
Audio compression utilities for handling large audio files.
"""

import io
import tempfile
import os
from pathlib import Path
from pydub import AudioSegment


def compress_audio(audio_bytes: bytes, filename: str, target_size_mb: float = 20) -> bytes:
    """
    Compress audio file to reduce size while maintaining quality.

    Args:
        audio_bytes: The original audio file as bytes
        filename: The filename (used to determine format)
        target_size_mb: Target size in megabytes (default: 20MB to stay under Groq's 25MB limit)

    Returns:
        bytes: Compressed audio file as bytes
    """
    # Create temporary file for input
    suffix = Path(filename).suffix
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_in:
        temp_in.write(audio_bytes)
        temp_in_path = temp_in.name

    try:
        # Load audio file
        audio = AudioSegment.from_file(temp_in_path)

        # Calculate current size
        current_size_mb = len(audio_bytes) / (1024 * 1024)

        # If already under target size, return original
        if current_size_mb <= target_size_mb:
            return audio_bytes

        # Calculate compression ratio needed
        compression_ratio = target_size_mb / current_size_mb

        # Reduce bitrate based on compression needed
        # Start with a reasonable bitrate and adjust
        if compression_ratio > 0.5:
            # Mild compression - use 64kbps
            bitrate = "64k"
        elif compression_ratio > 0.3:
            # Medium compression - use 48kbps
            bitrate = "48k"
        else:
            # Heavy compression - use 32kbps
            bitrate = "32k"

        # Convert to mono if stereo (reduces size by ~50%)
        if audio.channels > 1:
            audio = audio.set_channels(1)

        # Optionally reduce sample rate
        if audio.frame_rate > 16000:
            audio = audio.set_frame_rate(16000)

        # Export compressed audio
        output_buffer = io.BytesIO()
        audio.export(
            output_buffer,
            format="mp3",
            bitrate=bitrate,
            parameters=["-ac", "1"]  # Force mono
        )

        compressed_bytes = output_buffer.getvalue()
        compressed_size_mb = len(compressed_bytes) / (1024 * 1024)

        print(f"Audio compressed: {current_size_mb:.1f}MB -> {compressed_size_mb:.1f}MB (bitrate: {bitrate})")

        return compressed_bytes

    finally:
        # Clean up temporary file
        if os.path.exists(temp_in_path):
            os.unlink(temp_in_path)


def get_audio_info(audio_bytes: bytes, filename: str) -> dict:
    """
    Get information about an audio file.

    Args:
        audio_bytes: The audio file as bytes
        filename: The filename

    Returns:
        dict: Audio information including duration, channels, sample rate, etc.
    """
    suffix = Path(filename).suffix
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_file.write(audio_bytes)
        temp_file_path = temp_file.name

    try:
        audio = AudioSegment.from_file(temp_file_path)

        return {
            "duration_seconds": len(audio) / 1000,
            "channels": audio.channels,
            "sample_rate": audio.frame_rate,
            "size_mb": len(audio_bytes) / (1024 * 1024),
            "format": suffix
        }

    finally:
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
