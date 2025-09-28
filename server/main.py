from fastapi import FastAPI, UploadFile, File, HTTPException
import uvicorn
from Transcription import TranscriptionService

# Create FastAPI instance
app = FastAPI(
    title="Meeting Summarizer API",
    description="Simple API for meeting summarization",
    version="1.0.0"
)

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Meeting Summarizer API is running!"}

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "meeting-summarizer"}

# Initialize transcription service
transcription_service = TranscriptionService()

# Transcription endpoint
@app.post("/transcribe")
async def transcribe_audio(audio_file: UploadFile = File(...)):
    # Validate file type
    if not transcription_service.is_supported_file_type(audio_file.content_type):
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {audio_file.content_type}")

    try:
        # Read file content
        content = await audio_file.read()

        # Transcribe using the service
        result = transcription_service.transcribe_file(content, audio_file.filename)

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
