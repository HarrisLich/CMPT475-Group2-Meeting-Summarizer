#!/usr/bin/env python3
"""
Quick test to verify Ollama API is working with the new chat endpoint.
"""

import requests
import os

print("=" * 60)
print("🧪 TESTING OLLAMA API (v0.12+)")
print("=" * 60)

# Configuration
ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
ollama_model = os.getenv("OLLAMA_MODEL", "llama3.2:1b")

print(f"\nConfiguration:")
print(f"  Host: {ollama_host}")
print(f"  Model: {ollama_model}")

# Test 1: Check Ollama status
print("\n1. Checking Ollama status...")
try:
    response = requests.get(f"{ollama_host}/api/tags", timeout=5)
    if response.status_code == 200:
        models = response.json().get("models", [])
        model_names = [m.get("name") for m in models]
        print(f"   ✅ Ollama is running")
        print(f"   Available models: {model_names}")
    else:
        print(f"   ❌ Ollama returned status: {response.status_code}")
        exit(1)
except Exception as e:
    print(f"   ❌ Cannot connect to Ollama: {e}")
    print(f"   Make sure Ollama is running: ollama serve")
    exit(1)

# Test 2: Test new chat API endpoint
print("\n2. Testing /api/chat endpoint (v0.12+)...")
try:
    response = requests.post(
        f"{ollama_host}/api/chat",
        json={
            "model": ollama_model,
            "messages": [
                {
                    "role": "user",
                    "content": "Say 'Hello from Ollama!' and nothing else."
                }
            ],
            "stream": False
        },
        timeout=30
    )

    if response.status_code == 200:
        result = response.json()
        message = result.get("message", {})
        content = message.get("content", "")
        print(f"   ✅ Chat API works!")
        print(f"   Response: {content}")
    else:
        print(f"   ❌ Chat API returned status: {response.status_code}")
        print(f"   Response: {response.text}")
        exit(1)

except Exception as e:
    print(f"   ❌ Chat API failed: {e}")
    exit(1)

# Test 3: Quick summarization test
print("\n3. Testing summarization...")
try:
    test_text = "Meeting started at 2pm. John discussed the new project timeline. Sarah agreed to review the documentation by Friday. Meeting ended at 3pm."

    response = requests.post(
        f"{ollama_host}/api/chat",
        json={
            "model": ollama_model,
            "messages": [
                {
                    "role": "user",
                    "content": f"Summarize this meeting in one sentence: {test_text}"
                }
            ],
            "stream": False
        },
        timeout=60
    )

    if response.status_code == 200:
        result = response.json()
        message = result.get("message", {})
        summary = message.get("content", "")
        print(f"   ✅ Summarization works!")
        print(f"   Summary: {summary[:100]}...")
    else:
        print(f"   ❌ Summarization failed: {response.status_code}")
        exit(1)

except Exception as e:
    print(f"   ❌ Summarization error: {e}")
    exit(1)

print("\n" + "=" * 60)
print("🎉 ALL TESTS PASSED!")
print("=" * 60)
print("\nOllama API v0.12+ is working correctly.")
print("Your TRUE HYBRID setup is ready to use!")
print("=" * 60)
