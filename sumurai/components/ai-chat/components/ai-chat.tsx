"use client";

import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "./sidebar";
import { useChat } from "@ai-sdk/react";
import { WelcomeScreen } from "./welcome-screen";
import { ChatInterface } from "./chat-interface";
import { SummarizationService } from "@/lib/services/summarization";

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

  const [currentMessages, setCurrentMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");

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
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again."
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
      const transcriptionData = await SummarizationService.transcribeAudio(file);
      console.log("Transcription data received:", transcriptionData);

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
        // Prepare the complete chat data with transcription and action items
        const chatData = {
          title: file.name.replace(/\.(mp3|wav|m4a|flac|ogg|webm)$/i, ''),
          preview: summaryData.summary.substring(0, 50) + "...",
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
        setUploadStatus("Complete! Your meeting has been summarized.");
      } else {
        throw new Error(summaryData.error || "Summarization failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);

      const errorMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: `Failed to process recording: ${error instanceof Error ? error.message : "Unknown error"}`
      };
      setCurrentMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsUploading(false);
      // Clear status after 3 seconds
      setTimeout(() => setUploadStatus(""), 3000);
    }
  };

  const handleNewChat = () => {
    // Create a new empty chat
    const newChatId = Date.now().toString();
    const newChat: Chat = {
      id: newChatId,
      title: "New Chat",
      preview: "Start a conversation...",
      timestamp: new Date()
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
          <WelcomeScreen onSuggestionClick={handleSuggestionClick} />
        ) : (
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
        )}
      </div>
    </div>
  );
}