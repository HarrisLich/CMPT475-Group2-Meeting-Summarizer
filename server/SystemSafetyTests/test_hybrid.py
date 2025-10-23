#!/usr/bin/env python3
"""
Quick test script to verify hybrid setup works correctly.
Tests both Groq and local Whisper fallback.
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_imports():
    """Test that all imports work"""
    print("🧪 Testing imports...")

    try:
        from transcription.Groq_Transcription import GroqTranscriptionService, HybridTranscriptionService
        print("✅ Groq transcription imports successful")
    except Exception as e:
        print(f"❌ Groq transcription import failed: {e}")
        return False

    try:
        from transcription.Local_Whisper import LocalWhisperService
        print("✅ Local Whisper imports successful")
    except Exception as e:
        print(f"❌ Local Whisper import failed: {e}")
        return False

    try:
        from summarization import SummarizationService
        print("✅ Summarization imports successful")
    except Exception as e:
        print(f"❌ Summarization import failed: {e}")
        return False

    return True


def test_groq_config():
    """Test Groq API configuration"""
    print("\n🔑 Testing Groq configuration...")

    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key:
        print(f"✅ GROQ_API_KEY found: {groq_key[:10]}...")
        return True
    else:
        print("⚠️  GROQ_API_KEY not set (will use local Whisper only)")
        return False


def test_ollama_config():
    """Test Ollama configuration"""
    print("\n🤖 Testing Ollama configuration...")

    ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    ollama_model = os.getenv("OLLAMA_MODEL", "llama3.2")

    print(f"   OLLAMA_HOST: {ollama_host}")
    print(f"   OLLAMA_MODEL: {ollama_model}")

    import requests
    try:
        response = requests.get(f"{ollama_host}/api/tags", timeout=2)
        if response.status_code == 200:
            models = response.json().get("models", [])
            model_names = [m.get("name") for m in models]
            print(f"✅ Ollama is running with models: {model_names}")

            if ollama_model in model_names or any(ollama_model in m for m in model_names):
                print(f"✅ Model '{ollama_model}' is available")
                return True
            else:
                print(f"⚠️  Model '{ollama_model}' not found. Run: ollama pull {ollama_model}")
                return False
        else:
            print(f"❌ Ollama returned status code: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Could not connect to Ollama: {e}")
        print("   Make sure Ollama is running: ollama serve")
        return False


def test_hybrid_service():
    """Test hybrid transcription service initialization"""
    print("\n🔀 Testing hybrid transcription service...")

    try:
        from transcription.Groq_Transcription import HybridTranscriptionService

        whisper_model = os.getenv("WHISPER_MODEL", "small")
        service = HybridTranscriptionService(
            whisper_model=whisper_model,
            groq_model="whisper-large-v3"
        )

        print(f"✅ Hybrid service initialized")
        print(f"   Local Whisper model: {whisper_model}")
        print(f"   Groq available: {service.groq_available}")

        return True
    except Exception as e:
        print(f"❌ Hybrid service initialization failed: {e}")
        return False


def main():
    print("=" * 60)
    print("🚀 HYBRID SETUP TEST")
    print("=" * 60)

    results = {
        "imports": test_imports(),
        "groq_config": test_groq_config(),
        "ollama_config": test_ollama_config(),
        "hybrid_service": test_hybrid_service()
    }

    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)

    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name:20s}: {status}")

    all_passed = all(results.values())

    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 ALL TESTS PASSED!")
        print("\nYour hybrid setup is ready to use:")
        print("  • Groq for fast transcription (with local fallback)")
        print("  • Ollama for unlimited summarization")
    else:
        print("⚠️  SOME TESTS FAILED")
        print("\nPlease fix the issues above before proceeding.")

        if not results["groq_config"]:
            print("\nTo add Groq API key:")
            print("  1. Get key from: https://console.groq.com/keys")
            print("  2. Add to .env: GROQ_API_KEY=your_key_here")

        if not results["ollama_config"]:
            print("\nTo fix Ollama:")
            print("  1. Install: brew install ollama")
            print("  2. Start: ollama serve")
            print("  3. Pull model: ollama pull llama3.2:1b")

    print("=" * 60)

    return all_passed


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
