"""
Test audio compression speed and effectiveness.
"""

import time
from transcription.audio_utils import compress_audio, get_audio_info


def test_compression():
    """Test compression on the sample audio file."""
    audio_path = "/Users/joshchenoweth/Documents/GitHub/CMPT475-Group2-Meeting-Summarizer/server/10 Second Pep Talk.mp3"

    print("=" * 60)
    print("Audio Compression Test")
    print("=" * 60)

    # Read the file
    with open(audio_path, "rb") as f:
        audio_bytes = f.read()

    # Get original info
    print("\n📊 Original Audio:")
    original_info = get_audio_info(audio_bytes, "test.mp3")
    for key, value in original_info.items():
        print(f"  {key}: {value}")

    # Test compression with different targets
    targets = [20, 10, 5]  # MB

    for target_mb in targets:
        print(f"\n🔄 Compressing to target {target_mb}MB...")

        start_time = time.time()
        compressed = compress_audio(audio_bytes, "test.mp3", target_size_mb=target_mb)
        elapsed = time.time() - start_time

        compressed_size_mb = len(compressed) / (1024 * 1024)
        original_size_mb = len(audio_bytes) / (1024 * 1024)
        reduction_pct = (1 - compressed_size_mb / original_size_mb) * 100

        print(f"  ⏱️  Time: {elapsed:.2f} seconds")
        print(f"  📦 Size: {original_size_mb:.2f}MB → {compressed_size_mb:.2f}MB")
        print(f"  📉 Reduction: {reduction_pct:.1f}%")


if __name__ == "__main__":
    test_compression()
