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
  const [chats, setChats] = useState<Chat[]>([
    {
      id: "1",
      title: "Can you fly?",
      preview: "Not on my own! I exist o...",
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      transcription: {
        fullText: "This is the transcript for chat 1...",
        segments: [
          { start: 0, end: 5, text: "Hello everyone" },
          { start: 5, end: 10, text: "Let's begin the meeting" },
          { start: 5, end: 10, text: "Let's begin the meeting" },
          { start: 5, end: 10, text: "Let's begin the meeting" },
          { start: 5, end: 10, text: "Let's begin the meeting" },
          { start: 5, end: 10, text: "Let's begin the meeting" },
          { start: 5, end: 10, text: "Let's begin the meeting" },
          { start: 5, end: 10, text: "Let's begin the meeting" },
          { start: 5, end: 10, text: "Let's begin the meeting" },
          { start: 5, end: 10, text: "Let's begin the meeting" },
          { start: 5, end: 10, text: "Let's begin the meeting" },
          { start: 5, end: 10, text: "Let's begin the meeting" },
          { start: 5, end: 10, text: "Let's begin the meeting" },
          { start: 5, end: 10, text: "Let's begin the meeting" },
          { start: 5, end: 10, text: "Let's begin the meeting" },
          { start: 5, end: 10, text: "Let's begin the meeting" },
          { start: 5, end: 10, text: "Let's begin the meeting" },
          { start: 5, end: 10, text: "Let's begin the meeting" }
        ]
      },
      actionItems: [
        {
          id: "1",
          priority: "high",
          task: "Complete user testing",
          assignedTo: "Sarah Chen"
        },
        {
          id: "2",
          priority: "low",
          task: "Get stakeholder feedback",
          assignedTo: "Ben Dover"
        },
        {
          id: "3",
          priority: "medium",
          task: "task",
          assignedTo: "assignee"
        },
        {
          id: "4",
          priority: "medium",
          task: "task",
          assignedTo: "assignee"
        },
        {
          id: "5",
          priority: "medium",
          task: "task",
          assignedTo: "assignee"
        },
        {
          id: "6",
          priority: "medium",
          task: "task",
          assignedTo: "assignee"
        },
      ]
    },
    {
      id: "2",
      title: "Do you have emotions?",
      preview: "I can't feel emotions...",
      timestamp: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
    }
  ]);

  const [currentMessages, setCurrentMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");

  const dummyConversations: Record<string, any[]> = {
    "1": [
      { id: "1", role: "user", content: "Can you fly?" },
      { id: "2", role: "assistant", content: "Not on my own! I exist only as a digital assistant, so I don't have a physical form that could fly. But I can help you with information about flying, aviation, or anything else you'd like to know!" },
      { id: "3", role: "assistant", content: "Not on my own! I exist only as a digital assistant, so I don't have a physical form that could fly. But I can help you with information about flying, aviation, or anything else you'd like to know!" },
      { id: "4", role: "assistant", content: "Not on my own! I exist only as a digital assistant, so I don't have a physical form that could fly. But I can help you with information about flying, aviation, or anything else you'd like to know!" },
      { id: "5", role: "assistant", content: "Not on my own! I exist only as a digital assistant, so I don't have a physical form that could fly. But I can help you with information about flying, aviation, or anything else you'd like to know!" },
      { id: "6", role: "assistant", content: "Not on my own! I exist only as a digital assistant, so I don't have a physical form that could fly. But I can help you with information about flying, aviation, or anything else you'd like to know!" },
      { id: "7", role: "assistant", content: "Not on my own! I exist only as a digital assistant, so I don't have a physical form that could fly. But I can help you with information about flying, aviation, or anything else you'd like to know!" },
      { id: "8", role: "assistant", content: "Not on my own! I exist only as a digital assistant, so I don't have a physical form that could fly. But I can help you with information about flying, aviation, or anything else you'd like to know!" },
      { id: "9", role: "assistant", content: "Not on my own! I exist only as a digital assistant, so I don't have a physical form that could fly. But I can help you with information about flying, aviation, or anything else you'd like to know!" },
      { id: "10", role: "assistant", content: "Not on my own! I exist only as a digital assistant, so I don't have a physical form that could fly. But I can help you with information about flying, aviation, or anything else you'd like to know!" },
    ],
    "2": [
      { id: "1", role: "user", content: "Do you have emotions?" },
      { id: "2", role: "assistant", content: "I can't feel emotions myself, but I can understand and respond to yours! Tell me how you're feeling today." }
    ],
    "3": [
      { id: "1", role: "user", content: "Will robots take over the world?" },
      { id: "2", role: "assistant", content: "Science fiction is fun, but the reality is much more nuanced! AI development focuses on being helpful tools for humans rather than replacement. What specific concerns do you have about AI?" }
    ],
    "4": [
      { id: "1", role: "user", content: "What's the meaning of life?" },
      { id: "2", role: "assistant", content: "That's a big question philosophers have pondered for centuries! Some find meaning through relationships, others through achievement, service, or personal growth. What brings meaning to your life?" }
    ],
    "5": [
      { id: "1", role: "user", content: "Can you write a song about cats?" },
      { id: "2", role: "assistant", content: "I can definitely help you with that! Here's a short song about cats:\n\n🎵 Whiskers twitching in the sun,\nSilent paws, they softly run,\nPurring engines, warm and sweet,\nCurled up cozy at your feet 🎵\n\nWould you like me to write more verses?" }
    ]
  };

  useEffect(() => {
    if (selectedChatId && dummyConversations[selectedChatId]) {
      setCurrentMessages(dummyConversations[selectedChatId]);
    } else {
      setCurrentMessages([]);
    }
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
    setInput("");
    setIsLoading(true);

    try {
      // Get the current chat's transcription for context
      const currentChat = chats.find(chat => chat.id === selectedChatId);

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

    if (!targetChatId) {
      targetChatId = Date.now().toString();
      isNewChat = true;
      // Don't create the chat yet - we'll create it with all data after processing
      // setSelectedChatId(targetChatId); // Moved to after chat creation to fix timing issue
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
    setSelectedChatId(null);
    // Reset chat messages would happen here in a real app
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