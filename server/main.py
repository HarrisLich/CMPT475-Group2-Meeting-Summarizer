from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from transcription.Transcription import TranscriptionService
from transcription.Groq_Transcription import HybridTranscriptionService
from transcription.audio_utils import compress_audio
from auth.routes import router as auth_router
from auth.supabase_dependencies import get_current_user
from database.supabase_service import get_supabase
from auth import auth_router, get_current_user
from summarization import SummarizationService
from pydantic import BaseModel
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class SummarizeRequest(BaseModel):
    """
    Request model for summarization endpoint.
    Defines the expected structure of the request body.

    """
    transcription_text: str

class ChatRequest(BaseModel):
    """
    Request model for chat endpoint.
    Allows conversational interaction about a meeting.
    """
    meeting_context: str
    user_question: str

class ActionItemsRequest(BaseModel):
    """
    Request model for action items extraction endpoint.
    Extracts structured action items from a meeting transcription.
    """
    transcription_text: str

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

# Initialize transcription service (HYBRID: Groq + Local Whisper)
# Uses Groq's fast Whisper API when possible, falls back to local Whisper
whisper_model = os.getenv("WHISPER_MODEL", "tiny")
transcription_service = HybridTranscriptionService(
    whisper_model=whisper_model,
    groq_model="whisper-large-v3"
)

# Initialize summarization service (LOCAL ONLY - Ollama)
# ALL summarization, chat, and action items run locally - unlimited and free!
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

        # Check file size and compress if needed (Groq has a 25MB limit)
        file_size_mb = len(content) / (1024 * 1024)

        # Hard limit check - if file is extremely large, reject immediately
        MAX_UPLOADABLE_SIZE_MB = 500  # Conservative limit for compression
        if file_size_mb > MAX_UPLOADABLE_SIZE_MB:
            raise HTTPException(
                status_code=413,
                detail={
                    "error": "file_too_large",
                    "message": f"Your file is too large to process ({file_size_mb:.1f}MB).",
                    "suggestion": "Please split your recording into segments smaller than 500MB or reduce the recording quality before uploading.",
                    "max_size_mb": MAX_UPLOADABLE_SIZE_MB,
                    "uploaded_size_mb": round(file_size_mb, 1)
                }
            )

        # If file is over 25MB, attempt compression
        if file_size_mb > 25:
            print(f"File too large ({file_size_mb:.1f}MB), attempting compression...")
            try:
                # Try to compress the audio
                content = compress_audio(content, audio_file.filename, target_size_mb=20)
                compressed_size_mb = len(content) / (1024 * 1024)
                print(f"Compressed to {compressed_size_mb:.1f}MB")

                # If still too large after compression, reject with helpful message
                if compressed_size_mb > 25:
                    raise HTTPException(
                        status_code=413,
                        detail={
                            "error": "file_too_large_after_compression",
                            "message": f"Your file is too large to process ({file_size_mb:.1f}MB). Even after compression, it's still {compressed_size_mb:.1f}MB.",
                            "suggestion": "Please split your recording into smaller segments (aim for under 150MB each) or use a lower bitrate when recording.",
                            "original_size_mb": round(file_size_mb, 1),
                            "compressed_size_mb": round(compressed_size_mb, 1),
                            "max_size_mb": 25
                        }
                    )
            except HTTPException:
                # Re-raise HTTPException as-is
                raise
            except Exception as compress_error:
                # Compression failed for some other reason
                print(f"Compression failed: {str(compress_error)}")
                raise HTTPException(
                    status_code=413,
                    detail={
                        "error": "compression_failed",
                        "message": f"Your file is too large ({file_size_mb:.1f}MB) and automatic compression failed.",
                        "suggestion": "Please compress your audio file manually before uploading, or split it into smaller segments.",
                        "uploaded_size_mb": round(file_size_mb, 1),
                        "max_size_mb": 25,
                        "technical_error": str(compress_error)
                    }
                )

        # Transcribe using the service
        result = transcription_service.transcribe_file(content, audio_file.filename)

        # Check if transcription failed
        if result.get("error"):
            error_type = result.get("error_type", "api_error")
            error_message = result.get("error")

            # Return 429 for rate limit errors
            if error_type == "rate_limit":
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "rate_limit_exceeded",
                        "message": error_message,
                        "retry_after": "60 seconds"
                    }
                )
            else:
                raise HTTPException(
                    status_code=500,
                    detail={
                        "error": "transcription_failed",
                        "message": error_message
                    }
                )

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

            # Check if summarization failed due to rate limiting
            if not summary_result.get("success"):
                error_type = summary_result.get("error_type", "api_error")
                if error_type == "rate_limit":
                    # Still return the transcription but with rate limit warning
                    result["summary"] = {
                        "success": False,
                        "error": summary_result.get("error"),
                        "error_type": "rate_limit",
                        "warning": "Transcription succeeded but summarization was rate limited"
                    }
                else:
                    result["summary"] = summary_result
            else:
                result["summary"] = summary_result
        else:
            result["summary"] = {
                "success": False,
                "error": "No transcription text available for summarization"
            }

        return result

    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"ERROR in /transcribe endpoint: {str(e)}")
        print(f"Full traceback:\n{error_trace}")
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



@app.get("/ollama/status")
async def ollama_status():
    """
    Endpoint to check if LOCAL Ollama is running and accessible.

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
            error_type = result.get("error_type", "api_error")

            # Return 429 for rate limit errors
            if error_type == "rate_limit":
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "rate_limit_exceeded",
                        "message": result.get("error", "Summarization rate limit exceeded."),
                        "retry_after": "60 seconds"
                    }
                )
            else:
                raise HTTPException(
                    status_code=503,
                    detail=result.get("error", "Summarization failed.")
                )
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")

@app.post("/chat")
async def chat_about_meeting(request: ChatRequest):
    """
    Have a conversational interaction about a meeting.
    Allows users to ask questions, get greetings, and discuss specific topics.
    """
    if not request.user_question or len(request.user_question.strip()) == 0:
        raise HTTPException(status_code=400,
                            detail="user_question cannot be empty.")
    try:
        # Call the chat method from summarization service
        result = summarization_service.chat_about_meeting(
            request.meeting_context,
            request.user_question
        )

        # Check if chat was successful
        if not result.get("success"):
            error_type = result.get("error_type", "api_error")

            # Return 429 for rate limit errors
            if error_type == "rate_limit":
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "rate_limit_exceeded",
                        "message": result.get("error", "Chat rate limit exceeded."),
                        "retry_after": "60 seconds"
                    }
                )
            else:
                raise HTTPException(
                    status_code=503,
                    detail=result.get("error", "Chat failed.")
                )
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")

@app.post("/extract-action-items")
async def extract_action_items(request: ActionItemsRequest):
    """
    Extract structured action items from a meeting transcription.
    Uses AI to identify tasks, priorities, and assignments.
    """
    if not request.transcription_text or len(request.transcription_text.strip()) == 0:
        raise HTTPException(status_code=400,
                            detail="transcription_text cannot be empty.")
    try:
        # Call the action items extraction method from summarization service
        result = summarization_service.extract_action_items(request.transcription_text)

        # Check if extraction was successful
        if not result.get("success"):
            error_type = result.get("error_type", "api_error")

            # Return 429 for rate limit errors
            if error_type == "rate_limit":
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "rate_limit_exceeded",
                        "message": result.get("error", "Action items extraction rate limit exceeded."),
                        "retry_after": "60 seconds"
                    }
                )
            else:
                raise HTTPException(
                    status_code=503,
                    detail=result.get("error", "Action item extraction failed.")
                )
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Action item extraction failed: {str(e)}")

@app.post("/transcribe-with-speakers")
async def transcribe_with_speakers(
    audio_file: UploadFile = File(...)
):
    if not transcription_service.is_supported_file_type(audio_file.content_type):
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {audio_file.content_type}")

    try:
        # Get HuggingFace token from environment
        hf_token = os.getenv("HUGGINGFACE_TOKEN")
        if not hf_token:
            raise HTTPException(
                status_code=500, 
                detail="HuggingFace token not configured. Please set HUGGINGFACE_TOKEN environment variable."
            )

        # Read file content
        content = await audio_file.read()

        # Transcribe with speaker diarization
        result = transcription_service.transcribe_with_speakers(content, audio_file.filename, hf_token)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
