"use client";

import React from "react";
import type { ChangeEvent, FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Copy, Share, ThumbsUp, ThumbsDown, Send, Paperclip, Mic } from "lucide-react";

interface Message {
  id: string;
  role: string;
  content: string;
}

interface ChatInterfaceProps {
  messages: Message[];
  input: string;
  handleInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  chatTitle?: string;
  onFileUpload?: (file: File) => void;
  isUploading?: boolean;
  uploadStatus?: string;
  transcript?: string;
  transcriptSegments?: Array<{start: number; end: number; text: string}>;
}

export function ChatInterface({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  chatTitle,
  onFileUpload,
  isUploading = false,
  uploadStatus = "",
  transcript = "",
  transcriptSegments = []
}: ChatInterfaceProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = React.useState(false);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      {chatTitle && (
        <div className="border-b border-[#00F5FF] px-6 py-4 bg-gradient-to-r from-[#00F5FF]/5 to-[#06B6D4]/5">
          <h2 className="text-xl font-bold text-white">{chatTitle}</h2>
        </div>
      )}

      {/* Main Content Container */}
      <div className="flex flex-1 min-h-0 gap-4 p-4 overflow-hidden">
        {/* Summary Section (Left) */}
        <div className="flex flex-col bg-gray-900/5 rounded-xl shadow-sm border border-gray-200/50 flex-1 min-h-0">
          <div className="px-4 py-3 border-b border-[#00F5FF]/20 bg-gradient-to-r from-[#00F5FF]/5 to-[#06B6D4]/5 rounded-t-xl flex-shrink-0">
            <h3 className="text-lg font-bold text-white">Summary</h3>
          </div>

          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-4">
            <div className="space-y-4">
              {(messages || []).map((message) => (
                <div key={message.id} className="flex gap-3">
                  {message.role === "user" ? (
                    <>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="/placeholder.svg?height=32&width=32" />
                        <AvatarFallback>JD</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-muted rounded-lg p-3">
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-500">AI</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-muted rounded-lg border p-3">
                          <p className="text-sm mb-3 whitespace-pre-wrap">{message.content}</p>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Share className="h-3 w-3" />
                            </Button>
                            <div className="ml-auto flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <ThumbsDown className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <ThumbsUp className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-500">AI</AvatarFallback>
                  </Avatar>
                  <div className="bg-muted flex-1 rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
                      <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
                      <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
                      <span className="text-muted-foreground text-xs">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            </div>
          </ScrollArea>

          {/* Chat Input */}
          <div className="border-t border-[#00F5FF]/20 bg-gradient-to-r from-[#00F5FF]/5 to-[#06B6D4]/5 p-4 rounded-b-xl flex-shrink-0">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <div className="bg-muted flex flex-1 items-center rounded-lg border border-gray-200/50 px-3 py-2 relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,video/*,.mp3,.wav,.m4a,.flac,.ogg,.webm"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  value={input}
                  onChange={handleInputChange}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder=""
                  className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-transparent"
                  disabled={isLoading}
                />
                {!input && !isUploading && !isFocused && (
                  <div className="absolute inset-y-0 left-12 flex items-center pointer-events-none">
                    <span className="bg-gradient-to-r from-[#00F5FF] via-[#06B6D4] to-[#00F5FF] bg-clip-text text-transparent animate-pulse text-md font-medium bg-[length:200%_100%] animate-gradient-x">
                      Ask me anything...
                    </span>
                  </div>
                )}
                {isUploading && (
                  <div className="absolute inset-y-0 left-12 flex items-center pointer-events-none">
                    <span className="text-[#00F5FF] text-sm font-medium">
                      {uploadStatus}
                    </span>
                  </div>
                )}
                <style jsx>{`
                  @keyframes gradient-x {
                    0%, 100% {
                      background-position: 0% 50%;
                    }
                    50% {
                      background-position: 100% 50%;
                    }
                  }
                  .animate-gradient-x {
                    animation: gradient-x 3s ease infinite;
                  }
                `}</style>
                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <Mic className="h-4 w-4" />
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!(input || '').trim() || isLoading}
                  className="h-7 w-7 p-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Transcript Section (Right) */}
        <div className="flex flex-col bg-gray-900/5 rounded-xl shadow-sm border border-gray-200/50 w-1/3 min-h-0">
          <div className="px-4 py-3 border-b border-[#00F5FF]/20 bg-gradient-to-r from-[#00F5FF]/5 to-[#06B6D4]/5 rounded-t-xl flex-shrink-0">
            <h3 className="text-lg font-semibold bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] bg-clip-text text-transparent text-white">Transcript</h3>
          </div>

          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-4">
            <div className="space-y-3">
              {transcript ? (
                transcriptSegments.length > 0 ? (
                  // Show timestamped segments if available
                  transcriptSegments.map((segment, index) => (
                    <div key={index} className="border-l-2 border-[#00F5FF] pl-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-[#06B6D4]">
                          {Math.floor(segment.start / 60)}:{String(Math.floor(segment.start % 60)).padStart(2, '0')} -
                          {Math.floor(segment.end / 60)}:{String(Math.floor(segment.end % 60)).padStart(2, '0')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-100 font-medium">{segment.text}</p>
                    </div>
                  ))
                ) : (
                  // Show full transcript without segments
                  <div className="border-l-2 border-[#00F5FF] pl-3">
                    <p className="text-sm text-gray-100 font-medium whitespace-pre-wrap">{transcript}</p>
                  </div>
                )
              ) : (
                <p className="text-sm text-gray-400 italic">Upload a meeting recording to see the transcript here.</p>
              )}
            </div>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Action Items Section */}
      <div className="p-4 flex-shrink-0">
        <div className="bg-gray-900/5 rounded-xl shadow-sm border border-gray-200/50 p-4">
          <div className="px-4 py-3 border-b border-[#00F5FF]/20 bg-gradient-to-r from-[#00F5FF]/5 to-[#06B6D4]/5 rounded-t-xl mb-4 -mx-4 -mt-4">
            <h3 className="text-lg font-semibold bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] bg-clip-text text-transparent text-white">Action Items</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Dummy action items */}
            <div className="bg-muted rounded-lg border border-gray-200/50 p-4 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-3 w-3 rounded-full bg-gradient-to-r from-red-400 to-red-600 shadow-sm"></div>
                <span className="text-sm font-bold text-white">High Priority</span>
              </div>
              <p className="text-sm text-gray-100 mb-3 leading-relaxed font-medium">Complete user testing by Friday</p>
              <span className="text-xs text-gray-300">Assigned to: <span className="text-[#00F5FF] font-bold">Sarah Chen</span></span>
            </div>

            <div className="bg-muted rounded-lg border border-gray-200/50 p-4 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-3 w-3 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 shadow-sm"></div>
                <span className="text-sm font-bold text-white">Medium Priority</span>
              </div>
              <p className="text-sm text-gray-100 mb-3 leading-relaxed font-medium">Review API documentation</p>
              <span className="text-xs text-gray-300">Assigned to: <span className="text-[#00F5FF] font-bold">Mike Rodriguez</span></span>
            </div>

            <div className="bg-muted rounded-lg border border-gray-200/50 p-4 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-3 w-3 rounded-full bg-gradient-to-r from-green-400 to-green-600 shadow-sm"></div>
                <span className="text-sm font-bold text-white">Low Priority</span>
              </div>
              <p className="text-sm text-gray-100 mb-3 leading-relaxed font-medium">Update project timeline</p>
              <span className="text-xs text-gray-300">Assigned to: <span className="text-[#00F5FF] font-bold">John Doe</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}