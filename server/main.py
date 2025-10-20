from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from transcription.Transcription import TranscriptionService
from auth.routes import router as auth_router
from auth.supabase_dependencies import get_current_user
from database.supabase_service import get_supabase

# Create FastAPI instance
app = FastAPI(
    title="Meeting Summarizer API",
    description="Simple API for meeting summarization",
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

@app.get("/test/public")
async def test_public():
    try:
        supabase = get_supabase()
        # Try a very basic operation first
        # Try a simple query - this will likely be blocked by RLS unless you've configured public access
        result = supabase.client.table("ai_generate_cleaned_summaries").select("*").execute()
        
        return {
            "success": True, 
            "count": len(result.data),
            "data": result.data

        }
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        return {"success": False, "error": str(e), "trace": error_trace}
@app.get("/test/tables")
async def test_tables():
    try:
        supabase = get_supabase()
        # First check if we can get the URL and key
        url = supabase.url
        key = supabase.key
        # Just try to list tables (simpler operation)
        response = supabase.client.table("ai_generate_cleaned_summaries").select("count").execute()
        return {
            "success": True,
            "url": url,
            "key_length": len(key) if key else 0,
            "response": response
        }
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        return {"success": False, "error": str(e), "trace": error_trace}

@app.get("/protected-route")
async def protected_route(current_user = Depends(get_current_user)):
    # This endpoint is now protected with Supabase auth
    return {"message": "This is protected", "user": current_user}


        
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
