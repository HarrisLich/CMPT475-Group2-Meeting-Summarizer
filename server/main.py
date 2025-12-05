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
from typing import Dict
import os
import time
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
    conversation_id: str = None
    user_id: str = None

class SpeakerMappingsRequest(BaseModel):
    """
    Request model for saving speaker name mappings.
    Maps speaker IDs (e.g., "SPEAKER_01") to actual names.
    """
    meeting_id: str
    mappings: Dict[str, str]  # Maps speaker ID to name

# Create FastAPI instance
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

# Create FastAPI instance with comprehensive OpenAPI metadata
app = FastAPI(
    title="Meeting Summarizer API",
    description="""
    ## Meeting Summarizer API

    A comprehensive API for transcribing, summarizing, and analyzing meeting recordings using AI.

    ### Features
    - **Audio Transcription**: Upload audio/video files for automatic transcription using Groq Whisper API with local fallback
    - **AI Summarization**: Generate structured meeting summaries using local Ollama LLM (unlimited and free)
    - **Action Items Extraction**: Automatically identify and extract action items from meetings
    - **Conversational Chat**: Ask questions about your meetings and get intelligent responses
    - **Chat History Management**: Store and retrieve conversation history with full CRUD operations
    - **Authentication**: Secure endpoints with Supabase authentication and JWT tokens

    ### Technology Stack
    - **Transcription**: Hybrid approach using Groq Whisper API (cloud) + Local Whisper (fallback)
    - **AI Processing**: Ollama (local LLM - llama3.2:1b)
    - **Database**: Supabase (PostgreSQL)
    - **Authentication**: Supabase Auth with JWT
    - **File Processing**: Automatic audio compression for large files (>25MB)

    ### Rate Limits
    - Groq API: Subject to Groq's rate limits (automatically falls back to local Whisper)
    - Local Ollama: No rate limits (runs locally)
    - File Upload: Maximum 500MB before compression, compressed to <25MB

    ### Authentication
    Most endpoints require authentication via Supabase JWT token. Include the token in the `Authorization` header:
    ```
    Authorization: Bearer <your_jwt_token>
    ```

    To get a token, use the `/auth/login` or `/auth/register` endpoints.
    """,
    version="1.0.0",
    contact={
        "name": "Meeting Summarizer Team",
        "email": "support@meetingsummarizer.com",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
    openapi_tags=[
        {
            "name": "Health",
            "description": "Health check and status endpoints"
        },
        {
            "name": "Audio Processing",
            "description": "Upload and transcribe audio/video files"
        },
        {
            "name": "AI Processing",
            "description": "Summarization, chat, and action items extraction using AI"
        },
        {
            "name": "Conversations",
            "description": "Manage conversations and chat history"
        },
        {
            "name": "Messages",
            "description": "Manage messages within conversations"
        },
        {
            "name": "Meetings",
            "description": "Retrieve meeting summaries and transcriptions"
        },
        {
            "name": "Testing",
            "description": "Internal testing and debugging endpoints"
        },
    ]
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js development server
        "http://127.0.0.1:3000",
        "https://localhost:3000",
        "https://127.0.0.1:3000",
        "https://sumurai-frontend.onrender.com",
        # Add your production frontend URL here when deployed
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include authentication routes
app.include_router(auth_router)

# Root endpoint
@app.get(
    "/",
    tags=["Health"],
    summary="API Root",
    description="Simple root endpoint to verify the API is running and accessible.",
    response_description="Returns a welcome message confirming the API is operational"
)
async def root():
    return {"message": "Meeting Summarizer API is running!"}

# Health check endpoint
@app.get(
    "/health",
    tags=["Health"],
    summary="Health Check",
    description="Check the health status of the Meeting Summarizer API service. Use this endpoint for monitoring and health checks.",
    response_description="Returns the current health status of the service"
)
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
@app.post(
    "/transcribe",
    tags=["Audio Processing"],
    summary="Transcribe Audio/Video File",
    description="""
    Upload an audio or video file for automatic transcription and AI analysis.

    ### Process Flow
    1. **Upload**: Submit audio/video file (MP3, WAV, MP4, M4A, FLAC)
    2. **Compression**: Files >25MB are automatically compressed to ~20MB
    3. **Transcription**: Uses hybrid approach (Groq Whisper API → Local Whisper fallback)
    4. **AI Analysis**: Generates summary and extracts action items
    5. **Database**: Saves meeting, transcription, summary, conversation, and action items

    ### File Requirements
    - **Supported Formats**: MP3, WAV, MP4, M4A, FLAC
    - **Maximum Size**: 500MB (before compression)
    - **Target Size**: <25MB (after automatic compression if needed)

    ### Response Includes
    - Full transcription with timestamps
    - AI-generated summary with key takeaways
    - Extracted action items with priorities
    - Meeting ID, conversation ID, and database IDs for reference

    ### Error Handling
    - **413**: File too large (>500MB or compression failed)
    - **429**: Rate limit exceeded (Groq API)
    - **500**: Transcription or processing failed

    ### Optional Authentication
    Provide `user_id` to save the meeting to the database. Without `user_id`, transcription still works but data is not persisted.
        """,
    response_description="Transcription result with text, summary, action items, and database IDs"
)
async def transcribe_audio(
    audio_file: UploadFile = File(..., description="Audio or video file to transcribe (MP3, WAV, MP4, M4A, FLAC)"),
    user_id: str = Form(None, description="Optional user ID to save meeting to database")
):
    # START TIMER - Track total processing time from upload to completion
    start_time = time.time()

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

        # Upload audio to Supabase Storage if user_id is provided
        audio_url = None
        if user_id:
            try:
                print(f"[STORAGE] Uploading audio to Supabase Storage...")
                supabase = get_supabase()
                audio_url = supabase.upload_audio_file(
                    file_content=content,
                    filename=audio_file.filename,
                    user_id=user_id
                )
                print(f"[STORAGE] Audio uploaded successfully: {audio_url}")
            except Exception as storage_error:
                print(f"[STORAGE ERROR] Failed to upload audio: {str(storage_error)}")
                # Don't fail the entire request if storage upload fails
                audio_url = None

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

        # Add audio_url to result if it was uploaded
        if audio_url:
            result["audio_url"] = audio_url

        # Save to database if user_id is provided
        meeting_id = None
        conversation_id = None
        transcription_id = None
        generated_title = None

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

            except Exception as db_error:
                print(f"[DB ERROR] Failed to save meeting: {str(db_error)}")
                result["db_warning"] = f"Meeting data could not be saved: {str(db_error)}"

        # Generate summary from transcription
        transcription_text = result.get("transcription", "")
        segments = result.get("segments", [])
        if transcription_text and len(transcription_text.strip()) > 0:
            # Generate AI title from transcription if we have user_id
            if user_id and meeting_id:
                try:
                    print(f"[AI] Generating meeting title from transcription...")
                    title_result = summarization_service.generate_meeting_title(transcription_text)
                    if title_result.get("success"):
                        generated_title = title_result.get("title")
                        print(f"[AI] Generated title: {generated_title}")
                        result["generated_title"] = generated_title
                    else:
                        print(f"[AI] Title generation failed: {title_result.get('error')}")
                        generated_title = audio_file.filename.replace('.mp3', '').replace('.wav', '').replace('.m4a', '')
                except Exception as title_error:
                    print(f"[AI ERROR] Failed to generate title: {str(title_error)}")
                    generated_title = audio_file.filename.replace('.mp3', '').replace('.wav', '').replace('.m4a', '')

                # Create conversation with generated title
                try:
                    print(f"[DB] Creating conversation for meeting {meeting_id}")
                    conversation_result = supabase.create_conversation(
                        user_id=user_id,
                        meeting_id=meeting_id,
                        title=generated_title,
                        model_version="llama3.2:3b"
                    )
                    conversation_id = conversation_result.data[0]['id']
                    print(f"[DB] Conversation created with ID: {conversation_id}")
                    result["conversation_id"] = conversation_id
                except Exception as db_error:
                    print(f"[DB ERROR] Failed to create conversation: {str(db_error)}")

            # Save transcription to database if we have a meeting_id
            if meeting_id and user_id:
                try:
                    print(f"[DB] Saving transcription for meeting {meeting_id}")
                    transcription_result = supabase.save_transcription(
                        meeting_id=meeting_id,
                        transcription_text=transcription_text,
                        audio_url=audio_url,
                        segments=segments
                    )
                    transcription_id = transcription_result.data[0]['id']
                    print(f"[DB] Transcription saved with ID: {transcription_id}")
                    result["transcription_id"] = transcription_id
                except Exception as db_error:
                    print(f"[DB ERROR] Failed to save transcription: {str(db_error)}")

            summary_result = summarization_service.summarize_transcription(transcription_text)

            # DEBUG: Print raw LLM output to see markdown formatting
            if summary_result.get("success"):
                print(f"\n{'='*80}")
                print("[DEBUG] RAW LLM SUMMARY OUTPUT:")
                print(f"{'='*80}")
                print(summary_result.get("summary", ""))
                print(f"{'='*80}\n")

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

            # Step 5: Action items will be extracted AFTER speaker mapping is complete
            # This allows the LLM to see actual names instead of speaker IDs
            # Action items extraction is triggered via /meetings/{meeting_id}/extract-action-items endpoint
            result["action_items"] = []
            print(f"[AI] Action items will be extracted after speaker mapping is complete")

        else:
            result["summary"] = {
                "success": False,
                "error": "No transcription text available for summarization"
            }

        # END TIMER - Log total processing time after ALL operations complete
        end_time = time.time()
        total_time = end_time - start_time
        print(f"\n{'='*60}")
        print(f"[TIMING] ✓ ALL PROCESSING COMPLETE")
        print(f"[TIMING] Total time: {total_time:.2f} seconds ({total_time/60:.2f} minutes)")
        print(f"[TIMING] File: {audio_file.filename}")
        print(f"[TIMING] User: {user_id or 'anonymous'}")
        print(f"[TIMING] Components:")
        print(f"[TIMING]   - Transcription: Completed")
        print(f"[TIMING]   - Summarization: Completed")
        print(f"[TIMING]   - Action Items: Completed")
        print(f"[TIMING]   - Database Saves: Completed")
        print(f"[TIMING] Status: Ready to send to frontend")
        print(f"{'='*60}\n")

        return result

    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"ERROR in /transcribe endpoint: {str(e)}")
        print(f"Full traceback:\n{error_trace}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@app.get(
    "/test/public",
    tags=["Testing"],
    summary="Test Public Database Access",
    description="Internal testing endpoint to verify public database access. Not for production use.",
    include_in_schema=False  # Hide from production docs
)
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

@app.get(
    "/test/tables",
    tags=["Testing"],
    summary="Test Database Tables Access",
    description="Internal testing endpoint to verify database table access. Not for production use.",
    include_in_schema=False  # Hide from production docs
)
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

@app.get(
    "/protected-route",
    tags=["Testing"],
    summary="Test Protected Route",
    description="Test endpoint to verify Supabase authentication is working correctly.",
    include_in_schema=False  # Hide from production docs
)
async def protected_route(current_user = Depends(get_current_user)):
    # This endpoint is now protected with Supabase auth
    return {"message": "This is protected", "user": current_user}



@app.get(
    "/ollama/status",
    tags=["AI Processing"],
    summary="Check Ollama Status",
    description="""
Check if the local Ollama service is running and accessible.

Ollama is used for all AI processing (summarization, chat, action items extraction) and runs locally on your machine.

### Returns
- **available**: Boolean indicating if Ollama is running
- **models**: List of available Ollama models
- **error**: Error message if Ollama is not accessible

### Note
All AI features require Ollama to be running locally. If this endpoint returns `available: false`, start Ollama with `ollama serve`.
    """,
    response_description="Ollama service status and available models"
)
async def ollama_status():
    """
    Endpoint to check if LOCAL Ollama is running and accessible.

    Returns:
        Dict[str, Any]: Status information from the SummarizationService.
    """
    return summarization_service.check_ollama_status()

@app.post(
    "/summarize",
    tags=["AI Processing"],
    summary="Generate Meeting Summary",
    description="""
Generate an AI-powered summary from a meeting transcription.

### Process
Uses local Ollama LLM (llama3.2:1b) to create a structured markdown summary with:
- **Title**: Descriptive meeting title
- **Key Takeaways**: Main points and decisions
- **Action Items**: Tasks identified in the meeting
- **Main Topics Covered**: Discussion areas

### Features
- **Local Processing**: Runs entirely on your machine (unlimited, free, private)
- **No Rate Limits**: Uses local Ollama, not cloud APIs
- **Structured Output**: Consistent markdown formatting

### Optional Database Save
Provide `user_id` to save the summary to the database for future reference.
    """,
    response_description="Generated summary with structured content"
)
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

@app.post(
    "/chat",
    tags=["AI Processing"],
    summary="Chat About Meeting",
    description="""
Have a conversational interaction about a meeting using AI.

### Features
- **Ask Questions**: Query specific details from the meeting
- **Get Clarifications**: Understand complex topics discussed
- **Contextual Responses**: AI maintains context of the meeting
- **Chat History**: Messages are saved to the conversation for future reference

### How It Works
1. Provide meeting context (transcription or summary)
2. Ask your question
3. AI responds based on the meeting content
4. Both user and assistant messages are saved to the database

### Use Cases
- "What decisions were made about the budget?"
- "Who was assigned to the marketing task?"
- "Summarize the discussion about Project X"

### Chat History
Provide `conversation_id` to save messages to the conversation history. Without it, the chat still works but messages aren't persisted.
    """,
    response_description="AI response to your question about the meeting"
)
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

@app.post(
    "/extract-action-items",
    tags=["AI Processing"],
    summary="Extract Action Items",
    description="""
Automatically extract structured action items from a meeting transcription using AI.

### What It Extracts
- **Tasks**: Clear action items mentioned in the meeting
- **Priorities**: High, Medium, or Low priority for each task
- **Assignments**: Who is responsible for each task (if mentioned)
- **Due Dates**: Deadlines mentioned in the meeting (if specified)

### Output Format
Returns a structured JSON array of action items with fields:
- `task`: Description of the action item
- `priority`: Priority level (high/medium/low)
- `assigned_to`: Person responsible (or "Unassigned")
- `due_date`: Deadline (or null if not mentioned)

### Use Cases
- Automatically generate task lists from meeting notes
- Track follow-up actions and assignments
- Ensure nothing falls through the cracks

### Database Storage
Provide `conversation_id` and `user_id` to save action items to the database for tracking and updates.
    """,
    response_description="List of extracted action items with task details, priorities, and assignments"
)
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

        # Debug logging to see what the LLM is returning
        print(f"[ACTION ITEMS DEBUG] Raw result: {result}")
        if result.get("action_items"):
            for idx, item in enumerate(result.get("action_items")):
                print(f"[ACTION ITEMS DEBUG] Item {idx}: {item}")
                print(f"[ACTION ITEMS DEBUG]   - task: {item.get('task')}")
                print(f"[ACTION ITEMS DEBUG]   - priority: {item.get('priority')} (type: {type(item.get('priority'))})")
                print(f"[ACTION ITEMS DEBUG]   - assigned_to: {item.get('assigned_to')}")

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

        # Save action items to database if conversation_id and user_id are provided
        if request.conversation_id and request.user_id and result.get("action_items"):
            try:
                supabase = get_supabase()
                action_items_result = supabase.save_action_items(
                    conversation_id=request.conversation_id,
                    action_items=result.get("action_items")
                )
                print(f"[ACTION ITEMS] Saved {len(result.get('action_items'))} action items to conversation {request.conversation_id}: {action_items_result.data}")
            except Exception as db_error:
                print(f"[ACTION ITEMS] Warning: Failed to save action items to database: {str(db_error)}")
                # Continue and return result even if database save fails

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Action item extraction failed: {str(e)}")

@app.post("/transcribe-with-speakers")
async def transcribe_with_speakers(
    audio_file: UploadFile = File(...),
    meeting_id: str = Form(None),
    user_id: str = Form(None),  # Optional - only saves to DB if provided with valid UUID
    meeting_title: str = Form(None)
):
    """
    Transcribe audio with speaker diarization and automatically save to database.

    Args:
        audio_file: The audio file to transcribe
        meeting_id: Optional meeting ID. If not provided, a new meeting will be created.
        user_id: User ID (UUID) for the meeting. If not provided, transcription works but won't save to database.
        meeting_title: Optional title for the meeting. If not provided, uses filename.
    """
    # START TIMER - Track total processing time from upload to completion
    start_time = time.time()

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

        # Upload audio to Supabase Storage if user_id is provided
        audio_url = None
        if user_id:
            try:
                print(f"[STORAGE] Uploading audio to Supabase Storage...")
                supabase_storage = get_supabase()
                audio_url = supabase_storage.upload_audio_file(
                    file_content=content,
                    filename=audio_file.filename,
                    user_id=user_id
                )
                print(f"[STORAGE] Audio uploaded successfully: {audio_url}")
            except Exception as storage_error:
                print(f"[STORAGE ERROR] Failed to upload audio: {str(storage_error)}")
                # Don't fail the entire request if storage upload fails
                audio_url = None

        # Transcribe with speaker diarization
        try:
            print(f"[TRANSCRIPTION] Starting speaker diarization transcription...")
            result = transcription_service.transcribe_with_speakers(content, audio_file.filename, hf_token)
            print(f"[TRANSCRIPTION] Transcription complete!")
        except Exception as transcribe_error:
            import traceback
            error_trace = traceback.format_exc()
            print(f"[TRANSCRIPTION ERROR] Failed to transcribe with speakers: {str(transcribe_error)}")
            print(f"[TRANSCRIPTION ERROR] Traceback:\n{error_trace}")
            raise HTTPException(
                status_code=500,
                detail=f"Transcription failed: {str(transcribe_error)}"
            )

        # Add audio_url to result
        if audio_url:
            result["audio_url"] = audio_url

        # Auto-save to database only if user_id is provided
        if user_id:
            try:
                supabase = get_supabase()

                # If no meeting_id provided, create a new meeting
                if not meeting_id:
                    # Generate meeting title from filename if not provided
                    title = meeting_title or audio_file.filename.replace('.mp3', '').replace('.wav', '').replace('.m4a', '')

                    # Create new meeting
                    meeting_result = supabase.save_meeting(
                        user_id=user_id,
                        title=title,
                        description=f"Transcription from {audio_file.filename}"
                    )

                    # Extract meeting ID from result
                    # Supabase returns data in result.data array
                    if hasattr(meeting_result, 'data') and meeting_result.data:
                        if isinstance(meeting_result.data, list) and len(meeting_result.data) > 0:
                            meeting_id = meeting_result.data[0].get("id")
                        elif isinstance(meeting_result.data, dict):
                            meeting_id = meeting_result.data.get("id")
                        else:
                            meeting_id = None
                    else:
                        meeting_id = None

                    if not meeting_id:
                        print("Warning: Could not extract meeting_id from created meeting")
                        print(f"Meeting result: {meeting_result}")
                        # Continue without saving to database
                        result["meeting_id"] = None
                        result["saved"] = False
                        return result

                # Get transcription text for AI processing
                transcription_text = result.get("transcription", "")

                # Generate AI title from transcription
                try:
                    print(f"[AI] Generating meeting title from transcription...")
                    title_result = summarization_service.generate_meeting_title(transcription_text)
                    if title_result.get("success"):
                        generated_title = title_result.get("title")
                        print(f"[AI] Generated title: {generated_title}")
                        result["generated_title"] = generated_title
                    else:
                        print(f"[AI] Title generation failed: {title_result.get('error')}")
                        generated_title = meeting_title or audio_file.filename.replace('.mp3', '').replace('.wav', '').replace('.m4a', '')
                except Exception as title_error:
                    print(f"[AI ERROR] Failed to generate title: {str(title_error)}")
                    generated_title = meeting_title or audio_file.filename.replace('.mp3', '').replace('.wav', '').replace('.m4a', '')

                # Create conversation with generated title
                conversation_id = None
                try:
                    print(f"[DB] Creating conversation for meeting {meeting_id}")
                    conversation_result = supabase.create_conversation(
                        user_id=user_id,
                        meeting_id=meeting_id,
                        title=generated_title,
                        model_version="llama3.2:3b"
                    )
                    conversation_id = conversation_result.data[0]['id']
                    print(f"[DB] Conversation created with ID: {conversation_id}")
                    result["conversation_id"] = conversation_id
                except Exception as db_error:
                    print(f"[DB ERROR] Failed to create conversation: {str(db_error)}")

                print(f"[DB] Saving transcription for meeting: {meeting_id}")
                # Save transcription with speaker information
                transcription_result = supabase.save_transcription_with_speakers(meeting_id, result)
                transcription_id = transcription_result.data[0]['id'] if transcription_result.data else None
                print(f"[DB] Transcription saved with ID: {transcription_id}")
                result["transcription_id"] = transcription_id

                # Generate summary
                summary_result = summarization_service.summarize_transcription(transcription_text)

                # DEBUG: Print raw LLM output
                if summary_result.get("success"):
                    print(f"\n{'='*80}")
                    print("[DEBUG] RAW LLM SUMMARY OUTPUT:")
                    print(f"{'='*80}")
                    print(summary_result.get("summary", ""))
                    print(f"{'='*80}\n")

                result["summary"] = summary_result

                # Save summary to database if successful
                if summary_result.get("success"):
                    try:
                        print(f"[DB] Saving summary for meeting {meeting_id}")
                        summary_text = summary_result.get("summary", "")
                        summary_db_result = supabase.save_summary(
                            meeting_id=meeting_id,
                            summary_text=summary_text,
                            key_points=None
                        )
                        summary_id = summary_db_result.data[0]['id']
                        print(f"[DB] Summary saved with ID: {summary_id}")
                        result["summary_id"] = summary_id

                        # Save summary as initial assistant message in conversation
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

                # Extract action items
                print(f"[AI] Extracting action items...")
                action_items_result = summarization_service.extract_action_items(transcription_text)

                if action_items_result.get("success"):
                    result["action_items"] = action_items_result.get("action_items", [])
                    print(f"[AI] Extracted {len(result['action_items'])} action items")

                    # Save action items to database
                    if conversation_id and len(result["action_items"]) > 0:
                        try:
                            print(f"[DB] Saving {len(result['action_items'])} action items to database...")
                            supabase.save_action_items(
                                conversation_id=conversation_id,
                                action_items=result["action_items"]
                            )
                            print(f"[DB] ✓ All action items saved successfully")
                        except Exception as db_error:
                            print(f"[DB ERROR] Failed to save action items: {str(db_error)}")
                else:
                    print(f"[AI] Action items extraction failed: {action_items_result.get('error')}")
                    result["action_items"] = []

                # Add meeting_id and saved status to response
                result["meeting_id"] = meeting_id
                result["saved"] = True
                result["message"] = "Transcription with speakers saved successfully"

            except Exception as db_error:
                # Log the error but don't fail the request - transcription succeeded
                import traceback
                error_trace = traceback.format_exc()
                print(f"Warning: Failed to save transcription to database: {str(db_error)}")
                print(f"Traceback:\n{error_trace}")
                result["meeting_id"] = meeting_id if meeting_id else None
                result["saved"] = False
                result["warning"] = f"Transcription succeeded but database save failed: {str(db_error)}"

        # END TIMER - Log total processing time after ALL operations complete
        end_time = time.time()
        total_time = end_time - start_time
        print(f"\n{'='*60}")
        print(f"[TIMING] ✓ ALL PROCESSING COMPLETE (Speaker Diarization)")
        print(f"[TIMING] Total time: {total_time:.2f} seconds ({total_time/60:.2f} minutes)")
        print(f"[TIMING] File: {audio_file.filename}")
        print(f"[TIMING] User: {user_id or 'anonymous'}")
        print(f"[TIMING] Components:")
        print(f"[TIMING]   - Transcription with Speakers: Completed")
        print(f"[TIMING]   - Title Generation: Completed")
        print(f"[TIMING]   - Summarization: Completed")
        print(f"[TIMING]   - Action Items: Completed")
        print(f"[TIMING]   - Database Saves: Completed")
        print(f"[TIMING] Status: Ready to send to frontend")
        print(f"{'='*60}\n")

        return result
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"ERROR in /transcribe-with-speakers endpoint: {str(e)}")
        print(f"Full traceback:\n{error_trace}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@app.get("/meetings/{meeting_id}/speakers")
async def get_meeting_speakers(meeting_id: str):
    """
    Get unique speakers detected in a meeting transcription.
    
    Returns a list of speakers with their IDs and sample text to help users
    identify and name each speaker.
    """
    import uuid
    try:
        # Validate that meeting_id is a valid UUID
        try:
            uuid.UUID(meeting_id)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid meeting_id format. Expected UUID, got: {meeting_id}"
            )
        
        supabase = get_supabase()
        speakers = supabase.get_meeting_speakers(meeting_id)
        
        return {
            "success": True,
            "speakers": speakers
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error getting speakers: {str(e)}")
        print(f"Traceback:\n{error_trace}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to get speakers: {str(e)}"
        )

@app.get("/meetings/{meeting_id}/speaker-mappings")
async def get_speaker_mappings(meeting_id: str):
    """
    Get speaker name mappings for a meeting.
    
    Returns a dictionary mapping speaker IDs to names.
    """
    import uuid
    try:
        # Validate that meeting_id is a valid UUID
        try:
            uuid.UUID(meeting_id)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid meeting_id format. Expected UUID, got: {meeting_id}"
            )
        
        supabase = get_supabase()
        mappings = supabase.get_speaker_mappings(meeting_id)
        
        return {
            "success": True,
            "mappings": mappings
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error getting speaker mappings: {str(e)}")
        print(f"Traceback:\n{error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get speaker mappings: {str(e)}"
        )

@app.post("/meetings/{meeting_id}/speaker-mappings")
async def save_speaker_mappings(
    meeting_id: str, 
    request: SpeakerMappingsRequest
):
    """
    Save speaker name mappings for a meeting.
    
    Maps generic speaker IDs (e.g., "SPEAKER_01", "SPEAKER_02") to actual
    names (e.g., "John Doe", "Jane Smith") that users provide.
    
    Args:
        meeting_id: The meeting ID
        request: Contains mappings dict (speaker_id -> name)
        current_user: Authenticated user (from JWT token)
    """
    try:
        # Validate that meeting_id in path matches request body
        if request.meeting_id != meeting_id:
            return {
                "success": False,
                "error": "Meeting ID in path does not match request body"
            }
        
        supabase = get_supabase()
        result = supabase.save_speaker_mappings(meeting_id, request.mappings, user_id=None)
        
        # Check if there was an error in the result
        if not result.get("success", False):
            return {
                "success": False,
                "error": result.get("error", "Failed to save speaker mappings")
            }
        
        return {
            "success": True,
            "message": "Speaker mappings saved successfully",
            "mappings": request.mappings
        }
    except HTTPException as e:
        return {
            "success": False,
            "error": e.detail
        }
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error saving speaker mappings: {str(e)}")
        print(f"Traceback:\n{error_trace}")
        return {
            "success": False,
            "error": f"Failed to save speaker mappings: {str(e)}"
        }

@app.post(
    "/meetings/{meeting_id}/extract-action-items",
    tags=["AI Processing"],
    summary="Extract Action Items After Speaker Mapping",
    description="""
    Extract action items from a meeting transcription AFTER speaker names have been assigned.
    
    This endpoint:
    1. Retrieves the meeting transcription
    2. Gets speaker name mappings
    3. Replaces speaker IDs (SPEAKER_01, etc.) with actual names in the transcript
    4. Uses AI to extract action items with proper name assignments
    5. Saves action items to the database
    
    ### When to Use
    Call this endpoint AFTER the user has completed speaker mapping via `/meetings/{meeting_id}/speaker-mappings`.
    
    ### Benefits
    - LLM sees actual names instead of generic speaker IDs
    - More accurate action item assignments
    - Better delegation based on who said what
    """,
    response_description="Extracted action items with proper name assignments"
)
async def extract_action_items_after_speaker_mapping(meeting_id: str):
    """
    Extract action items from a meeting transcription after speaker names have been assigned.
    This allows the LLM to see actual names and make better assignment decisions.
    """
    import uuid
    try:
        # Validate meeting_id format
        try:
            uuid.UUID(meeting_id)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid meeting_id format. Expected UUID, got: {meeting_id}"
            )
        
        supabase = get_supabase()
        
        # Step 1: Get the transcription
        transcription_result = supabase.get_meeting_transcription(meeting_id)
        if not transcription_result.data or len(transcription_result.data) == 0:
            raise HTTPException(
                status_code=404,
                detail=f"No transcription found for meeting {meeting_id}"
            )
        
        transcription_data = transcription_result.data[0]
        transcription_text = transcription_data.get("transcription_text", "")
        segments_data = transcription_data.get("segments", {})
        
        # Handle segments format (could be array or object with segments property)
        segments = []
        if isinstance(segments_data, list):
            segments = segments_data
        elif isinstance(segments_data, dict) and "segments" in segments_data:
            segments = segments_data.get("segments", [])
        elif isinstance(segments_data, dict):
            # Might be stored as a dict with other properties
            segments = segments_data.get("segments", [])
        
        if not transcription_text:
            raise HTTPException(
                status_code=404,
                detail=f"Transcription text is empty for meeting {meeting_id}"
            )
        
        # Step 2: Get speaker mappings
        speaker_mappings = supabase.get_speaker_mappings(meeting_id)
        
        if not speaker_mappings:
            # If no speaker mappings exist, use original transcript
            print(f"[ACTION ITEMS] No speaker mappings found for meeting {meeting_id}, using original transcript")
            enriched_transcript = transcription_text
        else:
            # Step 3: Replace speaker IDs with actual names in the transcript
            print(f"[ACTION ITEMS] Found {len(speaker_mappings)} speaker mappings, enriching transcript...")
            
            # Build enriched transcript by replacing speaker IDs in segments
            enriched_segments = []
            for segment in segments:
                speaker_id = segment.get("speaker")
                text = segment.get("text", "")
                
                # Replace speaker ID with name if mapping exists
                if speaker_id and speaker_id in speaker_mappings:
                    speaker_name = speaker_mappings[speaker_id]
                    # Add speaker name at the beginning of the segment
                    enriched_text = f"{speaker_name}: {text}"
                else:
                    enriched_text = text
                
                enriched_segments.append({
                    "speaker": speaker_id,
                    "speaker_name": speaker_mappings.get(speaker_id, speaker_id),
                    "text": enriched_text,
                    "start": segment.get("start"),
                    "end": segment.get("end")
                })
            
            # Reconstruct transcript text with names
            if enriched_segments:
                # Build transcript with format: "Name: text" for better LLM understanding
                # Note: enriched_segments already have names in the text field, so just use that
                enriched_transcript_parts = []
                for seg in enriched_segments:
                    # The text field already has "Name: text" format from line 1355
                    enriched_transcript_parts.append(seg.get("text", ""))
                enriched_transcript = "\n".join(enriched_transcript_parts)
            else:
                # Fallback: replace speaker IDs in full text
                enriched_transcript = transcription_text
                for speaker_id, name in speaker_mappings.items():
                    enriched_transcript = enriched_transcript.replace(speaker_id, name)
            
            print(f"[ACTION ITEMS] Transcript enriched with {len(speaker_mappings)} speaker names")
            print(f"[ACTION ITEMS] Speaker mappings: {speaker_mappings}")
            print(f"[ACTION ITEMS] Sample enriched transcript (first 500 chars): {enriched_transcript[:500]}")
        
        # Step 4: Extract action items using enriched transcript
        print(f"[AI] Extracting action items with enriched transcript (length: {len(enriched_transcript)} chars)...")
        action_items_start = time.time()
        action_items_result = summarization_service.extract_action_items(enriched_transcript)
        action_items_duration = time.time() - action_items_start
        
        if not action_items_result.get("success"):
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "action_items_extraction_failed",
                    "message": action_items_result.get("error", "Failed to extract action items")
                }
            )
        
        action_items = action_items_result.get("action_items", [])
        print(f"[AI] Extracted {len(action_items)} action items in {action_items_duration:.2f}s")
        
        # Step 4.5: Post-process to convert speaker IDs to names and assign unassigned tasks
        if speaker_mappings and action_items:
            print(f"[ACTION ITEMS] Post-processing to convert speaker IDs to names using {len(speaker_mappings)} speaker mappings...")
            assigned_names = list(speaker_mappings.values())
            # Create a normalized mapping for fuzzy matching (case-insensitive)
            normalized_name_map = {name.lower(): name for name in assigned_names}
            
            def validate_and_fix_name(name: str) -> str:
                """Validate that a name is in the speaker mappings, fix if needed"""
                if not name or name.strip() == "":
                    return "Unassigned"
                
                name_clean = name.strip()
                
                # Exact match
                if name_clean in assigned_names:
                    return name_clean
                
                # Case-insensitive match
                if name_clean.lower() in normalized_name_map:
                    correct_name = normalized_name_map[name_clean.lower()]
                    print(f"[ACTION ITEMS] Fixed case mismatch: '{name_clean}' -> '{correct_name}'")
                    return correct_name
                
                # Fuzzy match - check if any part of the name matches
                name_lower = name_clean.lower()
                for actual_name in assigned_names:
                    actual_lower = actual_name.lower()
                    # Check if names are similar (one contains the other or vice versa)
                    if name_lower in actual_lower or actual_lower in name_lower:
                        print(f"[ACTION ITEMS] Fixed name mismatch: '{name_clean}' -> '{actual_name}'")
                        return actual_name
                    # Check first name match
                    if name_lower.split()[0] == actual_lower.split()[0] if name_lower.split() and actual_lower.split() else False:
                        print(f"[ACTION ITEMS] Fixed first name match: '{name_clean}' -> '{actual_name}'")
                        return actual_name
                
                # If no match found, return original (will be handled by unassigned logic)
                print(f"[ACTION ITEMS] WARNING: Name '{name_clean}' not found in speaker mappings: {assigned_names}")
                return name_clean
            
            for item in action_items:
                assigned_to = item.get("assigned_to", "").strip()
                
                # FIRST: Convert any speaker IDs to actual names
                if assigned_to in speaker_mappings:
                    item["assigned_to"] = speaker_mappings[assigned_to]
                    print(f"[ACTION ITEMS] Converted '{assigned_to}' to '{speaker_mappings[assigned_to]}' for task: {item.get('task')}")
                elif assigned_to.startswith("SPEAKER_"):
                    # Handle case where LLM might return speaker IDs even though we gave it names
                    # Try to find the name in the enriched transcript context
                    task_text = item.get("task", "").lower()
                    found_name = None
                    
                    # Search segments to find which speaker this task relates to
                    for segment in segments:
                        segment_text = segment.get("text", "").lower()
                        segment_speaker_id = segment.get("speaker")
                        
                        # Check if this segment contains keywords from the task
                        task_keywords = [word for word in task_text.split() if len(word) > 4]
                        if any(keyword in segment_text for keyword in task_keywords):
                            if segment_speaker_id in speaker_mappings:
                                found_name = speaker_mappings[segment_speaker_id]
                                break
                    
                    if found_name:
                        item["assigned_to"] = found_name
                        print(f"[ACTION ITEMS] Converted '{assigned_to}' to '{found_name}' based on transcript context")
                    elif assigned_to in speaker_mappings:
                        item["assigned_to"] = speaker_mappings[assigned_to]
                    else:
                        # If we can't find the mapping, use first available name as fallback
                        if assigned_names:
                            item["assigned_to"] = assigned_names[0]
                            print(f"[ACTION ITEMS] Converted '{assigned_to}' to '{assigned_names[0]}' (fallback)")
                elif assigned_to and assigned_to != "Unassigned":
                    # Validate that the name returned by LLM is actually in our speaker mappings
                    validated_name = validate_and_fix_name(assigned_to)
                    if validated_name != assigned_to:
                        item["assigned_to"] = validated_name
                        print(f"[ACTION ITEMS] Validated and fixed name: '{assigned_to}' -> '{validated_name}' for task: {item.get('task')}")
                
                # SECOND: Handle unassigned tasks
                if item.get("assigned_to") == "Unassigned" or not item.get("assigned_to") or item.get("assigned_to", "").strip() == "":
                    task_text = item.get("task", "").lower()
                    
                    # Strategy 1: Check if task mentions a name directly
                    for name in assigned_names:
                        if name.lower() in task_text:
                            item["assigned_to"] = name
                            print(f"[ACTION ITEMS] Assigned '{item.get('task')}' to {name} (name found in task)")
                            break
                    
                    # Strategy 2: If still unassigned, find the speaker who mentioned this task
                    if item.get("assigned_to") == "Unassigned" or not item.get("assigned_to"):
                        # Search segments for this task
                        task_keywords = [word for word in task_text.split() if len(word) > 4]  # Get meaningful words
                        best_match_speaker = None
                        best_match_score = 0
                        
                        for segment in segments:
                            segment_text = segment.get("text", "").lower()
                            segment_speaker_id = segment.get("speaker")
                            
                            # Count how many task keywords appear in this segment
                            match_score = sum(1 for keyword in task_keywords if keyword in segment_text)
                            
                            # Bonus if speaker says "I will" or "I'll" in same segment
                            if any(phrase in segment_text for phrase in ["i will", "i'll", "i can", "let me", "i'll handle"]):
                                match_score += 2
                            
                            if match_score > best_match_score and segment_speaker_id in speaker_mappings:
                                best_match_score = match_score
                                best_match_speaker = speaker_mappings[segment_speaker_id]
                        
                        if best_match_speaker and best_match_score >= 1:
                            item["assigned_to"] = best_match_speaker
                            print(f"[ACTION ITEMS] Assigned '{item.get('task')}' to {best_match_speaker} (found in transcript context)")
                        elif assigned_names:
                            # Strategy 3: If still unassigned and we have names, assign to first person (fallback)
                            # This ensures every task has an owner
                            item["assigned_to"] = assigned_names[0]
                            print(f"[ACTION ITEMS] Assigned '{item.get('task')}' to {assigned_names[0]} (fallback assignment)")
        
        # Final pass: Validate all names and ensure no speaker IDs remain
        if speaker_mappings:
            for item in action_items:
                assigned_to = item.get("assigned_to", "")
                
                # Convert speaker IDs
                if assigned_to.startswith("SPEAKER_") and assigned_to in speaker_mappings:
                    item["assigned_to"] = speaker_mappings[assigned_to]
                    print(f"[ACTION ITEMS] Final pass: Converted '{assigned_to}' to '{speaker_mappings[assigned_to]}'")
                elif assigned_to.startswith("SPEAKER_") and speaker_mappings:
                    # Last resort: assign to first available name
                    item["assigned_to"] = list(speaker_mappings.values())[0]
                    print(f"[ACTION ITEMS] Final pass: Converted '{assigned_to}' to '{list(speaker_mappings.values())[0]}' (fallback)")
                elif assigned_to and assigned_to != "Unassigned":
                    # Validate that the name is in our speaker mappings
                    validated_name = validate_and_fix_name(assigned_to)
                    if validated_name != assigned_to:
                        item["assigned_to"] = validated_name
                    # If still not in mappings, try to find it in transcript segments
                    elif validated_name not in assigned_names:
                        # Search for this name in the enriched transcript to find the speaker
                        task_text = item.get("task", "").lower()
                        found_speaker_id = None
                        for segment in segments:
                            segment_text = segment.get("text", "").lower()
                            # Check if the invalid name appears in this segment
                            if validated_name.lower() in segment_text:
                                segment_speaker_id = segment.get("speaker")
                                if segment_speaker_id in speaker_mappings:
                                    found_speaker_id = segment_speaker_id
                                    break
                        
                        if found_speaker_id:
                            correct_name = speaker_mappings[found_speaker_id]
                            item["assigned_to"] = correct_name
                            print(f"[ACTION ITEMS] Final pass: Mapped invalid name '{validated_name}' to correct speaker '{correct_name}'")
                        else:
                            # Last resort: use first available name
                            item["assigned_to"] = list(speaker_mappings.values())[0]
                            print(f"[ACTION ITEMS] Final pass: Replaced invalid name '{validated_name}' with '{list(speaker_mappings.values())[0]}' (fallback)")
        
        # Count how many are still unassigned or have speaker IDs after post-processing
        unassigned_count = sum(1 for item in action_items if item.get("assigned_to") == "Unassigned" or not item.get("assigned_to"))
        speaker_id_count = sum(1 for item in action_items if item.get("assigned_to", "").startswith("SPEAKER_"))
        
        # Summary: Show which names were actually used
        if speaker_mappings:
            used_names = set(item.get("assigned_to", "") for item in action_items if item.get("assigned_to") and item.get("assigned_to") != "Unassigned")
            expected_names = set(speaker_mappings.values())
            invalid_names = used_names - expected_names
            
            print(f"\n[ACTION ITEMS] Summary:")
            print(f"  Expected names: {sorted(expected_names)}")
            print(f"  Names used in action items: {sorted(used_names)}")
            if invalid_names:
                print(f"  ⚠️  WARNING: Invalid names found: {sorted(invalid_names)}")
            else:
                print(f"  ✓ All names are valid")
        
        if unassigned_count > 0:
            print(f"[ACTION ITEMS] WARNING: {unassigned_count} action items still unassigned after post-processing")
        if speaker_id_count > 0:
            print(f"[ACTION ITEMS] WARNING: {speaker_id_count} action items still have speaker IDs after post-processing")
        if unassigned_count == 0 and speaker_id_count == 0:
            print(f"[ACTION ITEMS] ✓ All {len(action_items)} action items have been assigned with actual names")
        
        # Step 5: Get conversation_id for this meeting
        conversation_result = supabase.client.table("conversations")\
            .select("id")\
            .eq("meeting_id", meeting_id)\
            .execute()
        
        conversation_id = None
        if conversation_result.data and len(conversation_result.data) > 0:
            conversation_id = conversation_result.data[0]["id"]
        
        # Step 6: Save action items to database
        if conversation_id and len(action_items) > 0:
            try:
                print(f"[DB] Saving {len(action_items)} action items to database...")
                supabase.save_action_items(
                    conversation_id=conversation_id,
                    action_items=action_items
                )
                print(f"[DB] ✓ All action items saved successfully")
            except Exception as db_error:
                print(f"[DB ERROR] Failed to save action items: {str(db_error)}")
                # Don't fail the request, just log the error
        
        return {
            "success": True,
            "action_items": action_items,
            "count": len(action_items),
            "message": f"Successfully extracted {len(action_items)} action items"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error extracting action items: {str(e)}")
        print(f"Traceback:\n{error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extract action items: {str(e)}"
        )

# Conversation/Chat History Endpoints
@app.post(
    "/conversations",
    tags=["Conversations"],
    summary="Create Conversation",
    description="""
Create a new conversation for storing chat history about a meeting.

### Purpose
Conversations link chat messages to specific meetings, allowing you to:
- Track discussion history about a meeting
- Maintain context across multiple chat sessions
- Organize messages by meeting

### Required Fields
- `meeting_id`: ID of the meeting this conversation is about
- `title`: Descriptive title for the conversation
- `model_version`: AI model used (default: llama3.2:3b)

### Authentication
Requires valid Supabase JWT token. Conversation is automatically linked to the authenticated user.
    """,
    response_description="Created conversation with ID and metadata"
)
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

@app.get(
    "/conversations",
    tags=["Conversations"],
    summary="Get User Conversations",
    description="""
Retrieve all conversations for the authenticated user.

### Returns
List of all conversations including:
- Conversation metadata (ID, title, created date)
- Associated meeting information
- Archive status
- Model version used

### Use Cases
- Display user's conversation history
- List all meetings with chat interactions
- Filter archived vs active conversations

### Authentication
Requires valid Supabase JWT token. Only returns conversations owned by the authenticated user.
    """,
    response_description="List of user's conversations with metadata"
)
async def get_user_conversations(current_user = Depends(get_current_user)):
    """Get all conversations for the authenticated user"""
    try:
        supabase = get_supabase()
        result = supabase.get_user_conversations(current_user["id"])
        return {"success": True, "conversations": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch conversations: {str(e)}")

@app.get(
    "/conversations/{conversation_id}",
    tags=["Conversations"],
    summary="Get Conversation Details",
    description="""
Get detailed information about a specific conversation including all related data.

### Returns
Complete conversation package with:
- **Conversation**: Metadata (ID, title, dates, model)
- **Transcription**: Full meeting transcription with timestamps
- **Summary**: AI-generated meeting summary
- **Action Items**: Extracted tasks and assignments

### Use Cases
- Display full meeting context for chat
- Load conversation history with all related data
- Review meeting details and AI outputs

### Authentication
Requires valid Supabase JWT token. Can only access your own conversations.

### Error Responses
- **404**: Conversation not found
- **500**: Database error
    """,
    response_description="Conversation with transcription, summary, and action items"
)
async def get_conversation(
    conversation_id: str,
    current_user = Depends(get_current_user)
):
    """Get a specific conversation by ID with all related data"""
    try:
        supabase = get_supabase()

        # Get the conversation
        conv_result = supabase.get_conversation_by_id(conversation_id)
        if not conv_result.data:
            raise HTTPException(status_code=404, detail="Conversation not found")

        conversation = conv_result.data[0]
        meeting_id = conversation.get("meeting_id")

        # Prepare response with conversation data
        response = {
            "success": True,
            "conversation": conversation
        }

        # If there's a meeting_id, fetch related data
        if meeting_id:
            try:
                # Get transcription
                transcription_result = supabase.get_meeting_transcription(meeting_id)
                if transcription_result.data:
                    response["transcription"] = transcription_result.data[0]

                # Get summary
                summary_result = supabase.get_meeting_summary(meeting_id)
                if summary_result.data:
                    response["summary"] = summary_result.data[0]

            except Exception as e:
                print(f"[WARNING] Failed to fetch meeting data: {str(e)}")
                # Don't fail the request, just return conversation without extras

        # Get action items for this conversation
        try:
            action_items_result = supabase.get_conversation_action_items(conversation_id)
            if action_items_result.data:
                response["action_items"] = action_items_result.data
        except Exception as e:
            print(f"[WARNING] Failed to fetch action items: {str(e)}")
            # Don't fail the request, just return conversation without action items

        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch conversation: {str(e)}")

@app.put(
    "/conversations/{conversation_id}/title",
    tags=["Conversations"],
    summary="Update Conversation Title",
    description="""
Update the title of an existing conversation.

### Use Cases
- Rename conversations for better organization
- Update titles to reflect conversation content
- Maintain meaningful conversation names

### Authentication
Requires valid Supabase JWT token. Can only update your own conversations.
    """,
    response_description="Updated conversation with new title"
)
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

@app.put(
    "/conversations/{conversation_id}/archive",
    tags=["Conversations"],
    summary="Archive/Unarchive Conversation",
    description="""
Archive or unarchive a conversation to organize your chat history.

### Parameters
- `archived`: Set to `true` to archive, `false` to unarchive (default: true)

### Use Cases
- Hide old conversations from active view
- Organize conversations without deleting them
- Restore archived conversations when needed

### Note
Archived conversations are not deleted - they can be restored by setting `archived=false`.

### Authentication
Requires valid Supabase JWT token. Can only archive your own conversations.
    """,
    response_description="Updated conversation with new archive status"
)
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

@app.delete(
    "/conversations/{conversation_id}",
    tags=["Conversations"],
    summary="Delete Conversation",
    description="""
**Permanently delete** a conversation and ALL associated data.

### ⚠️ Warning: This Action is Irreversible

This endpoint completely removes:
- ✗ The conversation record
- ✗ All messages in the conversation
- ✗ All action items for the conversation
- ✗ The associated meeting
- ✗ The meeting transcription
- ✗ The meeting summary

### Why Delete Everything?
To avoid wasted database space and orphaned records. When you delete a conversation, all related data is cleaned up automatically.

### Use Cases
- Remove unwanted meetings and chat history
- Clean up test data
- Free up database storage

### Alternative
Consider using the **archive** endpoint instead if you want to hide conversations without permanently deleting them.

### Authentication
Requires valid Supabase JWT token. Can only delete your own conversations.

### Error Responses
- **404**: Conversation not found
- **500**: Database error during deletion
    """,
    response_description="Deletion confirmation message"
)
async def delete_conversation(
    conversation_id: str,
    current_user = Depends(get_current_user)
):
    """
    Delete a conversation and ALL associated data to avoid wasted database space.
    This permanently removes:
    - The conversation record
    - All messages in the conversation
    - All action items for the conversation
    - The associated meeting
    - The meeting transcription
    - The meeting summary
    """
    try:
        supabase = get_supabase()
        result = supabase.delete_conversation(conversation_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete conversation: {str(e)}")

@app.post(
    "/messages",
    tags=["Messages"],
    summary="Save Message",
    description="""
Save a message to a conversation's chat history.

### Message Types
- **user**: Messages from the user asking questions
- **assistant**: AI-generated responses

### Fields
- `conversation_id`: ID of the conversation
- `role`: Either "user" or "assistant"
- `content`: The message text
- `token_count`: Optional token usage tracking

### Use Cases
- Store chat history for later reference
- Track conversation flow between user and AI
- Enable conversation replay and analysis

### Note
The `/chat` endpoint automatically saves messages when `conversation_id` is provided. Use this endpoint only if you need manual message storage.

### Authentication
Requires valid Supabase JWT token.
    """,
    response_description="Saved message with ID and metadata"
)
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

@app.get(
    "/conversations/{conversation_id}/messages",
    tags=["Messages"],
    summary="Get Conversation Messages",
    description="""
Retrieve all messages in a conversation's chat history.

### Returns
Chronologically ordered list of messages including:
- Message ID and timestamp
- Role (user or assistant)
- Message content
- Token count (if tracked)

### Use Cases
- Display full chat history
- Load previous conversation context
- Analyze conversation flow

### Authentication
Requires valid Supabase JWT token. Can only access messages from your own conversations.
    """,
    response_description="List of messages in chronological order"
)
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

@app.post(
    "/summaries",
    tags=["Meetings"],
    summary="Save Meeting Summary",
    description="""
Save an AI-generated summary for a meeting.

### Fields
- `meeting_id`: ID of the meeting
- `summary_text`: The summary content (markdown formatted)
- `key_points`: Optional list of key takeaways

### Note
The `/transcribe` endpoint automatically generates and saves summaries. Use this endpoint only if you need to manually save or update summaries.

### Authentication
Requires valid Supabase JWT token.
    """,
    response_description="Saved summary with ID and metadata"
)
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

@app.get(
    "/meetings/{meeting_id}/summary",
    tags=["Meetings"],
    summary="Get Meeting Summary",
    description="""
Retrieve the AI-generated summary for a specific meeting.

### Returns
Summary data including:
- Summary text (markdown formatted)
- Key points extracted
- Creation timestamp
- Meeting ID reference

### Use Cases
- Display meeting summary without full conversation context
- Export meeting summaries
- Quick meeting overview

### Authentication
Requires valid Supabase JWT token. Can only access summaries for your own meetings.

### Error Responses
- **404**: Summary not found for this meeting
- **500**: Database error
    """,
    response_description="Meeting summary with key points"
)
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

@app.get(
    "/meetings/{meeting_id}/transcription",
    tags=["Meetings"],
    summary="Get Meeting Transcription",
    description="""
Retrieve the full transcription for a specific meeting.

### Returns
Transcription data including:
- Full transcription text
- Timestamp segments (if available)
- Audio URL (if stored)
- Creation timestamp
- Meeting ID reference

### Use Cases
- Display full meeting transcript
- Search within transcription text
- Generate alternative summaries
- Provide context for chat interactions

### Authentication
Requires valid Supabase JWT token. Can only access transcriptions for your own meetings.

### Error Responses
- **404**: Transcription not found for this meeting
- **500**: Database error
    """,
    response_description="Meeting transcription with timestamps"
)
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

@app.delete(
    "/account",
    tags=["Authentication"],
    summary="Delete User Account",
    description="""
**Permanently delete** your user account and ALL associated data.

### ⚠️ Warning: This Action is Irreversible

This endpoint completely removes:
- ✗ Your user profile
- ✗ All your meetings
- ✗ All transcriptions
- ✗ All summaries
- ✗ All conversations and chat history
- ✗ All messages
- ✗ All action items
- ✗ Your authentication account

### Security
- You can only delete your own account
- Requires valid JWT authentication token
- User identity is verified from the token (not from request body)

### After Deletion
- You will be logged out
- All your data will be permanently removed
- You can create a new account with the same email if desired

### Authentication
Requires valid Supabase JWT token. The user_id is extracted from the token to ensure you can only delete your own account.
    """,
    response_description="Account deletion confirmation with statistics"
)
async def delete_account(current_user = Depends(get_current_user)):
    """
    Delete the authenticated user's account and all associated data.

    This endpoint:
    1. Verifies user identity via JWT token
    2. Deletes all user data (meetings, conversations, messages, etc.)
    3. Deletes the user profile
    4. Deletes the authentication account

    Security: User can only delete their own account. The user_id comes from
    the verified JWT token, not from user input.
    """
    try:
        user_id = current_user["id"]
        print(f"[ACCOUNT DELETION] Starting deletion for user {user_id}")

        supabase = get_supabase()
        result = supabase.delete_user_account(user_id)

        print(f"[ACCOUNT DELETION] Successfully deleted user {user_id}")
        print(f"[ACCOUNT DELETION] - Conversations deleted: {result['deleted_conversations']}")
        print(f"[ACCOUNT DELETION] - Meetings deleted: {result['deleted_meetings']}")

        return {
            "success": True,
            "message": "Account successfully deleted",
            "details": result
        }
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[ACCOUNT DELETION ERROR] Failed to delete account: {str(e)}")
        print(f"[ACCOUNT DELETION ERROR] Traceback:\n{error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete account: {str(e)}"
        )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
