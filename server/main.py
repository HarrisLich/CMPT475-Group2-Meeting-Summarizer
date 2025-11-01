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
    user_id: str = None

class ChatRequest(BaseModel):
    """
    Request model for chat endpoint.
    Allows conversational interaction about a meeting.
    """
    meeting_context: str
    user_question: str
    conversation_id: str = None
    user_id: str = None

class ActionItemsRequest(BaseModel):
    """
    Request model for action items extraction endpoint.
    Extracts structured action items from a meeting transcription.
    """
    transcription_text: str

class ConversationCreate(BaseModel):
    """Request model for creating a new conversation"""
    meeting_id: str
    title: str
    model_version: str = "llama3.2:3b"

class MessageCreate(BaseModel):
    """Request model for saving a message to a conversation"""
    conversation_id: str
    role: str  # 'user' or 'assistant'
    content: str
    token_count: int = None

class SummaryCreate(BaseModel):
    """Request model for saving a meeting summary"""
    meeting_id: str
    summary_text: str
    key_points: list = None

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
    audio_file: UploadFile = File(...),
    user_id: str = Form(None)
):
    # Log user_id if provided
    if user_id:
        print(f"[TRANSCRIBE] User ID received: {user_id}")
    else:
        print("[TRANSCRIBE] No user_id provided")

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

        # Save to database if user_id is provided
        meeting_id = None
        conversation_id = None
        transcription_id = None

        if user_id:
            try:
                supabase = get_supabase()

                # Step 1: Save meeting to database
                print(f"[DB] Saving meeting for user {user_id}")
                meeting_result = supabase.save_meeting(
                    user_id=user_id,
                    title=audio_file.filename
                )
                meeting_id = meeting_result.data[0]['id']
                print(f"[DB] Meeting saved with ID: {meeting_id}")
                result["meeting_id"] = meeting_id

                # Step 1.5: Create conversation for this meeting
                print(f"[DB] Creating conversation for meeting {meeting_id}")
                conversation_result = supabase.create_conversation(
                    user_id=user_id,
                    meeting_id=meeting_id,
                    title=audio_file.filename.replace('.mp3', '').replace('.wav', '').replace('.m4a', ''),
                    model_version="llama3.2:3b"
                )
                conversation_id = conversation_result.data[0]['id']
                print(f"[DB] Conversation created with ID: {conversation_id}")
                result["conversation_id"] = conversation_id

            except Exception as db_error:
                print(f"[DB ERROR] Failed to save meeting/conversation: {str(db_error)}")
                # Don't fail the request, just log the error
                result["db_warning"] = f"Meeting data could not be saved: {str(db_error)}"

        # Generate summary from transcription
        transcription_text = result.get("transcription", "")
        if transcription_text and len(transcription_text.strip()) > 0:
            # Save transcription to database if we have a meeting_id
            if meeting_id and user_id:
                try:
                    print(f"[DB] Saving transcription for meeting {meeting_id}")
                    transcription_result = supabase.save_transcription(
                        meeting_id=meeting_id,
                        transcription_text=transcription_text,
                        audio_url=None  # We can add audio URL storage later if needed
                    )
                    transcription_id = transcription_result.data[0]['id']
                    print(f"[DB] Transcription saved with ID: {transcription_id}")
                    result["transcription_id"] = transcription_id
                except Exception as db_error:
                    print(f"[DB ERROR] Failed to save transcription: {str(db_error)}")

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

                # Step 3: Save summary to database if we have a meeting_id
                if meeting_id and user_id and summary_result.get("success"):
                    try:
                        print(f"[DB] Saving summary for meeting {meeting_id}")
                        summary_text = summary_result.get("summary", "")
                        # Save summary to database
                        summary_db_result = supabase.save_summary(
                            meeting_id=meeting_id,
                            summary_text=summary_text,
                            key_points=None  # We can parse key points from summary later if needed
                        )
                        summary_id = summary_db_result.data[0]['id']
                        print(f"[DB] Summary saved with ID: {summary_id}")
                        result["summary_id"] = summary_id

                        # Step 4: Save the summary as an initial assistant message in the conversation
                        if conversation_id:
                            try:
                                print(f"[DB] Saving initial summary message to conversation {conversation_id}")
                                message_result = supabase.save_message(
                                    conversation_id=conversation_id,
                                    role="assistant",
                                    content=summary_text,
                                    token_count=None
                                )
                                print(f"[DB] Initial message saved with ID: {message_result.data[0]['id']}")
                            except Exception as msg_error:
                                print(f"[DB ERROR] Failed to save initial message: {str(msg_error)}")

                    except Exception as db_error:
                        print(f"[DB ERROR] Failed to save summary: {str(db_error)}")
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
    # Log user_id if provided
    if request.user_id:
        print(f"[SUMMARIZE] User ID received: {request.user_id}")
    else:
        print("[SUMMARIZE] No user_id provided")

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
        print(f"[CHAT] Received chat request with conversation_id: {request.conversation_id}, user_id: {request.user_id}")

        # Save user message to database if conversation_id is provided
        if request.conversation_id:
            try:
                supabase = get_supabase()
                user_message_result = supabase.save_message(
                    conversation_id=request.conversation_id,
                    role="user",
                    content=request.user_question,
                    token_count=None
                )
                print(f"[CHAT] User message saved to conversation {request.conversation_id}: {user_message_result.data}")
            except Exception as db_error:
                print(f"[CHAT] Warning: Failed to save user message to database: {str(db_error)}")
                # Continue with chat even if database save fails
        else:
            print("[CHAT] No conversation_id provided, skipping user message save")

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

        # Save assistant message to database if conversation_id is provided
        if request.conversation_id and result.get("response"):
            try:
                supabase = get_supabase()
                assistant_message_result = supabase.save_message(
                    conversation_id=request.conversation_id,
                    role="assistant",
                    content=result.get("response"),
                    token_count=None
                )
                print(f"[CHAT] Assistant message saved to conversation {request.conversation_id}: {assistant_message_result.data}")
            except Exception as db_error:
                print(f"[CHAT] Warning: Failed to save assistant message to database: {str(db_error)}")
                # Continue and return result even if database save fails

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

# Conversation/Chat History Endpoints
@app.post("/conversations")
async def create_conversation(
    request: ConversationCreate,
    current_user = Depends(get_current_user)
):
    """Create a new conversation for chat history"""
    try:
        supabase = get_supabase()
        result = supabase.create_conversation(
            user_id=current_user["id"],
            meeting_id=request.meeting_id,
            title=request.title,
            model_version=request.model_version
        )
        return {"success": True, "conversation": result.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create conversation: {str(e)}")

@app.get("/conversations")
async def get_user_conversations(current_user = Depends(get_current_user)):
    """Get all conversations for the authenticated user"""
    try:
        supabase = get_supabase()
        result = supabase.get_user_conversations(current_user["id"])
        return {"success": True, "conversations": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch conversations: {str(e)}")

@app.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    current_user = Depends(get_current_user)
):
    """Get a specific conversation by ID"""
    try:
        supabase = get_supabase()
        result = supabase.get_conversation_by_id(conversation_id)
        if not result.data:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return {"success": True, "conversation": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch conversation: {str(e)}")

@app.put("/conversations/{conversation_id}/title")
async def update_conversation_title(
    conversation_id: str,
    title: str,
    current_user = Depends(get_current_user)
):
    """Update the title of a conversation"""
    try:
        supabase = get_supabase()
        result = supabase.update_conversation_title(conversation_id, title)
        return {"success": True, "conversation": result.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update conversation title: {str(e)}")

@app.put("/conversations/{conversation_id}/archive")
async def archive_conversation(
    conversation_id: str,
    archived: bool = True,
    current_user = Depends(get_current_user)
):
    """Archive or unarchive a conversation"""
    try:
        supabase = get_supabase()
        result = supabase.archive_conversation(conversation_id, archived)
        return {"success": True, "conversation": result.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to archive conversation: {str(e)}")

@app.post("/messages")
async def save_message(
    request: MessageCreate,
    current_user = Depends(get_current_user)
):
    """Save a message to a conversation"""
    try:
        supabase = get_supabase()
        result = supabase.save_message(
            conversation_id=request.conversation_id,
            role=request.role,
            content=request.content,
            token_count=request.token_count
        )
        return {"success": True, "message": result.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save message: {str(e)}")

@app.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: str,
    current_user = Depends(get_current_user)
):
    """Get all messages for a conversation"""
    try:
        supabase = get_supabase()
        result = supabase.get_conversation_messages(conversation_id)
        return {"success": True, "messages": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch messages: {str(e)}")

@app.post("/summaries")
async def save_summary(
    request: SummaryCreate,
    current_user = Depends(get_current_user)
):
    """Save a meeting summary"""
    try:
        supabase = get_supabase()
        result = supabase.save_summary(
            meeting_id=request.meeting_id,
            summary_text=request.summary_text,
            key_points=request.key_points
        )
        return {"success": True, "summary": result.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save summary: {str(e)}")

@app.get("/meetings/{meeting_id}/summary")
async def get_meeting_summary(
    meeting_id: str,
    current_user = Depends(get_current_user)
):
    """Get the summary for a meeting"""
    try:
        supabase = get_supabase()
        result = supabase.get_meeting_summary(meeting_id)
        if not result.data:
            raise HTTPException(status_code=404, detail="Summary not found")
        return {"success": True, "summary": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch summary: {str(e)}")

@app.get("/meetings/{meeting_id}/transcription")
async def get_meeting_transcription(
    meeting_id: str,
    current_user = Depends(get_current_user)
):
    """Get the transcription for a meeting"""
    try:
        supabase = get_supabase()
        result = supabase.get_meeting_transcription(meeting_id)
        if not result.data:
            raise HTTPException(status_code=404, detail="Transcription not found")
        return {"success": True, "transcription": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch transcription: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
