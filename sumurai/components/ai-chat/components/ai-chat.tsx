"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { useChat } from "@ai-sdk/react";
import { WelcomeScreen } from "./welcome-screen";
import { ChatInterface } from "./chat-interface";
import { SummarizationService } from "@/lib/services/summarization";

export default function AiChat() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chats, setChats] = useState([
    {
      id: "1",
      title: "Can you fly?",
      preview: "Not on my own! I exist o...",
      timestamp: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
    },
    {
      id: "2",
      title: "Do you have emotion...",
      preview: "I can't feel emotions my...",
      timestamp: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
    },
    {
      id: "3",
      title: "Will robots take over t...",
      preview: "Science fiction is fun, b...",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 hours ago
    },
    {
      id: "4",
      title: "What's the meaning o...",
      preview: "That's a big question ph...",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3) // 3 hours ago
    },
    {
      id: "5",
      title: "Can you write a song ...",
      preview: "I can definitely help you...",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4) // 4 hours ago
    },
    {
      id: "6",
      title: "What's the best way t...",
      preview: "Unfortunately, there's n...",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5) // 5 hours ago
    },
    {
      id: "7",
      title: "What's your favorite c...",
      preview: "As a language model, I ...",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6) // 6 hours ago
    },
    {
      id: "8",
      title: "Can you predict the f...",
      preview: "I can't see the future, b...",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 7) // 7 hours ago
    },
    {
      id: "9",
      title: "What's the best pizza ...",
      preview: "That's entirely up to you...",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8) // 8 hours ago
    },
    {
      id: "10",
      title: "Are you sentient?",
      preview: "Sentience is a complex ...",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 9) // 9 hours ago
    },
    {
      id: "11",
      title: "Can you solve this m...",
      preview: "Just type ou...",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 10) // 10 hours ago
    }
  ]);

  const [currentMessages, setCurrentMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // New state for file upload and summarization
  const [currentTranscript, setCurrentTranscript] = useState<string>("");
  const [currentSummary, setCurrentSummary] = useState<string>("");
  const [transcriptSegments, setTranscriptSegments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");

  const dummyConversations: Record<string, any[]> = {
    "1": [
      { id: "1", role: "user", content: "Can you fly?" },
      { id: "2", role: "assistant", content: "Not on my own! I exist only as a digital assistant, so I don't have a physical form that could fly. But I can help you with information about flying, aviation, or anything else you'd like to know!" }
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
      // Use the chat endpoint for conversational interaction
      const response = await SummarizationService.chatWithMeeting(
        currentSummary,
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

    setIsUploading(true);
    setUploadStatus("Uploading file...");

    try {
      // Step 1: Transcribe the audio
      setUploadStatus("Transcribing audio with Whisper...");
      const transcriptionData = await SummarizationService.transcribeAudio(file);

      setCurrentTranscript(transcriptionData.transcription);
      setTranscriptSegments(transcriptionData.segments || []);

      // Step 2: Summarize the transcription
      setUploadStatus("Generating summary with Ollama...");
      const summaryData = await SummarizationService.summarizeText(
        transcriptionData.transcription
      );

      if (summaryData.success) {
        setCurrentSummary(summaryData.summary);

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
    // In a real app, this would start a new chat with the suggestion
    setSelectedChatId("new");
  };

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
            chatTitle={chats.find(chat => chat.id === selectedChatId)?.title}
            onFileUpload={handleFileUpload}
            isUploading={isUploading}
            uploadStatus={uploadStatus}
            transcript={currentTranscript}
            transcriptSegments={transcriptSegments}
          />
        )}
      </div>
    </div>
  );
}