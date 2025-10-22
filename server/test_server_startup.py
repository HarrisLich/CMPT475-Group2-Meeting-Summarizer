"""
Test script to check if the server can start up properly with Groq.
"""

import os
import sys

def check_environment():
    """Check if required environment variables are set."""
    print("=" * 60)
    print("Checking Environment Variables")
    print("=" * 60)

    # Load .env file
    from dotenv import load_dotenv
    load_dotenv()

    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key:
        print(f"✓ GROQ_API_KEY is set (length: {len(groq_key)} characters)")
    else:
        print("✗ GROQ_API_KEY is NOT set!")
        return False

    return True

def test_services_initialization():
    """Test if services can be initialized."""
    print("\n" + "=" * 60)
    print("Testing Service Initialization")
    print("=" * 60)

    try:
        print("\n1. Testing TranscriptionService...")
        from transcription import TranscriptionService
        transcription_service = TranscriptionService()
        print(f"✓ TranscriptionService initialized successfully")
        print(f"  Model: {transcription_service.model}")
    except Exception as e:
        print(f"✗ TranscriptionService failed to initialize: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

    try:
        print("\n2. Testing SummarizationService...")
        from summarization import SummarizationService
        summarization_service = SummarizationService()
        print(f"✓ SummarizationService initialized successfully")
        print(f"  Model: {summarization_service.model}")
    except Exception as e:
        print(f"✗ SummarizationService failed to initialize: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

    return True

def test_fastapi_startup():
    """Test if FastAPI app can be imported and initialized."""
    print("\n" + "=" * 60)
    print("Testing FastAPI App Import")
    print("=" * 60)

    try:
        print("\nImporting FastAPI app from main.py...")
        from main import app, transcription_service, summarization_service
        print("✓ FastAPI app imported successfully")
        print(f"✓ Transcription service ready: {transcription_service.model}")
        print(f"✓ Summarization service ready: {summarization_service.model}")
        return True
    except Exception as e:
        print(f"✗ FastAPI app import failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all startup tests."""
    print("\n🚀 Testing Server Startup\n")

    # Step 1: Check environment
    if not check_environment():
        print("\n❌ Environment check failed!")
        sys.exit(1)

    # Step 2: Test services
    if not test_services_initialization():
        print("\n❌ Service initialization failed!")
        sys.exit(1)

    # Step 3: Test FastAPI app
    if not test_fastapi_startup():
        print("\n❌ FastAPI app startup failed!")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("✅ All startup tests passed!")
    print("=" * 60)
    print("\nYou can now run the server with:")
    print("  uvicorn main:app --reload --host 0.0.0.0 --port 8000")
    print("\nOr:")
    print("  python main.py")

if __name__ == "__main__":
    main()
