// sumurai/lib/services/summarization.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Custom error class for rate limit errors
 */
export class RateLimitError extends Error {
  retryAfter: string;

  constructor(message: string, retryAfter: string = '60 seconds') {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export interface TranscriptionResponse {
  transcription: string;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  language?: string;
  filename?: string;
}

export interface SummarizationResponse {
  success: boolean;
  summary: string;
  model_used: string;
  transcription_length: number;
  action_items?: Array<{
    task: string;
    priority?: string;
    assigned_to?: string;
  }>;
  error?: string;
  error_type?: string;
  warning?: string;
}

export interface ChatResponse {
  success: boolean;
  response: string;
  model_used: string;
  error?: string;
  error_type?: string;
}

export interface ActionItemsResponse {
  success: boolean;
  action_items: Array<{
    task: string;
    priority: string;
    assigned_to: string;
  }>;
  model_used: string;
  error?: string;
  error_type?: string;
  warning?: string;
}

export class SummarizationService {
  /**
   * Transcribe audio file using Whisper
   */
  static async transcribeAudio(audioFile: File, userId?: string): Promise<TranscriptionResponse> {
    const formData = new FormData();
    formData.append('audio_file', audioFile);

    // Add user_id if provided
    if (userId) {
      formData.append('user_id', userId);
    }

    const response = await fetch(`${API_URL}/transcribe`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      // Try to parse detailed error message from backend
      try {
        const errorData = await response.json();

        // Check for rate limit error (429)
        if (response.status === 429) {
          const retryAfter = errorData.detail?.retry_after || '60 seconds';
          const message = errorData.detail?.message || 'API rate limit exceeded. Please wait before trying again.';
          throw new RateLimitError(message, retryAfter);
        }

        // If backend sent structured error (file too large, etc.)
        if (errorData.detail && typeof errorData.detail === 'object') {
          const { message, suggestion } = errorData.detail;
          throw new Error(`${message}\n\n${suggestion || ''}`);
        }

        // If backend sent string error
        if (errorData.detail && typeof errorData.detail === 'string') {
          throw new Error(errorData.detail);
        }
      } catch (parseError) {
        // If it's already a RateLimitError, re-throw it
        if (parseError instanceof RateLimitError) {
          throw parseError;
        }
        // If parsing fails, fall back to generic error
      }

      throw new Error(`Transcription failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Summarize transcription using Ollama
   */
  static async summarizeText(transcriptionText: string, userId?: string): Promise<SummarizationResponse> {
    const response = await fetch(`${API_URL}/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcription_text: transcriptionText,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      // Try to parse detailed error message from backend
      try {
        const errorData = await response.json();

        // Check for rate limit error (429)
        if (response.status === 429) {
          const retryAfter = errorData.detail?.retry_after || '60 seconds';
          const message = errorData.detail?.message || 'API rate limit exceeded. Please wait before trying again.';
          throw new RateLimitError(message, retryAfter);
        }

        // If backend sent string error
        if (errorData.detail && typeof errorData.detail === 'string') {
          throw new Error(errorData.detail);
        }
      } catch (parseError) {
        // If it's already a RateLimitError, re-throw it
        if (parseError instanceof RateLimitError) {
          throw parseError;
        }
      }

      throw new Error(`Summarization failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Chat conversationally about a meeting
   */
  static async chatWithMeeting(
    meetingContext: string,
    userQuestion: string,
    conversationId?: string,
    userId?: string
  ): Promise<ChatResponse> {
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        meeting_context: meetingContext,
        user_question: userQuestion,
        conversation_id: conversationId,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      // Try to parse detailed error message from backend
      try {
        const errorData = await response.json();

        // Check for rate limit error (429)
        if (response.status === 429) {
          const retryAfter = errorData.detail?.retry_after || '60 seconds';
          const message = errorData.detail?.message || 'API rate limit exceeded. Please wait before trying again.';
          throw new RateLimitError(message, retryAfter);
        }

        // If backend sent string error
        if (errorData.detail && typeof errorData.detail === 'string') {
          throw new Error(errorData.detail);
        }
      } catch (parseError) {
        // If it's already a RateLimitError, re-throw it
        if (parseError instanceof RateLimitError) {
          throw parseError;
        }
      }

      throw new Error(`Chat failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Extract structured action items from a meeting transcription
   */
  static async extractActionItems(transcriptionText: string): Promise<ActionItemsResponse> {
    const response = await fetch(`${API_URL}/extract-action-items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcription_text: transcriptionText,
      }),
    });

    if (!response.ok) {
      // Try to parse detailed error message from backend
      try {
        const errorData = await response.json();

        // Check for rate limit error (429)
        if (response.status === 429) {
          const retryAfter = errorData.detail?.retry_after || '60 seconds';
          const message = errorData.detail?.message || 'API rate limit exceeded. Please wait before trying again.';
          throw new RateLimitError(message, retryAfter);
        }

        // If backend sent string error
        if (errorData.detail && typeof errorData.detail === 'string') {
          throw new Error(errorData.detail);
        }
      } catch (parseError) {
        // If it's already a RateLimitError, re-throw it
        if (parseError instanceof RateLimitError) {
          throw parseError;
        }
      }

      throw new Error(`Action item extraction failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Ask follow-up question about a meeting summary
   * @deprecated Use chatWithMeeting instead for better conversational responses
   */
  static async askFollowUpQuestion(
    originalSummary: string,
    question: string
  ): Promise<SummarizationResponse> {
    const contextualPrompt = `Based on this meeting summary:\n\n${originalSummary}\n\nAnswer this question: ${question}`;

    return this.summarizeText(contextualPrompt);
  }

  /**
   * Helper to get auth headers with Supabase access token
   */
  private static async getAuthHeaders(): Promise<HeadersInit> {
    // Get the Supabase client (we'll need to import it)
    const { supabase } = await import('./supabase');
    const { data: { session } } = await supabase.auth.getSession();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
      console.log('[AUTH] Using access token for authenticated request');
    } else {
      console.warn('[AUTH] No access token available - request may fail');
    }

    return headers;
  }

  /**
   * Get all conversations for a user
   */
  static async getUserConversations(userId: string): Promise<any[]> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${API_URL}/conversations`, {
      method: 'GET',
      headers,
      credentials: 'include', // Include cookies for session management
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch conversations: ${response.statusText}`);
    }

    const data = await response.json();
    return data.conversations || [];
  }

  /**
   * Get all messages for a specific conversation
   */
  static async getConversationMessages(conversationId: string): Promise<any[]> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch messages: ${response.statusText}`);
    }

    const data = await response.json();
    return data.messages || [];
  }

  /**
   * Get a specific conversation by ID
   */
  static async getConversation(conversationId: string): Promise<any> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${API_URL}/conversations/${conversationId}`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch conversation: ${response.statusText}`);
    }

    const data = await response.json();
    return data.conversation;
  }

  /**
   * Get the meeting transcription for a conversation
   */
  static async getMeetingTranscription(meetingId: string): Promise<any> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${API_URL}/meetings/${meetingId}/transcription`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch transcription: ${response.statusText}`);
    }

    const data = await response.json();
    return data.transcription;
  }
}
