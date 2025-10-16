# Meeting Summarizer API

A simple FastAPI-based backend service for meeting summarization.

## Features

- **Simple API**: Basic FastAPI setup with health check
- **RESTful API**: Clean, well-documented API endpoints
- **Easy Setup**: Minimal dependencies and configuration

## Setup Instructions

### Prerequisites

- Python 3.12 (recommended) or Python 3.8+
- pip (Python package installer)
- Ollama (for summarization)

### Installation

1. **Navigate to the server directory:**
   ```bash
   cd CMPT475-Group2-Meeting-Summarizer/server
   ```

2. **Create a virtual environment (recommended):**
   ```bash
   python3.12 -m venv venv  # Use Python 3.12 specifically
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

### Running the Application

1. **Activate the virtual environment and start the development server:**
   ```bash
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   python main.py
   ```
   
   Or using uvicorn directly:
   ```bash
   source venv/bin/activate
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Access the API:**
   - API Base URL: `http://localhost:8000`
   - Interactive API Documentation: `http://localhost:8000/docs`
   - Alternative API Documentation: `http://localhost:8000/redoc`

## API Endpoints

### Available Endpoints

- `GET /` - Root endpoint with welcome message
- `GET /health` - Health check endpoint
- `POST /transcribe` - Upload and transcribe audio/video files
- `GET /ollama/status` - Check if Ollama is running and accessible
- `POST /summarize` - Generate AI summary from transcription text

### Example Usage

#### Check API Status

```bash
curl -X GET "http://localhost:8000/"
```

#### Health Check

```bash
curl -X GET "http://localhost:8000/health"
```

#### Transcribe Audio/Video

```bash
curl -X POST "http://localhost:8000/transcribe" \
  -H "Content-Type: multipart/form-data" \
  -F "audio_file=@path/to/your/audio.mp3"
```

**Supported file types:**
- Audio: MP3, WAV, MP4, M4A, FLAC
- Video: MP4, MPEG, QuickTime
- Generic: application/octet-stream

#### Check Ollama Status

```bash
curl -X GET "http://localhost:8000/ollama/status"
```

**Response:**
```json
{
  "status": "connected",
  "host": "http://localhost:11434",
  "available_models": ["llama3.2"]
}
```

#### Summarize Transcription

```bash
curl -X POST "http://localhost:8000/summarize" \
  -H "Content-Type: application/json" \
  -d '{"transcription_text": "Meeting about project updates. John will complete design by Friday. Sarah will review code."}'
```

**Response:**
```json
{
  "success": true,
  "summary": "**Meeting Summary**\n\nA brief summary of the meeting...",
  "model_used": "llama3.2",
  "transcription_length": 125
}
```

## Project Structure

```
server/
├── main.py                    # Main FastAPI application
├── requirements.txt           # Python dependencies
├── TRANSCRIPTION_SETUP.md     # Transcription setup guide
├── README.md                  # This file
├── .env                       # Environment variables
├── auth/                      # Authentication modules
├── transcription/             # Transcription-related modules
│   └── Transcription.py       # Whisper transcription service
├── summarization/             # Summarization modules
│   ├── __init__.py            # Package initialization
│   └── Summarization_Service.py  # Ollama summarization service
└── venv/                      # Virtual environment (created during setup)
```

## Troubleshooting

### NumPy Compatibility Issues

If you encounter errors like "Transcription failed: Numpy is not available" or NumPy compatibility warnings, this is due to PyTorch/Whisper requiring NumPy 1.x instead of NumPy 2.x.

**Solution:**
```bash
# Activate your virtual environment first
source venv/bin/activate

# Downgrade NumPy to a compatible version
pip install "numpy<2"
```

This will install NumPy 1.26.4 which is compatible with the current PyTorch and Whisper versions.

### Python Version Issues

If you have multiple Python versions installed, make sure to use Python 3.12 specifically:
```bash
python3.12 -m venv venv
```

## Ollama Setup

The summarization feature uses Ollama to run AI models locally on your machine.

### Installing Ollama

**Windows:**
1. Download from [ollama.com/download](https://ollama.com/download)
2. Run the installer
3. Ollama starts automatically

**Mac:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Download the AI Model

After installing Ollama, pull the model:

```bash
ollama pull llama3.2
```

This downloads the Llama 3.2 model (~2GB).

### Verify Installation

```bash
ollama list
```

You should see `llama3.2` in the list.

### Configuration

Add these to your `server/.env` file:

```env
# Ollama Configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

### Testing

1. Start Ollama (usually auto-starts): `ollama serve`
2. Start the FastAPI server: `python main.py`
3. Test at `http://localhost:8000/docs`

### Troubleshooting Ollama

**"Could not connect to Ollama"**
- Ensure Ollama is running: `ollama serve`
- Verify: `curl http://localhost:11434/api/tags`

**"Model not found"**
- Pull the model: `ollama pull llama3.2`

**Summarization is slow**
- Try smaller model: `ollama pull llama3.2:1b`
- Update `.env`: `OLLAMA_MODEL=llama3.2:1b`

## Development

### Adding New Endpoints

1. Add endpoint functions in `main.py`
2. Update this README with new endpoint documentation

### Environment Variables

Create a `.env` file in the server directory for environment-specific configurations:

```env
# API configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True

# Ollama Configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

## Next Steps

- [x] Add meeting summarization endpoints
- [x] Implement AI-powered summarization logic (using Ollama)
- [ ] Add database integration for persistent storage
- [x] Add file upload support for meeting transcripts
- [ ] Implement authentication and authorization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test your changes
5. Submit a pull request

## License

This project is part of CMPT 475 Group 2 coursework.
