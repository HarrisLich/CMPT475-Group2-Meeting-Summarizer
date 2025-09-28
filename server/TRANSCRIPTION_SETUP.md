# Audio Transcription Setup Guide

This guide documents the complete setup process for implementing OpenAI Whisper transcription in our FastAPI server.

## Prerequisites

- Python 3.12+ with virtual environment
- Homebrew (for macOS dependencies)
- FastAPI project structure

## Installation Steps

### 1. Install Dependencies

```bash
# Activate virtual environment
source venv/bin/activate

# Install Python packages
pip install fastapi uvicorn openai-whisper python-multipart

# Install ffmpeg (required by Whisper)
brew install ffmpeg
```

### 2. SSL Certificate Fix

Due to SSL certificate verification issues, we needed to bypass SSL verification for Whisper model downloads by adding this to our code:

```python
import ssl
ssl._create_default_https_context = ssl._create_unverified_context
```

### 3. File Structure

Created a modular structure:

- `main.py` - FastAPI server with endpoints
- `Transcription.py` - Transcription service class with Whisper functionality

### 4. File Type Handling

Added support for `application/octet-stream` content type since some MP3 files are detected as this instead of `audio/mp3`.

## Usage

### Start the Server

```bash
cd server
source venv/bin/activate
python main.py
```

### Test Transcription

```bash
curl -X POST "http://localhost:8000/transcribe" \
     -H "Content-Type: multipart/form-data" \
     -F "audio_file=@\"your_audio_file.mp3\""
```

### Alternative: Web Interface

1. Go to `http://localhost:8000/docs`
2. Click on `/transcribe` endpoint
3. Click "Try it out"
4. Upload your audio file
5. Click "Execute"

## API Response Format

```json
{
  "filename": "your_audio_file.mp3",
  "transcription": "Transcribed text content...",
  "language": "en",
  "segments": [
    {
      "start": 0.0,
      "end": 5.2,
      "text": "First segment of speech..."
    }
  ]
}
```

## Supported Audio Formats

- MP3 (audio/mpeg, audio/mp3)
- WAV (audio/wav)
- MP4 (audio/mp4)
- M4A (audio/m4a)
- FLAC (audio/flac)
- Generic files (application/octet-stream)

## Troubleshooting

### Common Issues

1. **"Module not found" errors**: Ensure virtual environment is activated
2. **SSL certificate errors**: SSL bypass is implemented in `Transcription.py`
3. **ffmpeg errors**: Install ffmpeg via Homebrew
4. **File type errors**: Check that `application/octet-stream` is in allowed types
5. **Port already in use**: Kill existing process with `lsof -ti:8000 | xargs kill -9`

### File Path Issues with Spaces

For files with spaces in names, use proper escaping:

```bash
# Correct
curl -F "audio_file=@\"10 Second Pep Talk.mp3\""

# Or escape spaces
curl -F "audio_file=@10\ Second\ Pep\ Talk.mp3"
```

## Architecture Benefits

- **Modular Design**: Transcription logic separated from API logic
- **Lazy Loading**: Whisper model loads only when first transcription is requested
- **Error Handling**: Comprehensive error handling for file operations
- **Clean API**: Simple, focused FastAPI endpoints

## Performance Notes

- First transcription request takes longer (downloads Whisper model)
- Subsequent requests are faster (model cached in memory)
- Model size "base" provides good balance of speed vs. accuracy
- Consider "small" for faster processing or "large" for better accuracy