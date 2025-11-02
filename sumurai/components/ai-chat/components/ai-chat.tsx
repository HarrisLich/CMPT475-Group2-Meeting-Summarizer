"use client";

import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "./sidebar";
import { useChat } from "@ai-sdk/react";
import { WelcomeScreen } from "./welcome-screen";
import { ChatInterface } from "./chat-interface";
import { SummarizationService, RateLimitError } from "@/lib/services/summarization";
import { useAuth } from "@/lib/context/auth-context";

// Meeting chat objects
interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
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
  conversationId?: string; // Supabase conversation ID for message persistence
  transcription?: {
    fullText: string;
    segments: TranscriptionSegment[];
    fileName?: string;
  };
  actionItems?: ActionItem[];
}

export default function AiChat() {
  const { user, session, loading: authLoading } = useAuth(); // Get authenticated user
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);

  const [currentMessages, setCurrentMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");

  // Log auth context when component loads and when it changes
  useEffect(() => {
    console.log("=== AI Chat Auth Context ===");
    console.log("Auth Loading:", authLoading);
    console.log("User:", user);
    console.log("User ID:", user?.id);
    console.log("User Email:", user?.email);
    console.log("Session:", session);
    console.log("============================");
  }, [user, session, authLoading]);

  // Load user's conversations from database when authenticated
  useEffect(() => {
    const loadUserConversations = async () => {
      if (!user?.id || authLoading) {
        console.log("[LOAD] Skipping conversation load - user not ready", { userId: user?.id, authLoading });
        return;
      }

      console.log("[LOAD] Loading conversations for user:", user.id);

      try {
        const conversations = await SummarizationService.getUserConversations(user.id);
        console.log("[LOAD] Loaded conversations:", conversations);

        // Transform database conversations to Chat format
        const transformedChats: Chat[] = conversations.map(conv => ({
          id: conv.id,
          conversationId: conv.id,
          title: conv.title,
          preview: "Click to view conversation...",
          timestamp: new Date(conv.updated_at || conv.created_at),
          // Transcription and messages will be loaded when user selects the chat
        }));

        setChats(transformedChats);
        console.log("[LOAD] Conversations loaded successfully:", transformedChats.length);
      } catch (error) {
        console.error("[LOAD] Failed to load conversations:", error);
        if (error instanceof Error) {
          console.error("[LOAD] Error details:", error.message);
        }
        // Don't show error to user, just log it
      }
    };

    loadUserConversations();
  }, [user, authLoading]);

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
      console.log("Sending chat request with conversationId:", currentChat?.conversationId, "userId:", user?.id);
      const response = await SummarizationService.chatWithMeeting(
        meetingContext,
        userQuestion,
        currentChat?.conversationId,
        user?.id
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
      // Step 1: Transcribe the audio
      setUploadStatus("Processing audio file...");
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UX

      setUploadStatus("Transcribing with Whisper (this may take 2-3 minutes)...");
      console.log("Sending transcription request with user ID:", user?.id || "NOT AUTHENTICATED");
      const transcriptionData = await SummarizationService.transcribeAudio(file, user?.id);
      console.log("Transcription data received:", transcriptionData);

      // Step 2: Analyze transcription
      setUploadStatus("Analyzing transcription...");
      await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for UX

      // Step 3 & 4: Run summary and action items extraction in parallel
      setUploadStatus("Generating summary with AI...");
      console.log("Sending summarization request with user ID:", user?.id || "NOT AUTHENTICATED");
      const [summaryData, actionItemsData] = await Promise.all([
        SummarizationService.summarizeText(transcriptionData.transcription, user?.id),
        SummarizationService.extractActionItems(transcriptionData.transcription)
      ]);
      console.log("Summary data received:", summaryData);
      console.log("Action items data received:", actionItemsData);

      setUploadStatus("Finalizing...");

      if (summaryData.success) {
        // Prepare the complete chat data with transcription and action items
        const chatData = {
          title: file.name.replace(/\.(mp3|wav|m4a|flac|ogg|webm)$/i, ''),
          preview: summaryData.summary.substring(0, 50) + "...",
          conversationId: (transcriptionData as any).conversation_id, // Extract conversation_id from backend
          transcription: {
            fullText: transcriptionData.transcription,
            segments: transcriptionData.segments || [],
            fileName: file.name
          },
          actionItems: actionItemsData.success ? actionItemsData.action_items?.map((item: any, index: number) => ({
            id: `${targetChatId}-${index}`,
            priority: item.priority || "medium",
            task: item.task || item,
            assignedTo: item.assigned_to || "Unassigned"
          })) : []
        };
        console.log("Complete chat data (including conversationId):", chatData);

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

        // Add summary as AI message (this is already saved to DB via /transcribe endpoint)
        const aiMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content: summaryData.summary
        };

        setCurrentMessages(prev => [...prev, aiMessage]);
        setUploadStatus("Complete! Your meeting has been summarized.");

        // Note: The conversation and initial summary message are already saved to the database
        // by the /transcribe endpoint, so they will persist across page refreshes
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

  const handleSelectChat = async (chatId: string) => {
    console.log("[SELECT] Selecting chat:", chatId);
    setSelectedChatId(chatId);

    // Find the chat to get its conversationId
    const selectedChat = chats.find(chat => chat.id === chatId);

    // If this is a newly created chat that's already selected, just show current messages
    if (chatId === selectedChatId && currentMessages.length > 0) {
      console.log("[SELECT] Chat is already selected with messages, skipping reload");
      return;
    }

    // If the chat has no conversationId (shouldn't happen, but defensive check)
    if (!selectedChat?.conversationId) {
      console.warn("[SELECT] Chat has no conversationId, cannot load messages from database");
      // If this chat has transcription data, it means it was just uploaded
      // and messages are already in local state
      if (selectedChat?.transcription) {
        console.log("[SELECT] Using local chat data instead of fetching from database");
        return;
      }
      setCurrentMessages([{
        id: Date.now().toString(),
        role: "assistant",
        content: "This conversation is not yet available. Please try refreshing the page."
      }]);
      return;
    }

    setIsLoading(true);

    try {
      // Load messages for this conversation using the conversationId
      console.log("[SELECT] Loading messages for conversationId:", selectedChat.conversationId);
      const messagesData = await SummarizationService.getConversationMessages(selectedChat.conversationId);
      console.log("[SELECT] Loaded messages:", messagesData);

      // Transform database messages to local format
      const transformedMessages = messagesData.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content
      }));

      setCurrentMessages(transformedMessages);
      console.log("[SELECT] Messages loaded successfully:", transformedMessages.length);

      // Load full conversation details if not already loaded (transcription, action items)
      if (!selectedChat.transcription) {
        console.log("[SELECT] Loading full conversation details...");
        try {
          const conversationData = await SummarizationService.getConversation(selectedChat.conversationId);
          console.log("[SELECT] Conversation data:", conversationData);

          // Update the chat in state with transcription and action items
          if (conversationData.transcription || conversationData.summary) {
            setChats(prevChats =>
              prevChats.map(chat => {
                if (chat.id === chatId) {
                  const updatedChat = { ...chat };

                  // Add transcription if available
                  if (conversationData.transcription) {
                    updatedChat.transcription = {
                      fullText: conversationData.transcription.transcription_text,
                      segments: conversationData.transcription.segments || [], // Load segments from DB
                      fileName: conversationData.conversation?.title || "Meeting Transcript"
                    };
                    console.log("[SELECT] Updated chat with transcription:", {
                      hasFullText: !!updatedChat.transcription.fullText,
                      textLength: updatedChat.transcription.fullText?.length,
                      segmentsCount: updatedChat.transcription.segments?.length || 0
                    });
                  } else {
                    console.warn("[SELECT] No transcription data found in response");
                  }

                  // Add action items if available (would need to fetch separately or parse from summary)
                  // For now, we'll leave action items empty since they're not stored in DB yet
                  if (!updatedChat.actionItems) {
                    updatedChat.actionItems = [];
                  }

                  return updatedChat;
                }
                return chat;
              })
            );
          } else {
            console.warn("[SELECT] No transcription or summary data in conversation response");
          }
        } catch (detailsError) {
          console.error("[SELECT] Failed to load conversation details:", detailsError);
          // Don't fail the whole operation, just log the error
        }
      }

    } catch (error) {
      console.error("[SELECT] Failed to load messages:", error);
      // Show error to user
      const errorMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Failed to load conversation history. Please try again."
      };
      setCurrentMessages([errorMessage]);
    } finally {
      setIsLoading(false);
    }
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
          </>
        )}
      </div>
    </div>
  );
}