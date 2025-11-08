"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
  messages?: any[]; // Cached messages for instant switching
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

  // Track if conversations have been loaded to prevent unnecessary refetches
  const conversationsLoadedRef = useRef(false);

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

      // Skip if we've already loaded conversations (prevents re-fetch on tab focus)
      if (conversationsLoadedRef.current) {
        console.log("[LOAD] Conversations already loaded, skipping refetch");
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

        // MERGE with existing cached data instead of replacing
        // This prevents losing cached messages/transcriptions when tab regains focus
        setChats(prevChats => {
          // If no previous chats, just use the fresh data
          if (prevChats.length === 0) {
            return transformedChats;
          }

          // Merge: keep cached data (messages, transcription, action items) from prevChats
          return transformedChats.map(freshChat => {
            const existingChat = prevChats.find(c => c.id === freshChat.id);
            if (existingChat) {
              // Preserve cached data while updating metadata
              return {
                ...freshChat,
                messages: existingChat.messages,
                transcription: existingChat.transcription,
                actionItems: existingChat.actionItems
              };
            }
            return freshChat;
          });
        });

        // Mark conversations as loaded to prevent unnecessary refetches
        conversationsLoadedRef.current = true;
        console.log("[LOAD] Conversations loaded and merged with cache successfully:", transformedChats.length);
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

  // Note: We DON'T reset messages here anymore because handleSelectChat
  // manages message loading. Resetting here causes a flash of empty content.

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

    setCurrentMessages(prev => {
      const updatedMessages = [...prev, userMessage];

      // Update cached messages in the chat object
      setChats(prevChats =>
        prevChats.map(chat =>
          chat.id === selectedChatId
            ? { ...chat, messages: updatedMessages }
            : chat
        )
      );

      return updatedMessages;
    });
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

      setCurrentMessages(prev => {
        const updatedMessages = [...prev, aiMessage];

        // Update cached messages in the chat object
        setChats(prevChats =>
          prevChats.map(chat =>
            chat.id === selectedChatId
              ? { ...chat, messages: updatedMessages }
              : chat
          )
        );

        return updatedMessages;
      });
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

      setCurrentMessages(prev => {
        const updatedMessages = [...prev, errorMessage];

        // Update cached messages in the chat object even for errors
        setChats(prevChats =>
          prevChats.map(chat =>
            chat.id === selectedChatId
              ? { ...chat, messages: updatedMessages }
              : chat
          )
        );

        return updatedMessages;
      });
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
    setUploadStatus("📤 Uploading audio file...");

    try {
      // Note: The /transcribe endpoint does EVERYTHING in one call:
      // - Audio transcription (Groq Whisper or Local)
      // - AI summarization (Ollama)
      // - Action items extraction (Ollama)
      // We can't update status during processing, so show one comprehensive message

      setUploadStatus("🎧 Validating audio format...");
      await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for UX

      setUploadStatus("⚡ Processing meeting (transcription → summary → action items)...");
      console.log("Sending transcription request with user ID:", user?.id || "NOT AUTHENTICATED");
      const transcriptionData = await SummarizationService.transcribeAudio(file, user?.id);
      console.log("Transcription data received:", transcriptionData);

      // Check which service was used and update status to show the method
      const wasGroq = (transcriptionData as any).service === "groq";
      const transcriptionMethod = wasGroq ? "Groq Whisper API ⚡" : "Local Whisper 🖥️";
      console.log(`✓ Processing completed using: ${transcriptionMethod}`);

      // Update status to show which transcription service was used
      setUploadStatus(`✓ Transcribed with ${transcriptionMethod} → Finalizing...`);

      const summaryData = transcriptionData.summary;
      const actionItemsFromBackend = transcriptionData.action_items || [];

      console.log("Summary data received:", summaryData);
      console.log("Action items received from backend:", actionItemsFromBackend);

      if (summaryData?.success && summaryData.summary) {
        // Add summary as AI message (this is already saved to DB via /transcribe endpoint)
        console.log("[DEBUG] Summary content being displayed:", summaryData.summary);
        console.log("[DEBUG] First 200 chars:", summaryData.summary.substring(0, 200));

        const aiMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content: summaryData.summary
        };

        // Prepare the complete chat data with transcription, action items, AND messages for caching
        const chatData = {
          title: file.name.replace(/\.(mp3|wav|m4a|flac|ogg|webm)$/i, ''),
          preview: summaryData.summary.substring(0, 50) + "...",
          conversationId: transcriptionData.conversation_id,
          transcription: {
            fullText: transcriptionData.transcription,
            segments: transcriptionData.segments || [],
            fileName: file.name
          },
          actionItems: Array.isArray(actionItemsFromBackend) ? actionItemsFromBackend.map((item: any, index: number) => ({
            id: `${targetChatId}-${index}`,
            priority: item.priority || "medium",
            task: item.task || item,
            assignedTo: item.assigned_to || "Unassigned"
          })) : [],
          messages: [aiMessage] // Cache the initial summary message
        };
        console.log("Complete chat data (including conversationId and cached messages):", chatData);

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

        setCurrentMessages(prev => [...prev, aiMessage]);
        setUploadStatus(`✅ Complete! Meeting processed with ${transcriptionMethod}`);

        // Note: The conversation and initial summary message are already saved to the database
        // by the /transcribe endpoint, so they will persist across page refreshes
      } else {
        throw new Error(summaryData?.error || "Summarization failed");
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
        setSelectedChatId(chatId);
        return;
      }
      setSelectedChatId(chatId);
      setCurrentMessages([{
        id: Date.now().toString(),
        role: "assistant",
        content: "This conversation is not yet available. Please try refreshing the page."
      }]);
      return;
    }

    // CHECK CACHE FIRST - If we've already loaded this chat, use cached data for INSTANT switching
    if (selectedChat.messages && selectedChat.transcription) {
      console.log("[SELECT] ⚡ Using cached data for instant switch");
      setSelectedChatId(chatId);
      setCurrentMessages(selectedChat.messages);
      return;
    }

    setIsLoading(true);

    try {
      // Load messages AND conversation details IN PARALLEL for faster loading
      console.log("[SELECT] Loading messages and conversation details in parallel for conversationId:", selectedChat.conversationId);

      const needsTranscription = !selectedChat.transcription;
      const needsMessages = !selectedChat.messages;

      // Start both requests simultaneously (skip if already cached)
      const messagesPromise = needsMessages
        ? SummarizationService.getConversationMessages(selectedChat.conversationId)
        : Promise.resolve(selectedChat.messages || []);
      const conversationPromise = needsTranscription
        ? SummarizationService.getConversation(selectedChat.conversationId)
        : Promise.resolve(null);

      // Wait for both to complete
      const [messagesData, conversationData] = await Promise.all([messagesPromise, conversationPromise]);

      console.log("[SELECT] Loaded messages:", messagesData);
      console.log("[SELECT] Loaded conversation data:", conversationData);

      // Transform database messages to local format
      const transformedMessages = Array.isArray(messagesData) ? messagesData.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content
      })) : messagesData;

      // Update chat with ALL data (messages, transcription, action items) for caching
      setChats(prevChats =>
        prevChats.map(chat => {
          if (chat.id === chatId) {
            const updatedChat = { ...chat };

            // Cache messages for instant switching next time
            updatedChat.messages = transformedMessages;

            // Add transcription if available
            if (conversationData?.transcription) {
              updatedChat.transcription = {
                fullText: conversationData.transcription.transcription_text,
                segments: conversationData.transcription.segments || [],
                fileName: conversationData.conversation?.title || "Meeting Transcript"
              };
              console.log("[SELECT] Cached transcription:", {
                hasFullText: !!updatedChat.transcription.fullText,
                textLength: updatedChat.transcription.fullText?.length,
                segmentsCount: updatedChat.transcription.segments?.length || 0
              });
            }

            // Add action items if available from database
            if (conversationData?.action_items && conversationData.action_items.length > 0) {
              updatedChat.actionItems = conversationData.action_items.map((item: any) => ({
                id: item.id,
                priority: item.priority || "medium",
                task: item.task,
                assignedTo: item.assigned_to || "Unassigned"
              }));
              console.log("[SELECT] Cached action items:", updatedChat.actionItems?.length);
            } else if (!updatedChat.actionItems) {
              updatedChat.actionItems = [];
            }

            return updatedChat;
          }
          return chat;
        })
      );

      // NOW set the selected chat ID and messages together
      // This ensures transcription/action items are loaded BEFORE the chat becomes active
      setSelectedChatId(chatId);
      setCurrentMessages(transformedMessages);
      console.log("[SELECT] Chat fully loaded, cached, and selected:", transformedMessages.length, "messages");

    } catch (error) {
      console.error("[SELECT] Failed to load messages:", error);
      // Set chat ID even on error so user knows which chat they tried to open
      setSelectedChatId(chatId);
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

  const handleDeleteChat = async (chatId: string) => {
    console.log("[DELETE] Deleting chat:", chatId);

    // Find the chat to get its conversationId
    const chatToDelete = chats.find(chat => chat.id === chatId);

    if (!chatToDelete?.conversationId) {
      console.log("[DELETE] Chat has no conversationId, removing from local state only");
      // If no conversationId (local-only chat), just remove from state
      setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));

      // If this was the selected chat, clear selection
      if (selectedChatId === chatId) {
        setSelectedChatId(null);
        setCurrentMessages([]);
      }
      return;
    }

    try {
      // Delete from database
      console.log("[DELETE] Deleting conversation from database:", chatToDelete.conversationId);
      await SummarizationService.deleteConversation(chatToDelete.conversationId);
      console.log("[DELETE] Successfully deleted from database");

      // Remove from local state
      setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));

      // If this was the selected chat, clear selection
      if (selectedChatId === chatId) {
        setSelectedChatId(null);
        setCurrentMessages([]);
      }

      console.log("[DELETE] Chat deleted successfully");
    } catch (error) {
      console.error("[DELETE] Failed to delete chat:", error);
      // Show error to user
      alert(`Failed to delete chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
        onDeleteChat={handleDeleteChat}
        isUploading={isUploading}
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