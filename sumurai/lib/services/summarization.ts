// sumurai/lib/services/summarization.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  error?: string;
}

export interface ChatResponse {
  success: boolean;
  response: string;
  model_used: string;
  error?: string;
}

export class SummarizationService {
  /**
   * Transcribe audio file using Whisper
   */
  static async transcribeAudio(audioFile: File): Promise<TranscriptionResponse> {
    const formData = new FormData();
    formData.append('audio_file', audioFile);

    const response = await fetch(`${API_URL}/transcribe`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Summarize transcription using Ollama
   */
  static async summarizeText(transcriptionText: string): Promise<SummarizationResponse> {
    const response = await fetch(`${API_URL}/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcription_text: transcriptionText,
      }),
    });

    if (!response.ok) {
      throw new Error(`Summarization failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Chat conversationally about a meeting
   */
  static async chatWithMeeting(
    meetingContext: string,
    userQuestion: string
  ): Promise<ChatResponse> {
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        meeting_context: meetingContext,
        user_question: userQuestion,
      }),
    });

    if (!response.ok) {
      throw new Error(`Chat failed: ${response.statusText}`);
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
}
