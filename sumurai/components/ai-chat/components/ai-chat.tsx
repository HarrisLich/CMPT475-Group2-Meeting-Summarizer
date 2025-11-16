"use client";

import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "./sidebar";
import { useChat } from "@ai-sdk/react";
import { WelcomeScreen } from "./welcome-screen";
import { ChatInterface } from "./chat-interface";
import { SummarizationService, RateLimitError, transcribeWithSpeakers, getSpeakerMappings } from "@/lib/services/summarization";
import SpeakerMapping from "@/components/speaker-mapping/speaker-mapping";
import TranscriptionWithSpeakers from "@/components/transcription/transcription-with-speakers";

// Meeting chat objects
interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
  speaker_name?: string;
}

interface ActionItem {
  id: string;
  priority: "high" | "medium" | "low";
  task: string;
  assignedTo: string;
}

interface Chat {
  id: string;
  title: string;
  preview: string;
  timestamp: Date;
  meetingId?: string; // Store meeting_id for fetching speaker mappings
  transcription?: {
    fullText: string;
    segments: TranscriptionSegment[];
    fileName?: string;
  };
  actionItems?: ActionItem[];
}

export default function AiChat() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);

  /**
   * Match action items to speakers based on transcript segments
   * Finds which speaker mentioned each action item by searching segment text
   */
  const assignActionItemsToSpeakers = (
    actionItems: any[],
    segments: TranscriptionSegment[],
    chatId: string
  ): ActionItem[] => {
    return actionItems.map((item, index) => {
      const taskText = item.task || item;
      if (!taskText || typeof taskText !== 'string') {
        return {
          id: `${chatId}-${index}`,
          priority: item.priority || "medium",
          task: taskText,
          assignedTo: item.assigned_to || "Unassigned"
        };
      }

      // Normalize the task text for matching (lowercase, remove punctuation)
      const normalizedTask = taskText.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
      const taskWords = normalizedTask.split(/\s+/).filter(w => w.length > 3); // Only words longer than 3 chars
      
      // If task is too short, use original assigned_to
      if (taskWords.length === 0) {
        return {
          id: `${chatId}-${index}`,
          priority: item.priority || "medium",
          task: taskText,
          assignedTo: item.assigned_to || "Unassigned"
        };
      }

      // Search through segments to find the best match
      let bestMatch: TranscriptionSegment | null = null;
      let bestScore = 0;

      for (const segment of segments) {
        if (!segment.speaker) continue;
        
        const segmentText = segment.text.toLowerCase();
        let score = 0;
        
        // Count how many task words appear in this segment
        for (const word of taskWords) {
          if (segmentText.includes(word)) {
            score += 1;
          }
        }
        
        // Prefer segments with more matching words
        if (score > bestScore) {
          bestScore = score;
          bestMatch = segment;
        }
      }

      // If we found a good match (at least 2 words or 50% of words), use that speaker
      const matchThreshold = Math.max(2, Math.ceil(taskWords.length * 0.5));
      if (bestMatch && bestScore >= matchThreshold) {
        return {
          id: `${chatId}-${index}`,
          priority: item.priority || "medium",
          task: taskText,
          assignedTo: bestMatch.speaker_name || bestMatch.speaker || item.assigned_to || "Unassigned"
        };
      }

      // Fallback to original assigned_to or "Unassigned"
      return {
        id: `${chatId}-${index}`,
        priority: item.priority || "medium",
        task: taskText,
        assignedTo: item.assigned_to || "Unassigned"
      };
    });
  };

  const [currentMessages, setCurrentMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  
  // Speaker diarization states
  const [showSpeakerMapping, setShowSpeakerMapping] = useState(false);
  const [speakersMapped, setSpeakersMapped] = useState(false);
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);

  useEffect(() => {
    // Reset messages when chat changes
    setCurrentMessages([]);
  }, [selectedChatId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input
    };

    setCurrentMessages(prev => [...prev, userMessage]);
    const userQuestion = input;

    // Update chat title if it's the first message
    const currentChat = chats.find(chat => chat.id === selectedChatId);
    if (currentChat && currentChat.title === "New Chat" && currentMessages.length === 0) {
      const newTitle = input.substring(0, 50);
      setChats(prevChats =>
        prevChats.map(chat =>
          chat.id === selectedChatId
            ? { ...chat, title: newTitle, preview: newTitle + "..." }
            : chat
        )
      );
    }

    setInput("");
    setIsLoading(true);

    try {
      // Get the current chat's transcription for context

      // Build context with timestamps if segments are available
      let meetingContext = "";
      if (currentChat?.transcription?.segments && currentChat.transcription.segments.length > 0) {
        // Include timestamped segments for better context
        meetingContext = "Meeting Transcription with Timestamps:\n\n";
        currentChat.transcription.segments.forEach(segment => {
          const startMin = Math.floor(segment.start / 60);
          const startSec = Math.floor(segment.start % 60);
          const endMin = Math.floor(segment.end / 60);
          const endSec = Math.floor(segment.end % 60);
          meetingContext += `[${startMin}:${String(startSec).padStart(2, '0')} - ${endMin}:${String(endSec).padStart(2, '0')}] ${segment.text}\n`;
        });
      } else {
        // Fallback to full text if no segments
        meetingContext = currentChat?.transcription?.fullText || "";
      }

      // Use the chat endpoint for conversational interaction
      const response = await SummarizationService.chatWithMeeting(
        meetingContext,
        userQuestion
      );

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.response
      };

      setCurrentMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error:", error);

      let errorContent = "Sorry, I encountered an error. Please try again.";

      // Check if this is a rate limit error
      if (error instanceof RateLimitError) {
        errorContent = `⏳ ${error.message}\n\nPlease wait ${error.retryAfter} before sending another message.`;
      } else if (error instanceof Error) {
        errorContent = `Error: ${error.message}`;
      }

      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: errorContent
      };
      setCurrentMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Determine target chat ID
    let targetChatId = selectedChatId;
    let isNewChat = false;

    // Check if we need to create a new chat or can use existing
    if (!targetChatId) {
      // No chat selected, create new one
      targetChatId = Date.now().toString();
      isNewChat = true;
    } else {
      // Check if selected chat is empty "New Chat" without transcription
      const currentChat = chats.find(chat => chat.id === selectedChatId);
      if (currentChat && !currentChat.transcription) {
        // We can reuse this empty chat
        isNewChat = false;
      }
    }

    setIsUploading(true);
    setUploadStatus("Uploading file...");

    try {
      // Step 1: Transcribe the audio (with optional speaker diarization)
      setUploadStatus("Processing audio file...");
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UX

      // Always use speaker diarization
      setUploadStatus("Transcribing with speaker identification (this may take 3-5 minutes)...");
      const transcriptionData = await SummarizationService.transcribeWithSpeakers(file, "");
      console.log("Transcription data received:", transcriptionData);
      
      // Store the meeting_id from backend if available
      if (transcriptionData.meeting_id) {
        setCurrentMeetingId(transcriptionData.meeting_id);
        console.log("Meeting ID from backend:", transcriptionData.meeting_id);
      }

      // Step 2: Analyze transcription
      setUploadStatus("Analyzing transcription...");
      await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for UX

      // Step 3 & 4: Run summary and action items extraction in parallel
      setUploadStatus("Generating summary with AI...");
      const [summaryData, actionItemsData] = await Promise.all([
        SummarizationService.summarizeText(transcriptionData.transcription),
        SummarizationService.extractActionItems(transcriptionData.transcription)
      ]);
      console.log("Summary data received:", summaryData);
      console.log("Action items data received:", actionItemsData);

      setUploadStatus("Finalizing...");

      if (summaryData.success) {
        // Prepare segments
        const segments = transcriptionData.segments || [];
        
        // Assign action items to speakers based on transcript segments
        const rawActionItems = actionItemsData.success ? actionItemsData.action_items || [] : [];
        const assignedActionItems = assignActionItemsToSpeakers(rawActionItems, segments, targetChatId);
        
        // Prepare the complete chat data with transcription and action items
        const chatData = {
          title: file.name.replace(/\.(mp3|wav|m4a|flac|ogg|webm)$/i, ''),
          preview: summaryData.summary.substring(0, 50) + "...",
          meetingId: transcriptionData.meeting_id || undefined,
          transcription: {
            fullText: transcriptionData.transcription,
            segments: segments,
            fileName: file.name
          },
          actionItems: assignedActionItems
        };
        console.log("Complete chat data:", chatData);

        // Use React 18's automatic batching or use a callback to ensure state updates happen together
        if (isNewChat) {
          // Create NEW chat with all data at once
          const newChat: Chat = {
            id: targetChatId,
            timestamp: new Date(),
            ...chatData
          };
          // Batch state updates by using functional updates
          setChats(prevChats => {
            const updatedChats = [newChat, ...prevChats];
            // Set selected chat ID in a separate microtask to ensure chats state is updated first
            setTimeout(() => setSelectedChatId(targetChatId), 0);
            return updatedChats;
          });
        } else {
          // Update EXISTING chat with new data
          setChats(prevChats =>
            prevChats.map(chat =>
              chat.id === targetChatId
                ? { ...chat, ...chatData }
                : chat
            )
          );
        }

        // Add summary as AI message
        const aiMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content: summaryData.summary
        };

        setCurrentMessages(prev => [...prev, aiMessage]);
        
        // Check if speakers were detected and show speaker mapping
        if (transcriptionData.segments?.some((s: any) => s.speaker)) {
          setShowSpeakerMapping(true);
          setUploadStatus("Transcription complete! Please assign speaker names.");
        } else {
          setUploadStatus("Complete! Your meeting has been summarized.");
        }
      } else {
        throw new Error(summaryData.error || "Summarization failed");
      }
    } catch (error) {
      console.error("Upload error:", error);

      let errorStatus = "Error: Unknown error";
      let errorContent = "Failed to process recording: Unknown error";
      let isRateLimit = false;

      // Check if this is a rate limit error
      if (error instanceof RateLimitError) {
        isRateLimit = true;
        errorStatus = `⏳ Rate limit exceeded`;
        errorContent = `⏳ ${error.message}\n\nGroq API rate limit has been exceeded. Please wait ${error.retryAfter} before uploading another file.\n\nTip: Try uploading again in about a minute.`;
      } else if (error instanceof Error) {
        errorStatus = `Error: ${error.message}`;
        errorContent = `Failed to process recording: ${error.message}`;
      }

      setUploadStatus(errorStatus);

      const errorMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: errorContent
      };
      setCurrentMessages(prev => [...prev, errorMessage]);

      // Clear status after 8 seconds for rate limit errors, 3 seconds for others
      const clearDelay = isRateLimit ? 8000 : 3000;
      setTimeout(() => setUploadStatus(""), clearDelay);
    } finally {
      setIsUploading(false);
    }
  };

  const handleNewChat = () => {
    // Create a new empty chat without any transcript or action items
    console.log("handleNewChat called - creating blank chat");
    const newChatId = Date.now().toString();
    const newChat: Chat = {
      id: newChatId,
      title: "New Chat",
      preview: "Start a conversation...",
      timestamp: new Date()
      // Intentionally no transcription or actionItems - they're undefined
    };

    setChats(prevChats => [newChat, ...prevChats]);
    setSelectedChatId(newChatId);
    setCurrentMessages([]);
  };

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
  };

  const handleSuggestionClick = (suggestion: string) => {
    // Create a new chat with the suggestion as the first message
    const newChatId = Date.now().toString();
    const newChat: Chat = {
      id: newChatId,
      title: suggestion.substring(0, 50),
      preview: suggestion.substring(0, 50) + "...",
      timestamp: new Date()
    };

    setChats(prevChats => [newChat, ...prevChats]);
    setSelectedChatId(newChatId);
    setCurrentMessages([{
      id: Date.now().toString(),
      role: "user",
      content: suggestion
    }]);
  };

  // Get current chat data - useMemo ensures this recalculates when chats or selectedChatId changes
  const currentChat = useMemo(() => {
    const chat = chats.find(chat => chat.id === selectedChatId);
    console.log("currentChat recalculated:", {
      selectedChatId,
      foundChat: !!chat,
      hasTranscription: !!chat?.transcription,
      transcriptionLength: chat?.transcription?.fullText?.length || 0,
      segmentsCount: chat?.transcription?.segments?.length || 0
    });
    return chat;
  }, [chats, selectedChatId]);

  // Load and apply speaker mappings when displaying a chat with meeting_id
  useEffect(() => {
    const loadSpeakerMappings = async () => {
      if (!currentChat?.meetingId || !currentChat?.transcription?.segments) {
        return;
      }

      try {
        const mappingsData = await getSpeakerMappings(currentChat.meetingId);
        if (mappingsData.success && mappingsData.mappings && Object.keys(mappingsData.mappings).length > 0) {
          // Apply mappings to segments
          const updatedSegments = currentChat.transcription.segments.map(segment => ({
            ...segment,
            speaker_name: segment.speaker && mappingsData.mappings[segment.speaker]
              ? mappingsData.mappings[segment.speaker]
              : segment.speaker_name
          }));

          // Update the chat with enriched segments
          setChats(prevChats =>
            prevChats.map(chat =>
              chat.id === currentChat.id
                ? {
                    ...chat,
                    transcription: {
                      ...chat.transcription!,
                      segments: updatedSegments
                    }
                  }
                : chat
            )
          );
        }
      } catch (error) {
        console.error("Error loading speaker mappings:", error);
        // Silently fail - mappings are optional
      }
    };

    loadSpeakerMappings();
  }, [currentChat?.meetingId, currentChat?.id]);

  console.log("Rendering AiChat - selectedChatId:", selectedChatId, "shouldShowWelcome:", !selectedChatId);

  return (
    <div className="flex h-screen">
      <Sidebar
        chats={chats}
        selectedChatId={selectedChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
      />
      <div className="flex flex-1 flex-col">
        {!selectedChatId ? (
          <>
            {console.log("Rendering WelcomeScreen")}
            <WelcomeScreen onSuggestionClick={handleSuggestionClick} />
          </>
        ) : (
          <>
            {console.log("Rendering ChatInterface for chatId:", selectedChatId)}
            <ChatInterface
              messages={currentMessages}
              input={input}
              handleInputChange={handleInputChange}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
              chatTitle={currentChat?.title}
              onFileUpload={handleFileUpload}
              isUploading={isUploading}
              uploadStatus={uploadStatus}
              transcript={currentChat?.transcription?.fullText ?? ""}
              transcriptSegments={currentChat?.transcription?.segments ?? []}
              actionItems={currentChat?.actionItems ?? []}
            />
            
            {/* Speaker Mapping Overlay */}
            {showSpeakerMapping && currentMeetingId && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="max-w-2xl w-full max-h-[80vh] overflow-auto">
                  <SpeakerMapping
                    meetingId={currentMeetingId}
                    onComplete={async () => {
                      setShowSpeakerMapping(false);
                      setSpeakersMapped(true);
                      setUploadStatus("Complete! Speaker names assigned.");
                      
                      // Refresh segments with speaker mappings
                      if (currentChat?.meetingId && currentChat?.transcription?.segments) {
                        try {
                          const mappingsData = await getSpeakerMappings(currentChat.meetingId);
                          if (mappingsData.success && mappingsData.mappings) {
                            const updatedSegments = currentChat.transcription.segments.map(segment => ({
                              ...segment,
                              speaker_name: segment.speaker && mappingsData.mappings[segment.speaker]
                                ? mappingsData.mappings[segment.speaker]
                                : segment.speaker_name
                            }));

                            // Update the chat with enriched segments
                            setChats(prevChats =>
                              prevChats.map(chat =>
                                chat.id === currentChat.id
                                  ? {
                                      ...chat,
                                      transcription: {
                                        ...chat.transcription!,
                                        segments: updatedSegments
                                      }
                                    }
                                  : chat
                              )
                            );
                          }
                        } catch (error) {
                          console.error("Error refreshing speaker mappings:", error);
                        }
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}