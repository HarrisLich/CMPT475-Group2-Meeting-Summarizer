# Meeting Summarizer API

A simple FastAPI-based backend service for meeting summarization.

## Features

- **Simple API**: Basic FastAPI setup with health check
- **RESTful API**: Clean, well-documented API endpoints
- **Easy Setup**: Minimal dependencies and configuration

## Setup Instructions

### Prerequisites

- Python 3.8 or higher
- pip (Python package installer)

### Installation

1. **Navigate to the server directory:**
   ```bash
   cd CMPT475-Group2-Meeting-Summarizer/server
   ```

2. **Create a virtual environment (recommended):**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

### Running the Application

1. **Activate the virtual environment and start the development server:**
   ```bash
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   python main.py
   ```
   
   Or using uvicorn directly:
   ```bash
   source venv/bin/activate
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Access the API:**
   - API Base URL: `http://localhost:8000`
   - Interactive API Documentation: `http://localhost:8000/docs`
   - Alternative API Documentation: `http://localhost:8000/redoc`

## API Endpoints

### Available Endpoints

- `GET /` - Root endpoint with welcome message
- `GET /health` - Health check endpoint

### Example Usage

#### Check API Status

```bash
curl -X GET "http://localhost:8000/"
```

#### Health Check

```bash
curl -X GET "http://localhost:8000/health"
```

## Project Structure

```
server/
├── main.py              # Main FastAPI application
├── requirements.txt     # Python dependencies
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## Development

### Adding New Endpoints

1. Add endpoint functions in `main.py`
2. Update this README with new endpoint documentation

### Environment Variables

Create a `.env` file in the server directory for environment-specific configurations:

```env
# API configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True
```

## Next Steps

- [ ] Add meeting summarization endpoints
- [ ] Implement AI-powered summarization logic
- [ ] Add database integration for persistent storage
- [ ] Add file upload support for meeting transcripts
- [ ] Implement authentication and authorization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test your changes
5. Submit a pull request

## License

This project is part of CMPT 475 Group 2 coursework.
