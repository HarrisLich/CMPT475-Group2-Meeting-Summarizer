# Chat History Database Implementation

This document describes the chat history functionality that has been implemented for the Meeting Summarizer application.

## Overview

The chat history system allows users to save and retrieve their conversations with the AI about their meetings. The implementation includes:

- **Conversations**: Track chat sessions between users and the AI
- **Messages**: Store individual messages (user and assistant) within conversations
- **Summaries**: Save AI-generated summaries of meetings

## Database Schema

Based on the Supabase schema visible in your screenshot, the following tables are used:

### conversations
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to auth.users)
- `meeting_id` (uuid, foreign key to meetings)
- `title` (text)
- `model_version` (text) - AI model used
- `total_tokens` (int4) - Total tokens used
- `archived` (bool) - Whether conversation is archived
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### messages
- `id` (uuid, primary key)
- `conversation_id` (uuid, foreign key to conversations)
- `role` (text) - 'user' or 'assistant'
- `content` (text) - Message content
- `token_count` (int4) - Tokens used by this message
- `parent_message_id` (uuid, nullable)
- `created_at` (timestamptz)

### summaries
- `id` (uuid, primary key)
- `meeting_id` (uuid, foreign key to meetings)
- `summary_text` (text)
- `key_points` (text[]) - Array of key points
- `created_at` (timestamptz)

## Backend Implementation

### Database Service Methods

The following methods have been added to [`server/database/supabase_service.py`](server/database/supabase_service.py):

#### Conversation Methods
- `create_conversation(user_id, meeting_id, title, model_version)` - Create a new conversation
- `get_user_conversations(user_id)` - Get all conversations for a user
- `get_conversation_by_id(conversation_id)` - Get a specific conversation
- `update_conversation_title(conversation_id, title)` - Update conversation title
- `archive_conversation(conversation_id, archived)` - Archive/unarchive a conversation

#### Message Methods
- `save_message(conversation_id, role, content, token_count)` - Save a message
- `get_conversation_messages(conversation_id)` - Get all messages in a conversation

#### Summary Methods
- `save_summary(meeting_id, summary_text, key_points)` - Save a meeting summary
- `get_meeting_summary(meeting_id)` - Get summary for a meeting

### API Endpoints

The following REST API endpoints have been added to [`server/main.py`](server/main.py:419-556):

#### Conversation Endpoints
- `POST /conversations` - Create a new conversation
- `GET /conversations` - Get all conversations for authenticated user
- `GET /conversations/{conversation_id}` - Get specific conversation
- `PUT /conversations/{conversation_id}/title` - Update conversation title
- `PUT /conversations/{conversation_id}/archive` - Archive/unarchive conversation

#### Message Endpoints
- `POST /messages` - Save a message to a conversation
- `GET /conversations/{conversation_id}/messages` - Get all messages for a conversation

#### Summary Endpoints
- `POST /summaries` - Save a meeting summary
- `GET /meetings/{meeting_id}/summary` - Get summary for a meeting

All endpoints require authentication via the `get_current_user` dependency.

## Request/Response Models

### ConversationCreate
```python
{
  "meeting_id": "uuid",
  "title": "string",
  "model_version": "string"  # default: "llama3.2:3b"
}
```

### MessageCreate
```python
{
  "conversation_id": "uuid",
  "role": "user" | "assistant",
  "content": "string",
  "token_count": int  # optional
}
```

### SummaryCreate
```python
{
  "meeting_id": "uuid",
  "summary_text": "string",
  "key_points": ["string"]  # optional array
}
```

## Usage Example

### Creating a Conversation
```javascript
const response = await fetch('http://localhost:8000/conversations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    meeting_id: 'uuid-of-meeting',
    title: 'Discussion about Q1 Planning',
    model_version: 'llama3.2:3b'
  })
});
```

### Saving Messages
```javascript
// Save user message
await fetch('http://localhost:8000/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    conversation_id: 'conversation-uuid',
    role: 'user',
    content: 'What were the main action items?'
  })
});

// Save assistant response
await fetch('http://localhost:8000/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    conversation_id: 'conversation-uuid',
    role: 'assistant',
    content: 'The main action items were: 1) Complete database schema...',
    token_count: 42
  })
});
```

### Retrieving Conversation History
```javascript
const response = await fetch('http://localhost:8000/conversations/conversation-uuid/messages', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
});
const { messages } = await response.json();
```

## Frontend Integration

To integrate this with your existing AI chat interface ([`sumurai/components/ai-chat/components/ai-chat.tsx`](sumurai/components/ai-chat/components/ai-chat.tsx)), you'll need to:

1. **On file upload/chat creation**: Call `POST /conversations` to create a conversation record
2. **On each user message**: Call `POST /messages` with `role: "user"`
3. **On each AI response**: Call `POST /messages` with `role: "assistant"`
4. **On summary generation**: Call `POST /summaries` to save the summary
5. **On app load**: Call `GET /conversations` to load user's chat history
6. **On conversation selection**: Call `GET /conversations/{id}/messages` to load messages

## Testing

A test script is available at [`server/test_chat_history.py`](server/test_chat_history.py).

**Note**: The test script requires valid user and meeting UUIDs that exist in your database due to foreign key constraints. In production, these will come from authenticated users and actual meetings.

To manually test the endpoints:
1. Ensure you have valid user authentication
2. Create a meeting first
3. Then create conversations and messages associated with that meeting

## Security Considerations

- All endpoints require authentication via `get_current_user`
- Row Level Security (RLS) policies should be configured in Supabase to ensure users can only access their own conversations
- Consider adding rate limiting for message creation to prevent abuse
- Token counts should be validated to prevent manipulation

## Next Steps

1. **Add RLS policies** in Supabase to secure the tables
2. **Implement frontend integration** to save/load chat history
3. **Add pagination** for conversations and messages (for users with many chats)
4. **Implement conversation search** to help users find specific discussions
5. **Add conversation sharing** if users want to share their meeting insights
6. **Implement token usage tracking** for monitoring and billing purposes

## Database Migrations

If you need to make changes to the schema, you can do so in the Supabase dashboard. The current implementation expects the schema shown in your screenshot with these tables:
- conversations
- messages
- summaries
- meetings
- transcriptions

Make sure all foreign key constraints are properly set up between these tables.
