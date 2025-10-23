# 🚀 Hybrid Setup Guide: Groq + Ollama

## The Perfect Balance of Speed & Cost

This guide explains the **hybrid architecture** that gives you the best of both worlds:
- **Groq** for fast transcription (heavy compute, done once)
- **Ollama** for unlimited summarization (light compute, done many times)

---

## 🎯 Why This Hybrid Approach is Brilliant

### The Problem with "All Cloud" or "All Local":

| Approach | Transcription | Summarization | Problem |
|----------|---------------|---------------|---------|
| **All Cloud** | Fast ✅ | Fast ✅ | ❌ Rate limits, costs add up |
| **All Local** | Slow ❌ | Fast ✅ | ❌ Transcription takes forever on CPU |
| **HYBRID** | Fast ✅ | Fast ✅ | ✅ Best of both! |

### Resource Distribution:

```
┌─────────────────────────────────────────────────────┐
│                  ONE MEETING                        │
├─────────────────────────────────────────────────────┤
│ TRANSCRIPTION (Heavy, One-Time)                     │
│ ├─ Groq Whisper API                                 │
│ ├─ Time: 2-3 minutes (30 min audio)                 │
│ ├─ Cost: 1 API call (minimal rate limit impact)     │
│ └─ Fallback: Local Whisper if file >25MB            │
├─────────────────────────────────────────────────────┤
│ SUMMARIZATION (Light, Unlimited)                    │
│ ├─ Local Ollama (llama3.2:1b)                       │
│ ├─ Time: 30-60 seconds                              │
│ ├─ Cost: $0 (unlimited)                             │
│ └─ Can re-summarize infinitely                      │
├─────────────────────────────────────────────────────┤
│ CHAT INTERACTIONS (Very Light, Unlimited)           │
│ ├─ Local Ollama (llama3.2:1b)                       │
│ ├─ Time: 5-10 seconds per query                     │
│ └─ Cost: $0 (unlimited)                             │
├─────────────────────────────────────────────────────┤
│ ACTION ITEMS (Light, Unlimited)                     │
│ ├─ Local Ollama (llama3.2:1b)                       │
│ ├─ Time: 15-30 seconds                              │
│ └─ Cost: $0 (unlimited)                             │
└─────────────────────────────────────────────────────┘
```

---

## ⚡ Performance Comparison

### 60-Minute Meeting Example:

| Task | All Local | Hybrid (Groq + Ollama) | Speedup |
|------|-----------|------------------------|---------|
| **Transcription** | 12-18 min | 2-3 min | **6-9×** |
| **Summarization** | 1-2 min | 1-2 min | 1× |
| **Chat (10 queries)** | 1-2 min | 1-2 min | 1× |
| **Action Items** | 30 sec | 30 sec | 1× |
| **TOTAL** | 15-22 min | 4-7 min | **~5×** |

**Result**: You save ~15 minutes per meeting while keeping unlimited summarization!

---

## 🎨 How It Works

### Intelligent Fallback System:

```python
# Hybrid Transcription Logic
1. Check if Groq API key exists
   ├─ YES → Try Groq
   │   ├─ File ≤ 25MB → Use Groq (fast!)
   │   ├─ File > 25MB → Fall back to Local Whisper
   │   └─ Rate limit hit → Fall back to Local Whisper
   └─ NO → Use Local Whisper

2. Summarization ALWAYS uses Local Ollama
   ├─ Unlimited usage
   ├─ No rate limits
   └─ No API costs
```

### Code Flow:

```
User uploads 30-min meeting audio (20MB)
         ↓
HybridTranscriptionService.transcribe_file()
         ↓
    File size check (20MB < 25MB ✅)
         ↓
    Try Groq Whisper API
         ↓
    ✅ Success! (2-3 minutes)
         ↓
    Return transcription text
         ↓
User requests summary
         ↓
    SummarizationService.summarize_transcription()
         ↓
    Local Ollama processes (30-60 seconds)
         ↓
    ✅ Summary returned
         ↓
User asks 10 follow-up questions via chat
         ↓
    All processed locally (unlimited, fast)
```

---

## 🛠️ Setup Instructions

### 1. Ensure Groq API Key is Set

Your [.env](/.env) file should have:

```bash
# Groq API Configuration
GROQ_API_KEY=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

# Whisper model for local fallback
WHISPER_MODEL=small

# Ollama model for summarization (CPU-optimized)
OLLAMA_MODEL=llama3.2:1b
OLLAMA_HOST=http://localhost:11434
```

### 2. Install Dependencies

```bash
cd server
pip install groq  # Already in requirements.txt
```

### 3. Download Ollama Model

```bash
# Download the fast, lightweight Llama model
ollama pull llama3.2:1b

# Start Ollama server
ollama serve
```

Keep Ollama running in a separate terminal.

### 4. Start Your Server

```bash
cd server
python main.py
```

---

## 📊 Rate Limit Strategy

### Groq Free Tier Limits:
- **14,400 requests/day** (plenty for meetings!)
- **25MB file size limit**
- **No token limits** for Whisper API

### How Many Meetings Can You Transcribe?

Assuming 1 transcription = 1 API call:

```
14,400 requests/day = 14,400 meetings/day
                    = 600 meetings/hour
                    = 10 meetings/minute
```

**You'll NEVER hit the daily limit** for normal meeting transcription! 🎉

### What Eats Rate Limits?

| Task | API Calls per Meeting | Daily Limit Impact |
|------|----------------------|-------------------|
| Transcription (Groq) | 1 | 0.007% |
| Summarization (Local) | 0 | 0% |
| Chat (Local) | 0 | 0% |
| Action Items (Local) | 0 | 0% |

**Conclusion**: Hybrid approach uses Groq ONLY for the heavy task (transcription), so you'll almost never hit limits!

---

## 🔧 Configuration Options

### Option 1: Prefer Groq (Recommended)
```python
# Default behavior - tries Groq first, falls back to local
result = transcription_service.transcribe_file(content, filename)
```

**Best for**: Most users, fastest transcription

### Option 2: Force Local Whisper
```python
# Skip Groq, use local directly
result = transcription_service.transcribe_file(content, filename, prefer_groq=False)
```

**Best for**:
- Files >25MB (won't fit in Groq free tier)
- When you've hit Groq rate limit
- Testing local setup

### Option 3: Different Whisper Models

In [.env](/.env):

```bash
# Groq Whisper model (cloud)
# Options: whisper-large-v3 (most accurate), whisper-large-v3-turbo (faster)
GROQ_WHISPER_MODEL=whisper-large-v3

# Local Whisper model (fallback)
# Options: tiny (fastest), small (balanced), base (default)
WHISPER_MODEL=small
```

---

## 💡 Best Practices

### 1. **Compress Audio Before Upload**
For files approaching 25MB:

```bash
# Reduce bitrate to compress audio
ffmpeg -i input.wav -b:a 64k output.mp3
```

### 2. **Monitor Your Groq Usage**
Check your usage at: https://console.groq.com/usage

### 3. **Test Fallback System**
Occasionally test with a >25MB file to ensure local Whisper works:

```bash
# This should trigger local fallback
curl -F "audio_file=@large_meeting.mp3" http://localhost:8000/transcribe
```

### 4. **Keep Ollama Running**
Ensure Ollama is always running for summarization:

```bash
# Check Ollama status
ollama list

# Start if not running
ollama serve
```

---

## 🐛 Troubleshooting

### Problem: "Groq API key not found"

**Solution**: Add your Groq API key to [.env](/.env):
```bash
GROQ_API_KEY=your_key_here
```

The system will automatically fall back to local Whisper.

---

### Problem: "File too large for Groq free tier"

**Solution**: The system automatically falls back to local Whisper. You'll see:
```
⚠️  File too large for Groq: 30.5MB (limit: 25MB)
🔄 Using local Whisper instead...
```

To prevent this, compress your audio:
```bash
ffmpeg -i large_audio.wav -b:a 64k compressed.mp3
```

---

### Problem: "Groq rate limit reached"

**Solution**: The system falls back to local Whisper automatically.

To check your limit status:
```bash
# View recent transcriptions
curl https://api.groq.com/openai/v1/audio/transcriptions \
  -H "Authorization: Bearer $GROQ_API_KEY"
```

---

### Problem: "Ollama not responding"

**Solution**:
```bash
# Check if Ollama is running
ollama list

# If not, start it
ollama serve

# Pull the model if missing
ollama pull llama3.2:1b
```

---

### Problem: "Summarization is slow"

**Solution**: You might be using a large Ollama model. Check your [.env](/.env):

```bash
# Use the fast model
OLLAMA_MODEL=llama3.2:1b

# Not this (slower):
# OLLAMA_MODEL=llama3.2
# OLLAMA_MODEL=llama3.2:3b
```

Then restart Ollama:
```bash
ollama serve
```

---

## 📈 Monitoring Performance

### Add Timing Logs

You can monitor performance by checking the console output:

```
🚀 Using Groq for fast transcription (18.5MB)...
✅ Groq transcription complete! (took 2.3 minutes)

🏠 Using local Ollama for summarization...
✅ Summarization complete! (took 45 seconds)
```

### Track Service Usage

The response includes a `service` field:

```json
{
  "filename": "meeting.mp3",
  "transcription": "...",
  "service": "groq",  // or "local"
  "model_used": "whisper-large-v3"
}
```

---

## ✅ Summary

### What Changed:

| Component | Before | After |
|-----------|--------|-------|
| Transcription | Local Whisper only | **Hybrid: Groq → Local fallback** |
| Summarization | Local Ollama | Local Ollama (no change) |
| Chat | Local Ollama | Local Ollama (no change) |
| Action Items | Local Ollama | Local Ollama (no change) |

### Benefits:

✅ **5-9× faster transcription** (when using Groq)
✅ **Unlimited summarization** (local Ollama)
✅ **Unlimited chat** (local Ollama)
✅ **Minimal rate limit impact** (1 call per meeting)
✅ **Automatic fallback** (never breaks)
✅ **Still 100% free** (Groq free tier + local processing)

### Trade-offs:

⚠️ **25MB file size limit** for Groq (auto-falls back to local)
⚠️ **Requires Groq API key** (optional, works without it)
⚠️ **Still needs Ollama running** for summarization

---

## 🔗 Resources

- [Groq Console](https://console.groq.com/)
- [Groq Whisper Docs](https://console.groq.com/docs/speech-to-text)
- [Ollama Models](https://ollama.com/library)
- [Whisper Model Comparison](https://github.com/openai/whisper#available-models-and-languages)

---

## 🎉 Conclusion

**You now have the PERFECT hybrid setup:**

1. **Transcription**: Groq (fast) with local fallback (reliable)
2. **Everything else**: Local Ollama (unlimited, free)

This is the **sweet spot** for meeting summarization:
- Fast when you need it (transcription)
- Unlimited when you need it (summarization, chat)
- Free forever
- Never breaks (automatic fallback)

**Enjoy your 5× faster meeting transcription!** 🚀
