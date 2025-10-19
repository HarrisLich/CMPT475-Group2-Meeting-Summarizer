from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from transcription.Transcription import TranscriptionService
from auth import auth_router, get_current_user
from database.middleware import get_db_with_auth
from database.supabase_service import get_supabase

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

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

# Test endpoint for Supabase integration
@app.get("/test/summaries")
async def test_summaries(db = Depends(get_db_with_auth)):
    try:
        result = db.table("ai_generate_cleaned_summaries").select("*").execute()
        return {"success": True, "count": len(result.data), "data": result.data}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/test/public")
async def test_public():
    try:
        supabase = get_supabase()
        # Try a very basic operation first
        return {"message": "Supabase client initialized", "url": supabase.url}
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        return {"success": False, "error": str(e), "trace": error_trace}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
