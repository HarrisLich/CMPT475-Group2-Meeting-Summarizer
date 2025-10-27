"use client";

import React from "react";
import type { ChangeEvent, FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Copy, Share, ThumbsUp, ThumbsDown, Send, Paperclip, Mic, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import ReactMarkdown from 'react-markdown';


interface Message {
  id: string;
  role: string;
  content: string;
}

interface ActionItem {
  id: string;
  priority: "high" | "medium" | "low";
  task: string;
  assignedTo: string;
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
  actionItems?: ActionItem[];
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
  transcriptSegments = [],
  actionItems = []
}: ChatInterfaceProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = React.useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = React.useState(false);
  const [transcriptCollapsed, setTranscriptCollapsed] = React.useState(false);
  const [actionItemsCollapsed, setActionItemsCollapsed] = React.useState(false);

  React.useEffect(() => {
    console.log("ChatInterface props:", {
      transcript,
      transcriptSegmentsLength: transcriptSegments.length,
      actionItemsLength: actionItems.length
    });
  }, [transcript, transcriptSegments, actionItems]);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="flex h-full overflow-hidden bg-[#111111]">
      {/* Left Side: Summary Section (50% width, full height) */}
      <div className={`flex flex-col min-h-0 border-r border-[#333333] transition-all duration-300 relative ${rightPanelCollapsed ? 'w-full' : 'w-1/2'}`}>
        {/* Horizontal Collapse Handle */}
        <div
          onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
          className="absolute right-0 top-0 bottom-0 w-1 bg-transparent hover:bg-[#00F5FF]/30 cursor-col-resize transition-all duration-200 z-50 group"
          title={rightPanelCollapsed ? "Show transcript & action items" : "Hide transcript & action items"}
        >
          <div className={`absolute top-1/2 -translate-y-1/2 w-3 h-12 bg-[#1A1A1A] group-hover:bg-[#00F5FF]/80 border border-[#333333] flex items-center justify-center transition-all duration-200 ${rightPanelCollapsed ? '-left-3 rounded-l-md' : '-right-3 rounded-r-md'}`}>
            {rightPanelCollapsed ? (
              <ChevronLeft className="h-3 w-3 text-gray-400 group-hover:text-white transition-colors duration-200" />
            ) : (
              <ChevronRight className="h-3 w-3 text-gray-400 group-hover:text-white transition-colors duration-200" />
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col min-h-0 relative bg-[#111111]">
          {messages && messages.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-20"></div>
          )}
          <ScrollArea className="flex-1 h-full overflow-y-auto">
            {/* Floating Header */}
            <div className="sticky top-0 z-10 px-6 pt-6 pb-6 bg-gradient-to-b from-[#111111] via-[#111111]/95 to-transparent">
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[#333333] bg-[#1A1A1A] shadow-lg">
                {chatTitle && (
                  <>
                    <h2 className="text-lg font-bold bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] bg-clip-text text-transparent leading-none">
                      {chatTitle}
                    </h2>
                    <div className="h-5 w-px bg-[#333333]"></div>
                  </>
                )}
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wide leading-none">Summary</h3>
                </div>
              </div>
            </div>
          <div className="px-6 pb-6">
            <div className="space-y-4">
              {messages && messages.length === 0 && !isLoading && !isUploading ? (
                <div className="flex flex-col items-center justify-center gap-4 min-h-[600px]">
                  <p className="text-sm text-gray-500 italic text-center max-w-xs">
                    Upload a meeting recording to generate an AI summary.
                  </p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] hover:from-[#00F5FF]/80 hover:to-[#06B6D4]/80 text-gray-900 font-semibold"
                  >
                    <Paperclip className="h-4 w-4 mr-2" />
                    Upload Meeting
                  </Button>
                </div>
              ) : null}
              {isUploading && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-6 min-h-[600px] max-w-md mx-auto">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-[#00F5FF] animate-pulse"></div>
                    <div className="h-3 w-3 rounded-full bg-[#06B6D4] animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="h-3 w-3 rounded-full bg-[#00F5FF] animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full">
                    <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] rounded-full animate-pulse"
                           style={{
                             width: uploadStatus?.includes('Uploading') ? '5%' :
                                    uploadStatus?.includes('Processing audio') ? '15%' :
                                    uploadStatus?.includes('Transcribing') ? '50%' :
                                    uploadStatus?.includes('Analyzing') ? '70%' :
                                    uploadStatus?.includes('Generating summary') ? '85%' :
                                    uploadStatus?.includes('Finalizing') ? '95%' : '5%',
                             transition: 'width 0.5s ease-in-out'
                           }}>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-[#00F5FF] font-medium mb-2">{uploadStatus || 'Processing your meeting...'}</p>
                    <p className="text-xs text-gray-500">This may take 2-3 minutes depending on file size</p>
                  </div>
                </div>
              )}
              {(messages || []).map((message) => (
                <div key={message.id} className="flex gap-3 group">
                  {message.role === "user" ? (
                    <>
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src="/placeholder.svg?height=32&width=32" />
                        <AvatarFallback className="bg-[#1A1A1A] border border-[#333333] text-white text-xs font-semibold">U</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 max-w-[85%]">
                        <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#333333] shadow-lg hover:shadow-xl transition-all duration-300">
                          <div className="text-sm text-white prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] text-black text-xs font-bold">AI</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 max-w-[85%]">
                        <div className="bg-[#111111] rounded-lg p-4 border border-[#333333] shadow-lg hover:shadow-xl transition-all duration-300">
                          <div className="text-sm text-white mb-3 prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                          <div className="flex items-center gap-2 pt-3 border-t border-[#333333]">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:bg-[#1A1A1A] hover:text-[#00F5FF] transition-all duration-200">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:bg-[#1A1A1A] hover:text-[#00F5FF] transition-all duration-200">
                              <Share className="h-3.5 w-3.5" />
                            </Button>
                            <div className="ml-auto flex items-center gap-2">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:bg-[#1A1A1A] hover:text-red-400 transition-all duration-200">
                                <ThumbsDown className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:bg-[#1A1A1A] hover:text-green-400 transition-all duration-200">
                                <ThumbsUp className="h-3.5 w-3.5" />
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
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-[#00F5FF] to-[#06B6D4] text-gray-900 text-xs font-bold">AI</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 max-w-[85%]">
                    <div className="bg-gradient-to-br from-[#00F5FF]/10 to-[#06B6D4]/5 backdrop-blur-sm rounded-2xl rounded-tl-sm p-4 border border-[#00F5FF]/30">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-[#00F5FF] animate-pulse"></div>
                        <div className="h-2 w-2 rounded-full bg-[#06B6D4] animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="h-2 w-2 rounded-full bg-[#00F5FF] animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        <span className="text-gray-400 text-xs ml-1">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
            {/* Chat Input - Sticky at bottom */}
            <div className="sticky bottom-0 z-10 px-6 pb-12 pt-12 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/95 to-transparent pointer-events-none"></div>
              <form onSubmit={handleSubmit} className="flex items-center gap-2 relative z-10">
            <div className="bg-[#1A1A1A] flex flex-1 items-center rounded-lg border border-[#333333] px-3 py-2 relative shadow-lg hover:border-[#00F5FF] focus-within:border-[#00F5FF] transition-all duration-200">
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
                className="h-8 w-8 p-0 hover:bg-[#00F5FF]/20 hover:text-[#00F5FF] transition-colors"
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
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-transparent text-gray-100"
                disabled={isLoading}
              />
              {!input && !isUploading && !isFocused && (
                <div className="absolute inset-y-0 left-14 flex items-center pointer-events-none">
                  <span className="bg-gradient-to-r from-[#00F5FF] via-[#06B6D4] to-[#00F5FF] bg-clip-text text-transparent text-sm font-medium bg-[length:200%_100%] animate-gradient-x">
                    Ask me anything...
                  </span>
                </div>
              )}
              {isUploading && (
                <div className="absolute inset-y-0 left-14 flex items-center pointer-events-none">
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
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-[#00F5FF]/20 hover:text-[#00F5FF] transition-colors">
                <Mic className="h-4 w-4" />
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!(input || '').trim() || isLoading}
                className="h-8 w-8 p-0 bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] hover:from-[#00D4E6] hover:to-[#0891B2] text-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl">
                <Send className="h-4 w-4" />
              </Button>
            </div>
              </form>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Right Side: Transcript & Action Items (50% width, stacked vertically) */}
      <div className={`flex flex-col min-h-0 transition-all duration-300 bg-[#111111] ${rightPanelCollapsed ? 'w-0 overflow-hidden' : 'w-1/2'}`}>
        <div className="flex flex-col w-full min-h-0 h-full">
        {/* Transcript Section (Top, 50% of right side) */}
        <div className={`flex flex-col border-b border-[#333333] transition-all duration-300 bg-[#111111] relative ${transcriptCollapsed ? 'h-0 overflow-hidden' : (actionItemsCollapsed ? 'h-full' : 'h-1/2')} min-h-0`}>
          {transcript && (
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-20"></div>
          )}
          <ScrollArea className="flex-1 overflow-y-auto">
              {/* Floating Header */}
              <div className="sticky top-0 z-10 px-6 pt-4 pb-4 bg-[#111111]">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
                  Transcript
                </h3>
              </div>
            <div className="px-6 pb-6">
              <div className="space-y-3">
                {transcript && transcript.length > 0 ? (
                  transcriptSegments.length > 0 ? (
                    transcriptSegments.map((segment, index) => (
                      <div key={index} className="bg-[#1A1A1A] rounded-lg p-3 border border-[#333333] hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono text-[#00F5FF] font-semibold">
                            {Math.floor(segment.start / 60)}:{String(Math.floor(segment.start % 60)).padStart(2, '0')} - {Math.floor(segment.end / 60)}:{String(Math.floor(segment.end % 60)).padStart(2, '0')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed">{segment.text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#333333]">
                      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{transcript}</p>
                    </div>
                  )
                ) : (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-sm text-gray-400 text-center max-w-xs">
                      Upload a meeting recording to see the transcript.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Unified Vertical Collapse Handle */}
        {!transcriptCollapsed && !actionItemsCollapsed && (
          <div className="relative w-full h-1 transition-colors duration-75 z-50 group cursor-row-resize bg-[#00F5FF]/20 hover:bg-[#00F5FF]/60">
            {/* Collapse Transcript (pull down) */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                setTranscriptCollapsed(true);
              }}
              className="absolute left-1/2 -translate-x-1/2 -top-3 h-3 w-12 bg-[#00F5FF]/0 group-hover:bg-[#00F5FF]/80 rounded-t-md flex items-center justify-center transition-all duration-75 cursor-pointer"
              title="Hide transcript"
            >
              <ChevronUp className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-75" />
            </div>

            {/* Collapse Action Items (pull up) */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                setActionItemsCollapsed(true);
              }}
              className="absolute left-1/2 -translate-x-1/2 -bottom-3 h-3 w-12 bg-[#00F5FF]/0 group-hover:bg-[#00F5FF]/80 rounded-b-md flex items-center justify-center transition-all duration-75 cursor-pointer"
              title="Hide action items"
            >
              <ChevronDown className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-75" />
            </div>
          </div>
        )}

        {/* Show Transcript Handle (when collapsed) */}
        {transcriptCollapsed && (
          <div className="relative w-full h-1 bg-gray-900/30 hover:bg-[#00F5FF]/60 cursor-row-resize transition-colors duration-75 z-50 group">
            <div
              onClick={() => {
                setTranscriptCollapsed(false);
              }}
              className="absolute left-1/2 -translate-x-1/2 -bottom-3 h-3 w-12 bg-[#00F5FF]/0 group-hover:bg-[#00F5FF]/80 rounded-b-md flex items-center justify-center transition-all duration-75"
              title="Show transcript"
            >
              <ChevronDown className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-75" />
            </div>
          </div>
        )}

        {/* Show Action Items Handle (when collapsed) */}
        {actionItemsCollapsed && (
          <div className="relative w-full h-1 bg-gray-900/30 hover:bg-[#00F5FF]/60 cursor-row-resize transition-colors duration-75 z-50 group">
            <div
              onClick={() => {
                setActionItemsCollapsed(false);
              }}
              className="absolute left-1/2 -translate-x-1/2 -top-3 h-3 w-12 bg-[#00F5FF]/0 group-hover:bg-[#00F5FF]/80 rounded-t-md flex items-center justify-center transition-all duration-75"
              title="Show action items"
            >
              <ChevronUp className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-75" />
            </div>
          </div>
        )}

        {/* Action Items Section (Bottom, 50% of right side) */}
        <div className={`flex flex-col transition-all duration-300 bg-[#111111] relative ${actionItemsCollapsed ? 'h-0 overflow-hidden' : (transcriptCollapsed ? 'h-full' : 'h-1/2')} min-h-0`}>
          {actionItems && actionItems.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#111111]/90 via-[#111111]/50 to-transparent pointer-events-none z-20"></div>
          )}
          <ScrollArea className="flex-1 overflow-y-auto">
              {/* Floating Header */}
              <div className="sticky top-0 z-10 px-6 pt-4 pb-4 bg-[#111111]">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
                  Action Items
                </h3>
              </div>
            <div className="px-6 pt-2 pb-6">
              {actionItems && actionItems.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {actionItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#1A1A1A] rounded-lg border border-[#333333] p-4 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between min-h-[110px]"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`h-2 w-2 rounded-full ${
                            item.priority === 'high' ? 'bg-red-500' :
                            item.priority === 'medium' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}></div>
                          <span className={`text-xs font-semibold uppercase tracking-wide ${
                            item.priority === 'high' ? 'text-red-400' :
                            item.priority === 'medium' ? 'text-yellow-400' :
                            'text-green-400'
                          }`}>
                            {item.priority}
                          </span>
                        </div>
                        <p className="text-sm text-white mb-3 leading-relaxed">{item.task}</p>
                      </div>
                      <div className="flex items-center gap-1.5 pt-2 border-t border-[#333333]">
                        <span className="text-xs text-gray-400">Assigned:</span>
                        <span className="text-sm font-semibold text-[#00F5FF]">
                          {item.assignedTo}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32">
                  <p className="text-sm text-gray-400 text-center max-w-xs">
                    Upload a meeting recording to see action items.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
        </div>
      </div>
    </div>
  );
}