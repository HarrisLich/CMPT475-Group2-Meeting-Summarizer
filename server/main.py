from fastapi import FastAPI
import uvicorn

# Create FastAPI instance
app = FastAPI(
    title="Meeting Summarizer API",
    description="Simple API for meeting summarization",
    version="1.0.0"
)

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Meeting Summarizer API is running!"}

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "meeting-summarizer"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
