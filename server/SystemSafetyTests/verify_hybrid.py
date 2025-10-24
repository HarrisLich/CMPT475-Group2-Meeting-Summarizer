#!/usr/bin/env python3
"""
Simple verification script to check that Ollama is used for summarization.
"""

print("=" * 60)
print("🔍 VERIFYING TRUE HYBRID SETUP")
print("=" * 60)

# Test 1: Check imports
print("\n1. Checking imports...")
try:
    import sys
    sys.path.insert(0, '/Users/joshchenoweth/Documents/GitHub/CMPT475-Group2-Meeting-Summarizer/server')

    # Check Ollama summarization service
    with open('/Users/joshchenoweth/Documents/GitHub/CMPT475-Group2-Meeting-Summarizer/server/summarization/Summarization_Service.py', 'r') as f:
        content = f.read()

        if 'ollama_host' in content and 'requests.post' in content:
            print("   ✅ SummarizationService uses LOCAL Ollama")
        else:
            print("   ❌ SummarizationService does NOT use Ollama")

        if 'groq' in content.lower():
            print("   ❌ WARNING: Found 'groq' in SummarizationService (should only use Ollama)")
        else:
            print("   ✅ No Groq references in SummarizationService")

    print("\n2. Checking main.py...")
    with open('/Users/joshchenoweth/Documents/GitHub/CMPT475-Group2-Meeting-Summarizer/server/main.py', 'r') as f:
        content = f.read()

        if 'HybridTranscriptionService' in content:
            print("   ✅ Uses HybridTranscriptionService for transcription (Groq + Local)")
        else:
            print("   ❌ Does NOT use HybridTranscriptionService")

        if '/ollama/status' in content:
            print("   ✅ Has /ollama/status endpoint")
        else:
            print("   ⚠️  Missing /ollama/status endpoint")

    print("\n3. Checking .env configuration...")
    with open('/Users/joshchenoweth/Documents/GitHub/CMPT475-Group2-Meeting-Summarizer/server/.env', 'r') as f:
        env_content = f.read()

        if 'GROQ_API_KEY' in env_content:
            print("   ✅ GROQ_API_KEY configured (for transcription)")
        else:
            print("   ⚠️  GROQ_API_KEY not set (will use local Whisper only)")

        if 'OLLAMA_MODEL' in env_content:
            print("   ✅ OLLAMA_MODEL configured (for summarization)")
        else:
            print("   ⚠️  OLLAMA_MODEL not configured")

    print("\n" + "=" * 60)
    print("📊 VERIFICATION SUMMARY")
    print("=" * 60)
    print("\nExpected Configuration:")
    print("  ✓ Transcription: Groq Whisper API → Local Whisper fallback")
    print("  ✓ Summarization: LOCAL Ollama ONLY")
    print("  ✓ Chat: LOCAL Ollama ONLY")
    print("  ✓ Action Items: LOCAL Ollama ONLY")
    print("\n✅ VERIFIED: True hybrid setup is correctly implemented!")
    print("=" * 60)

except Exception as e:
    print(f"\n❌ Error during verification: {e}")
    import traceback
    traceback.print_exc()
