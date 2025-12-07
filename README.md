#  Capping Project: SumurAI - AI-Powered Meeting Summarizer

##  Team Members
| Name | Role | Email |
|------|------|--------|
| Harris Lichstein | Project Manager | harris.lichstein@gmail.com |
| Joshua Chenoweth | Backend Developer - AI Integration | jgc50903@gmail.com |
| Marko Pavic | Backend Developer - AI Integration and DB implmentation | markopavic7777@gmail.com |
| Stefano Farro | Frontend Developer - UI/UX | stefanogfarro@gmail.com |
| Evan Brown | Frontend Developer - Base AI Integration | evan.brown2@marist.edu |

---

##  Project Overview

### Abstract
SumurAI is an AI-powered meeting analysis platform that transforms audio recordings into actionable insights. The system automatically transcribes meetings with speaker identification, generates structured summaries using local AND remote LLMs, extracts action items with speaker delegation, and enables conversational Q&A about meeting content. Built with Next.js, FastAPI, and Supabase, SumurAI combines cloud services (Groq Whisper, AssemblyAI) with local AI processing (Ollama) to deliver a cost-effective, privacy-conscious solution. The platform features PDF export capabilities, speaker mapping, conversation history management, and supports multiple audio formats (MP3, WAV, MP4, M4A, FLAC).

### Motivation
Meeting recordings contain valuable information but reviewing hours of audio is time-consuming and inefficient. Professionals spend significant time taking notes during meetings, often missing key details while trying to document discussions. Existing transcription services are expensive, require cloud processing of sensitive data, and lack intelligent analysis capabilities. SumurAI addresses these challenges by providing free, unlimited AI-powered summarization through local processing while offering fast, accurate cloud-based transcription with speaker identification.

### Objectives
- **Automated Transcription**: Convert meeting audio to text with high accuracy and speaker identification
- **AI Summarization**: Generate structured summaries with key takeaways and main discussion topics
- **Action Item Extraction**: Automatically identify and delegate tasks to specific meeting participants
- **Conversational Interface**: Enable natural language Q&A about meeting content
- **Speaker Management**: Identify speakers and map anonymous speaker IDs to real names
- **Export Capabilities**: Generate professional PDF reports of transcripts, summaries, and action items
- **Cost-Effective Processing**: Utilize local LLMs (Ollama) for unlimited free summarization
- **Privacy-Conscious**: Support local processing options to protect sensitive meeting data

### Scope
**Included:**
- Audio/video file upload and processing (MP3, WAV, MP4, M4A, FLAC)
- Automatic transcription with Groq Whisper API and local Whisper fallback
- Speaker diarization using AssemblyAI and pyannote.audio
- AI-powered summarization using Ollama (local LLM)
- Action item extraction and speaker delegation
- Conversational chatbot for meeting Q&A
- Speaker name mapping and management
- Meeting dashboard with search and filtering
- PDF export for summaries, transcripts, and action items
- User authentication and authorization
- Cloud storage for audio files and user data

---

##  Background and Research

Meeting transcription and analysis tools have evolved significantly with AI advancements. Existing solutions fall into several categories:

**Commercial Services** (Otter.ai, Rev.ai, Fireflies.ai):
- Pros: High accuracy, real-time transcription, enterprise features
- Cons: Expensive subscription models, privacy concerns with cloud processing, limited free tiers

**Open Source Solutions** (OpenAI Whisper, Vosk):
- Pros: Free, privacy-focused, self-hosted options
- Cons: Require technical expertise, lack speaker identification, no intelligent summarization

**Research Gaps Addressed:**
1. **Cost Barrier**: Most AI summarization services charge per-minute or require expensive subscriptions. SumurAI uses local Ollama processing for unlimited free summarization.
2. **Privacy Concerns**: Cloud-only solutions require uploading sensitive meeting data. SumurAI offers hybrid approach with local AI processing options.
3. **Speaker Attribution**: Many transcription tools lack accurate speaker identification. SumurAI combines AssemblyAI's fast cloud diarization with local pyannote.audio for flexible speaker identification.
4. **Actionable Intelligence**: Simple transcription isn't enough. SumurAI extracts action items, delegates tasks to speakers, and enables conversational Q&A.

**Key Technologies Referenced:**
- OpenAI Whisper: State-of-the-art speech recognition model
- Groq Whisper API: Ultra-fast cloud Whisper implementation
- AssemblyAI: Speaker diarization and transcription service
- Ollama: Local LLM runtime for privacy-focused AI processing
- pyannote.audio: Speaker diarization toolkit

---

##  System Design and Architecture

### Functional Requirements
**User Management:**
- Users can register accounts with email and password
- Users can log in securely with Supabase built in authentication
- Users can upload and manage profile avatars
- Users can delete their accounts and associated data

**Audio Processing:**
- System accepts audio/video uploads in multiple formats (MP3, WAV, MP4, M4A, FLAC)
- System automatically compresses large audio files (>25MB) for API compatibility
- System transcribes audio using Groq Whisper API with local fallback
- System identifies individual speakers in multi-person meetings using assemblyAI
- Users can map anonymous speaker IDs to real names

**AI Analysis:**
- System generates structured summaries with key takeaways and main topics
- System extracts action items from meeting transcriptions
- System assigns action items to specific speakers
- Users can ask questions about meeting content via chatbot
- System maintains conversation history for each meeting

**Meeting Management:**
- Users can view all meetings in a dashboard interface
- Users can search and filter meetings
- Users can export summaries, transcripts, and action items as PDFs
- System stores meeting audio files in cloud storage

### Non-Functional Requirements
**Performance:**
- Transcription completes quickly when combined with cloud LLM's.
- Groq API provides ultra-fast transcription (<30 seconds for 10-minute audio)
- AssemblyAI provides lightning fast diarization (Transcribes and tags with completion at groq's rate)
- Summary generation completes within 1-2 minutes
- Web interface loads in <3 seconds
- Audio compression reduces file sizes by 60-80% while maintaining quality

**Security:**
- JWT-based authentication with secure token storage
- Row-level security (RLS) on Supabase database
- API keys managed via environment variables
- Protected API routes require authentication
- HTTPS for all production deployments
- Secure file upload validation and sanitization

**Usability:**
- Responsive web interface supporting desktop and mobile browsers
- User friendly upload features
- Real-time progress indicators for long-running operations
- Clear error messages and user feedback

**Scalability:**
- Supabase PostgreSQL handles thousands of users
- Cloud storage supports unlimited audio file uploads
- Stateless FastAPI backend enables horizontal scaling
- Next.js frontend optimized for Render Deployment

**Maintainability:**
- TypeScript for type-safe frontend code
- Modular architecture with separated concerns (auth, transcription, summarization)
- Comprehensive API documentation with Swagger/OpenAPI
- Environment-based configuration management

### Use Cases / User Stories

**UC-1: Upload and Transcribe Meeting**
- **Actor**: Meeting Participant
- **Goal**: Convert recorded meeting audio to text
- **Flow**:
  1. User uploads meeting audio file (MP3, WAV, etc.)
  2. System validates file format and size
  3. System compresses large files if needed
  4. System transcribes audio using Groq Whisper API, or with Assembly AI for tagging
  5. User reviews transcription with speaker labels (Speaker 0, Speaker 1, etc.)
  6. User maps speaker IDs to real names
  7. System updates transcription with named speakers

**UC-2: Generate AI Summary**
- **Actor**: Team Lead
- **Goal**: Get quick overview of meeting key points
- **Flow**:
  1. User selects transcribed meeting
  2. User clicks "Generate Summary"
  3. System processes transcription with Ollama LLM
  4. System generates structured summary with:
     - Key takeaways
     - Main discussion topics
     - Important decisions made
  5. User reviews and exports summary as PDF

**UC-3: Extract Action Items**
- **Actor**: Project Manager
- **Goal**: Identify tasks and assign to team members
- **Flow**:
  1. User requests action item extraction
  2. System analyzes transcription for actionable tasks
  3. System assigns items to specific speakers based on context
  4. User reviews action items with speaker delegation
  5. User exports action items as PDF for distribution

**UC-4: Ask Questions About Meeting**
- **Actor**: Employee (unable to attend meeting)
- **Goal**: Get specific information without reviewing entire transcript
- **Flow**:
  1. User opens meeting chatbot interface
  2. User asks question: "What was decided about the budget?"
  3. System uses LLM to answer based on meeting content
  4. User asks follow-up questions
  5. System maintains conversation context for coherent dialogue

### System Architecture



### Technology Stack

|Layer|Technology|Version|
|-----|----------|-------|
|**Frontend**|Next.js|15.5.4|
||React|19.1.0|
||TypeScript|5.x|
||Tailwind CSS|4.x|
||Shad CN|Latest|
|**Backend**|FastAPI|0.115.6|
||Python|3.12|
||Uvicorn|0.32.1|
||Pydantic|2.10.3|
|**Database**|Supabase (PostgreSQL)|Latest|
||Supabase Storage|Latest|
||Supabase Auth|Latest|
|**AI/ML**|Groq Whisper API|whisper-large-v3-turbo|
||AssemblyAI|0.28.0+|
||Ollama|llama3.2:1b (local)|
||OpenAI Whisper|faster-whisper|
||PyTorch|2.9.0|
||pyannote.audio|4.0.1+|
|**Tools**|Git/GitHub|Version Control|
||pydub|Audio Processing|
||jsPDF|PDF Generation|
||react-markdown|Markdown Rendering|

---

## Data Design

### Database Schema

**users** (Supabase Auth managed)
- id (UUID, PK)
- email (string, unique)
- created_at (timestamp)
- display_name (string, nullable)
- avatar_url (string, nullable)

**meetings**
- id (UUID, PK)
- user_id (UUID, FK → users.id)
- title (string)
- audio_file_url (string)
- compressed_file_url (string, nullable)
- transcription_text (text)
- summary_text (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)

**speakers**
- id (UUID, PK)
- meeting_id (UUID, FK → meetings.id)
- speaker_id (string) - e.g., "Speaker 0", "Speaker 1"
- speaker_name (string, nullable) - user-mapped name
- created_at (timestamp)

**conversations**
- id (UUID, PK)
- user_id (UUID, FK → users.id)
- meeting_id (UUID, FK → meetings.id)
- title (string)
- is_archived (boolean, default: false)
- created_at (timestamp)
- updated_at (timestamp)

**messages**
- id (UUID, PK)
- conversation_id (UUID, FK → conversations.id)
- role (enum: 'user', 'assistant')
- content (text)
- created_at (timestamp)

**action_items**
- id (UUID, PK)
- meeting_id (UUID, FK → meetings.id)
- speaker_id (UUID, FK → speakers.id, nullable)
- description (text)
- priority (enum: 'high', 'medium', 'low', nullable)
- created_at (timestamp)

**Profiles**
- Schema Definition
- Table: profiles
- Column	Type	Constraints / Notes
- id	uuid	Primary Key, FK → auth.users.id
- name	text	Optional display name
- email	text	Duplicates auth email for convenience
- avatar_url	text	URL to profile image
- updated_at	timestamptz	Last profile update
- role	text	e.g., “admin”, “member”, “manager”
- location	text	User geographic/city info
- membership_type	text	e.g., “free”, “premium”
- created_at	timestamptz	Profile creation timestamp
- first_name	text	Optional
- last_name	text	Optional
- phone	text	Optional
- job_title	text	Optional
- company	text	Optional
- bio	text	User biography

### External APIs and Datasets

**Groq API**
- **Purpose**: Fast cloud transcription using Whisper-large-v3-turbo
- **Rate Limits**: Free tier with generous limits
- **Data**: Audio files (auto-compressed to <25MB)

**AssemblyAI API**
- **Purpose**: Speaker diarization (speaker identification)
- **Rate Limits**: Pay-as-you-go or subscription
- **Data**: Audio files for speaker analysis

**Ollama (Local)**
- **Purpose**: Local LLM processing for summarization and chat
- **Models**: llama3.2:1b (default), configurable
- **Data**: No external data sent - fully local processing

---

## Implementation Details

### Development Methodology

**Agile Development Process:**
- **Sprint Duration**: 1-2 week sprints
- **Version Control**: GitHub with feature branch workflow
- **Pull Requests**: Code review required before merging to main
- **Issue Tracking**: GitHub Issues for bugs and feature requests
- **Collaboration**: Regular team standups and async communication

**Development Workflow:**
1. Feature planning and issue creation
2. Feature branch development
3. Local testing and validation
4. Pull request submission
5. Code review and feedback
6. Merge to main branch
7. Integration testing

### Core Features

**1. Hybrid Transcription System**
- Primary: Groq Whisper API for ultra-fast cloud transcription
- Fallback: Local faster-whisper for offline capability
- Automatic audio compression for API compatibility
- Support for multiple audio formats (MP3, WAV, MP4, M4A, FLAC)
- Located in: [server/transcription/](server/transcription/)

**2. Speaker Diarization**
- Cloud option: AssemblyAI for fast, accurate speaker identification
- Local option: pyannote.audio for privacy-focused processing
- Speaker name mapping interface for user customization
- Speaker-specific action item delegation
- Located in: [server/transcription/SpeakerDiarization.py](server/transcription/SpeakerDiarization.py)

**3. AI Summarization**
- Local Ollama LLM processing (free, unlimited)
- Structured summaries with key takeaways
- Customizable prompt engineering
- No cloud costs or API limits
- Located in: [server/summarization/Summarization_Service.py](server/summarization/Summarization_Service.py)

**4. Action Item Extraction**
- AI-powered task identification from transcripts
- Automatic speaker assignment based on context
- Priority classification (high, medium, low)
- Integration with speaker mapping
- Located in: [server/main.py](server/main.py) (endpoints: /extract-action-items)

**5. Conversational Chat**
- Context-aware Q&A about meeting content
- Conversation history management
- Multiple conversations per meeting
- Archive and search functionality
- Located in: [sumurai/components/ai-chat/](sumurai/components/ai-chat/)

**6. PDF Export**
- Generate professional reports for:
  - Meeting transcriptions
  - AI summaries
  - Action items with speaker assignments
- Client-side PDF generation using jsPDF
- Located in: [sumurai/lib/services/output-download.ts](sumurai/lib/services/output-download.ts)

**7. Authentication & Authorization**
- Supabase Auth with JWT tokens
- Protected API routes with middleware
- Row-level security (RLS) on database
- Secure session management
- Located in: [server/auth/](server/auth/), [sumurai/lib/context/auth-context.tsx](sumurai/lib/context/auth-context.tsx)

### API Documentation

**Base URL**: `http://localhost:8000` (development)
**Interactive Docs**: `http://localhost:8000/docs` (Swagger UI)

#### Audio Processing
```http
POST /transcribe
Content-Type: multipart/form-data

Body: { audio_file: File }
Response: { text: string, transcription_id: string }
```

```http
POST /transcribe-with-speakers
Content-Type: multipart/form-data

Body: { audio_file: File, use_assemblyai: boolean }
Response: {
  text: string,
  segments: Array<{ speaker: string, text: string, start: number, end: number }>,
  speakers: Array<{ speaker_id: string }>
}
```

#### AI Processing
```http
GET /ollama/status
Response: { status: string, available_models: string[] }
```

```http
POST /summarize
Content-Type: application/json

Body: { transcription: string }
Response: { summary: string }
```

```http
POST /chat
Content-Type: application/json

Body: {
  message: string,
  meeting_context: string,
  conversation_history: Array<{ role: string, content: string }>
}
Response: { response: string }
```

```http
POST /extract-action-items
Content-Type: application/json

Body: { transcription: string }
Response: {
  action_items: Array<{ description: string, priority: string }>
}
```

#### Meetings & Conversations
```http
GET /meetings/{meeting_id}/speakers
Response: { speakers: Array<{ speaker_id: string, speaker_name: string }> }
```

```http
POST /meetings/{meeting_id}/speaker-mappings
Content-Type: application/json

Body: { mappings: { [speaker_id: string]: string } }
Response: { success: boolean }
```

```http
GET /conversations
Response: { conversations: Array<Conversation> }
```

```http
POST /conversations
Content-Type: application/json

Body: { title: string, meeting_id: string }
Response: { conversation_id: string }
```

#### Authentication
```http
POST /auth/register
Content-Type: application/json

Body: { email: string, password: string }
Response: { user: User, session: Session }
```

```http
POST /auth/login
Content-Type: application/json

Body: { email: string, password: string }
Response: { user: User, session: Session }
```

Full API documentation available at `/docs` endpoint.

### Repository Structure
```
CMPT475-Group2-Meeting-Summarizer
 ┣ sumurai/                          # Frontend (Next.js)
 ┃ ┣ app/                           # Next.js app directory
 ┃ ┃ ┣ page.tsx                     # Root page
 ┃ ┃ ┣ layout.tsx                   # Main layout
 ┃ ┃ ┣ landing.tsx                  # Landing page
 ┃ ┃ ┣ core/                        # Main app page
 ┃ ┃ ┣ about/                       # About page
 ┃ ┃ ┗ profiling/                   # User profile
 ┃ ┣ components/                    # React components
 ┃ ┃ ┣ ui/                          # Radix UI components
 ┃ ┃ ┣ ai-chat/                     # Chat interface
 ┃ ┃ ┣ transcription/               # Transcription display
 ┃ ┃ ┣ Header.tsx
 ┃ ┃ ┣ Footer.tsx
 ┃ ┃ ┣ AuthDialog.tsx               # Authentication modal
 ┃ ┃ ┗ ProtectedRoute.tsx           # Route protection
 ┃ ┣ lib/                           # Utilities & services
 ┃ ┃ ┣ context/                     # React context
 ┃ ┃ ┣ services/                    # API services
 ┃ ┃ ┗ utils.ts                     # Helper functions
 ┃ ┣ package.json                   # Frontend dependencies
 ┃ ┣ tsconfig.json                  # TypeScript config
 ┃ ┣ next.config.ts                 # Next.js config
 ┃ ┣ tailwind.config.ts             # Tailwind CSS config
 ┃ ┗ .env.local                     # Frontend environment vars
 ┃
 ┣ server/                           # Backend (FastAPI)
 ┃ ┣ main.py                        # FastAPI application (2100+ lines)
 ┃ ┣ requirements.txt               # Python dependencies
 ┃ ┣ README.md                      # Server setup guide
 ┃ ┣ TRANSCRIPTION_SETUP.md         # Transcription configuration
 ┃ ┣ .env                           # Backend environment vars
 ┃ ┣ auth/                          # Authentication module
 ┃ ┃ ┣ routes.py                    # Auth endpoints
 ┃ ┃ ┣ service.py                   # Auth business logic
 ┃ ┃ ┣ dependencies.py              # Auth middleware
 ┃ ┃ ┗ supabase_auth_service.py    # Supabase integration
 ┃ ┣ transcription/                 # Transcription module
 ┃ ┃ ┣ Transcription.py             # Base service
 ┃ ┃ ┣ Groq_Transcription.py        # Groq Whisper
 ┃ ┃ ┣ Local_Whisper.py             # Local Whisper
 ┃ ┃ ┣ AssemblyAI_Transcription.py  # AssemblyAI
 ┃ ┃ ┣ SpeakerDiarization.py        # Speaker ID
 ┃ ┃ ┗ audio_utils.py               # Audio processing
 ┃ ┣ summarization/                 # Summarization module
 ┃ ┃ ┗ Summarization_Service.py    # Ollama service
 ┃ ┣ database/                      # Database module
 ┃ ┃ ┗ supabase_service.py         # Supabase client
 ┃ ┗ SystemSafetyTests/             # Testing directory
 ┃
 ┣ README.md                        # This file
 ┗ .gitignore                       # Git ignore rules
```

---

## Testing and Quality Assurance

### Testing Approach

**Unit Testing:**
- Backend: Python unit tests for individual service functions
- Focus areas: Authentication, transcription service, API endpoints

**Integration Testing:**
- End-to-end API testing for complete workflows
- Database integration tests with Supabase
- External API integration tests (Groq, AssemblyAI)

**Manual Testing:**
- User acceptance testing for UI/UX flows
- Cross-browser compatibility testing
- Audio file format validation
- Speaker mapping workflow testing

**System Safety Testing:**
- Security vulnerability scanning
- API rate limit handling

### Sample Test Cases

|Test ID|Description|Input|Expected Output|Result|
|-------|-----------|-----|---------------|------|
|TC-01|User registration with valid credentials|email: test@example.com, password: SecurePass123|Account created, session token returned|Pass|
|TC-02|Upload MP3 audio file|10MB MP3 file|File uploaded, transcription initiated|Pass|
|TC-03|Transcribe with Groq API|Valid audio file|Transcription text returned within 60s|Pass|
|TC-04|Speaker diarization|Multi-speaker audio|Segments labeled with speaker IDs|Pass|
|TC-05|Generate summary via Ollama|Valid transcription text|Structured summary with key points|Pass|
|TC-06|Extract action items|Meeting transcription|List of actionable tasks identified|Pass|
|TC-07|Map speaker names|speaker_id: "Speaker 0", name: "John"|Transcription updated with real names|Pass|
|TC-08|Chat about meeting|"What was decided?"|Relevant answer based on content|Pass|
|TC-09|Export PDF|Meeting summary|PDF file downloaded successfully|Pass|
|TC-10|Protected route access|Unauthenticated request|401 Unauthorized error|Pass|

### Tools

**Backend Testing:**
- PyTest (Python testing framework)
- Manual API testing with Swagger UI

**Frontend Testing:**
- Browser DevTools for debugging

**Code Quality:**
- TypeScript for type safety

---

## Deployment

This project contains both a frontend application and a Python FastAPI backend API. Each can be deployed independently or together, depending on your infrastructure needs. Deployment was done with Render


## Frontend Setup & Installation
1. Clone the repository
```
git clone <repository-url>
cd <project-folder>
```
2. Install dependencies
```
npm install
```
or
```
pnpm install
```
3. Run the frontend
```
npm run dev
```
## Backend Setup & Installation
1. Navigate to backend folder
```
cd server
```
2. Create a virtual environment (recommended)
```
python3.12 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
```
3. Install dependencies
```
pip install -r requirements.txt
```
Running the Backend API

Start the API using your virtual environment.

Option A: Run via Python
```
source venv/bin/activate
python main.py
```
Option B: Run via Uvicorn (recommended for development)
```
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
API Access

Base URL: http://localhost:8000

Swagger Docs: http://localhost:8000/docs

##  Results and Evaluation

|Goal|Status|Evidence|
|----|------|--------|
|Implement audio transcription|Complete|Groq + local Whisper working, tested with multiple formats|
|Speaker identification|Complete|AssemblyAI + pyannote.audio implemented, speaker mapping UI functional|
|AI summarization|Complete|Ollama integration working, generates structured summaries|
|Action item extraction|Complete|AI extracts and delegates tasks to speakers|
|Conversational chat|Complete|Q&A chatbot functional with conversation history|
|User authentication|Complete|Supabase Auth integrated, JWT tokens working|
|PDF export|Complete|Export functionality for summaries, transcripts, action items|
|Meeting dashboard|Complete|Dashboard with search, filter, archive features|
|Speaker name mapping|Complete|UI for mapping speaker IDs to real names|
|Audio compression|Complete|Automatic compression for >25MB files|
|Responsive UI|Complete|Mobile and desktop responsive design|
|Cloud deployment|In Progress|Local development complete, production deployment pending|
|Comprehensive testing|Complete|Core functionality tested, expanding test coverage|
|Performance optimization|Complete|Meeting performance targets, ongoing optimization|

**Performance Metrics:**
- Groq Transcription: ~30 seconds for 10-minute audio (30x faster than real-time)
- Local Whisper: ~5-10 minutes for 10-minute audio (close to real-time)
- Summary Generation: 1-2 minutes per meeting
- Speaker Diarization: 1-3 minutes depending on audio length
- Average Page Load: <2 seconds

**User Feedback Highlights:**
- Intuitive speaker mapping interface
- Fast transcription with Groq API
- Valuable action item extraction feature
- Professional PDF export quality
- Easy-to-use chat interface

---

##  Lessons Learned

### Technical Challenges
1. **Audio Compression Balance**: Finding optimal compression settings that reduce file size for API limits while maintaining transcription accuracy required extensive testing.

2. **Speaker Diarization Accuracy**: Different speakers with similar voice characteristics caused misidentification. Implemented hybrid approach with manual speaker name mapping UI to resolve.

3. **LLM Context Window Limits**: Long meeting transcripts exceeded Ollama context limits. Implemented chunking strategy for processing large documents.

4. **Async Processing**: Managing long-running transcription jobs required careful async handling in FastAPI to prevent timeout errors.

5. **PyTorch Dependencies**: Version compatibility between PyTorch, torchaudio, and pyannote.audio required specific version pinning (PyTorch 2.9.0, pyannote.audio 4.0.1).

### Project Management Takeaways

1. **API-First Design**: Designing and documenting API endpoints before implementation improved frontend-backend collaboration.

2. **Hybrid Cloud/Local Strategy**: Combining cloud services (speed) with local processing (privacy, cost) provided best of both worlds.

3. **User Testing Early**: Getting feedback on speaker mapping UI early prevented costly redesigns later.

### Recommendations for Future Teams
1. **Start with Authentication**: Implement user authentication and database schema first - everything else builds on this foundation.

2. **API Documentation**: Maintain Swagger docs from day one - saves time explaining endpoints to frontend team.

3. **Environment Configuration**: Use environment templates and document all required API keys clearly to avoid setup confusion.

4. **Test with Real Data**: Use actual meeting recordings early to identify edge cases (background noise, overlapping speakers, accents).

5. **Performance Budget**: Set performance targets early (transcription speed, summary generation time) and measure regularly.

---

##  Future Work

### Planned Enhancements
**Phase 1 (Short-term):**
- Real-time meeting transcription with WebSocket streaming
- Multi-language support (Spanish, French, Mandarin)
- Advanced analytics dashboard (meeting duration, speaker talk time, sentiment analysis)
- Calendar integration (Google Calendar, Outlook) for automatic meeting scheduling
- Email notifications for action item assignments
- Enhanced PDF templates with custom branding

**Phase 2 (Medium-term):**
- Video analysis for slides and screen shares
- Integration with collaboration tools (Slack, Microsoft Teams, Discord)
- Custom LLM fine-tuning on domain-specific meetings
- Meeting templates for different meeting types (standup, retrospective, interview)
- Advanced search with semantic search capabilities

**Phase 3 (Long-term):**
- Enterprise features:
  - SSO integration (Okta, Azure AD)
  - Team workspaces and permissions
  - Admin dashboard with usage analytics
  - Audit logs and compliance reporting
- AI coaching features:
  - Meeting effectiveness scoring
  - Speaking time balance recommendations
  - Sentiment analysis and engagement metrics
- API webhooks for third-party integrations
- White-label solution for enterprise customization

### Features Not Yet Implemented
- **Live Transcription**: Real-time streaming transcription during ongoing meetings
- **Multi-language**: Support for languages beyond English
- **Video Processing**: Analysis of visual content (slides, screen shares, facial expressions)
- **Automated Meeting Scheduling**: AI-suggested meeting times based on participant availability
- **Meeting Analytics**: Aggregate insights across multiple meetings (trends, patterns, productivity metrics)
- **Custom Vocabulary**: Domain-specific terminology training for improved accuracy
- **Meeting Templates**: Pre-configured settings for different meeting types

### Potential Research Extensions
- **Emotion Detection**: Analyze speaker tone and sentiment throughout meetings
- **Automatic Meeting Notes**: Generate formatted meeting minutes with sections (agenda, discussion, decisions, action items)
- **Predictive Action Items**: Suggest potential action items before meeting concludes
- **Meeting Effectiveness AI**: Score meetings on productivity factors and suggest improvements
- **Cross-Meeting Insights**: Track action item completion rates and project progress across multiple meetings
- **Accessibility Features**: Automatic closed captioning, sign language avatar integration

---

##  Appendices

### User Manual
See [server/README.md](server/README.md) for detailed backend setup instructions.
See [server/TRANSCRIPTION_SETUP.md](server/TRANSCRIPTION_SETUP.md) for transcription service configuration.

### Installation Guide
Refer to **Setup and Installation** section above for complete installation instructions.

### Test Report
Test results documented in **Testing and Quality Assurance** section.
System safety tests located in [server/SystemSafetyTests/](server/SystemSafetyTests/).

### Ethical and Privacy Considerations

**Data Privacy:**
- Cloud transcription services (Groq, AssemblyAI) used only with user consent
- Users own all meeting data with full export capabilities
- Supabase Row-Level Security (RLS) ensures users can only access their own data

**Consent and Transparency:**
- Clear disclosure of which services process data in cloud vs. locally
- Users control speaker name mapping and action item assignments
- Option to delete all meeting data and account permanently

**Accessibility:**
- Transcription benefits hearing-impaired users
- Text-based summaries enable multiple consumption modes

**Potential Misuse Mitigation:**
- Users responsible for obtaining necessary recording permissions
- No unauthorized surveillance or covert recording features
- Meeting data stored securely with access controls

**Bias Considerations:**
- Speaker diarization may struggle with similar-sounding voices and overlapping audio

---

##  References

**AI/ML Technologies:**
1. OpenAI Whisper: https://github.com/openai/whisper
2. Groq API Documentation: https://console.groq.com/docs
3. AssemblyAI Documentation: https://www.assemblyai.com/docs
4. Ollama: https://ollama.ai
5. pyannote.audio: https://github.com/pyannote/pyannote-audio

**Frameworks and Libraries:**
6. Next.js Documentation: https://nextjs.org/docs
7. FastAPI Documentation: https://fastapi.tiangolo.com
8. Supabase Documentation: https://supabase.com/docs
9. Tailwind CSS: https://tailwindcss.com

**Tools:**
10. pydub Audio Processing: https://github.com/jiaaro/pydub

---

##  Acknowledgments

Thanks to our team members Harris Lichstein, Joshua Chenoweth, Stefano Farro, Evan Brown, and Marko Pavic for their dedication and collaboration throughout this capstone project.

Special thanks to the open-source community for providing the incredible tools and frameworks that made this project possible:
- OpenAI for Whisper speech recognition
- Groq for blazing-fast API inference
- AssemblyAI for speaker diarization technology
- Ollama team for local LLM runtime
- Next.js and Vercel teams
- FastAPI and Pydantic communities
- Supabase for comprehensive backend infrastructure

---

##  Project Timeline

|Milestone|Deliverable|Date|
|---------|-----------|----|
|Project Kickoff|Team Formation & Idea Selection|Sept 1 - Sept 10|
|Proposal Approved|Problem Statement & Technical Plan|Sept 10 - Sept 15|
|Sprint 1|Requirements Gathering & Planning|Sept 15 - Sept 30|
|Sprint 2|Designing UX/UI Environment & Wireframe|Oct 1 - Oct 15|
|Sprint 3|Core Summarizing Engine Development|Oct 16 - Oct 27|
|Sprint 4|Data Security & Authentication|Oct 28 - Oct 31|
|Sprint 5|Integration & QA|Nov 1 - Nov 15|
|Sprint 6|User Feedback & Bug Fixes|Nov 16 - Nov 30|
|Sprint 7|Overall Project Polishing|Dec 1 - Dec 7|
|Final Submission|Complete System & Documentation|Dec 10|
|Project Showcase|Presentation|Dec 12|

---

##  Version History

- **v0.1.0** (Current) - Initial release with core features
  - Audio transcription (Assembly, Groq, and local Whisper)
  - Speaker diarization and mapping
  - AI summarization
  - Action item extraction
  - Conversational chat interface
  - PDF export capabilities
  - User authentication and meeting dashboard

---

> **Tip**: All supporting documentation is in the [/server](server/) folder. For setup help, see [server/README.md](server/README.md) and [server/TRANSCRIPTION_SETUP.md](server/TRANSCRIPTION_SETUP.md).

**Repository**: https://github.com/HarrisLich/CMPT475-Group2-Meeting-Summarizer
