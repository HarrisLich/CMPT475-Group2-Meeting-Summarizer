from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from transcription.Transcription import TranscriptionService
from auth import auth_router, get_current_user
from summarization import SummarizationService
from pydantic import BaseModel

class SummarizeRequest(BaseModel):
    """
    Request model for summarization endpoint.
    Defines the expected structure of the request body.

    """
    transcription_text: str

# Create FastAPI instance
app = FastAPI(
    title="Meeting Summarizer API",
    description="Simple API for meeting summarization with Auth0 authentication",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js development server
        "http://127.0.0.1:3000",
        "https://localhost:3000",
        "https://127.0.0.1:3000",
        # Add your production frontend URL here when deployed
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include authentication routes
app.include_router(auth_router)

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

# Initialize summarization service
summarization_service = SummarizationService()

# Transcription endpoint (authentication disabled for testing)
@app.post("/transcribe")
async def transcribe_audio(
    audio_file: UploadFile = File(...)
):
    # Validate file type
    if not transcription_service.is_supported_file_type(audio_file.content_type):
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {audio_file.content_type}")

    try:
        # Read file content
        content = await audio_file.read()

        # Transcribe using the service
        result = transcription_service.transcribe_file(content, audio_file.filename)

        # User info disabled for testing
        result["user"] = {
            "id": "test_user",
            "email": "test@example.com",
            "name": "Test User"
        }

        # Generate summary from transcription
        transcription_text = result.get("transcription", "")
        if transcription_text and len(transcription_text.strip()) > 0:
            summary_result = summarization_service.summarize_transcription(transcription_text)
            result["summary"] = summary_result
        else:
            result["summary"] = {
                "success": False,
                "error": "No transcription text available for summarization"
            }

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@app.get("/ollama/status")
async def ollama_status():
    """
    Endpoint to check if Ollama is running and accessible.

    Returns:
        Dict[str, Any]: Status information from the SummarizationService.
    """
    return summarization_service.check_ollama_status()

@app.post("/summarize")
async def summarize_transcription(request: SummarizeRequest):
    if not request.transcription_text or len(request.transcription_text.strip()) == 0:
        raise HTTPException(status_code=400, 
                            detail="transcription_text cannot be empty.")
    try:
        # Call if summarization service was successful
        result = summarization_service.summarize_transcription(request.transcription_text)

        #check if summarization was successful
        if not result.get("success"):
            raise HTTPException(
                status_code=503,
                detail=result.get("error", "Summarization failed.")
            )
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
