"use client";

import React from "react";
import type { ChangeEvent, FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Copy, Share, ThumbsUp, ThumbsDown, Send, Paperclip, Mic, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";

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
    <div className="flex h-full overflow-hidden">
      {/* Left Side: Summary Section (50% width, full height) */}
      <div className={`flex flex-col min-h-0 border-r border-gray-700 transition-all duration-300 relative ${rightPanelCollapsed ? 'w-full' : 'w-1/2'}`}>
        {/* Horizontal Collapse Handle */}
        <div
          onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
          className="absolute right-0 top-0 bottom-0 w-1 bg-transparent hover:bg-[#00F5FF]/60 cursor-col-resize transition-colors duration-75 z-50 group"
          title={rightPanelCollapsed ? "Show transcript & action items" : "Hide transcript & action items"}
        >
          <div className={`absolute top-1/2 -translate-y-1/2 w-3 h-12 bg-[#00F5FF]/0 group-hover:bg-[#00F5FF]/80 flex items-center justify-center transition-all duration-75 ${rightPanelCollapsed ? '-left-3 rounded-l-md' : '-right-3 rounded-r-md'}`}>
            {rightPanelCollapsed ? (
              <ChevronLeft className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-75" />
            ) : (
              <ChevronRight className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-75" />
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col min-h-0 relative bg-gradient-to-b from-transparent via-cyan-400/5 to-gray-900/25">
          {messages && messages.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-20"></div>
          )}
          <ScrollArea className="flex-1 h-full overflow-y-auto">
            {/* Floating Header */}
            <div className="sticky top-0 z-10 px-6 pt-4 pb-8 bg-gradient-to-b from-black via-black/60 to-transparent">
              <div className="flex items-center gap-3">
                {chatTitle && (
                  <>
                    <h2 className="text-lg font-bold bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] bg-clip-text text-transparent leading-none">
                      {chatTitle}
                    </h2>
                    <div className="h-5 w-px bg-[#00F5FF]/30"></div>
                  </>
                )}
                <span className="h-2 w-2 rounded-full bg-gradient-to-r from-[#00F5FF] to-[#06B6D4]"></span>
                <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wide leading-none">Summary</h3>
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
                <div key={message.id} className="flex gap-3">
                  {message.role === "user" ? (
                    <>
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src="/placeholder.svg?height=32&width=32" />
                        <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-700 text-white text-xs font-semibold">JD</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 max-w-[85%]">
                        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl rounded-tl-sm p-4 border border-gray-700/50 shadow-lg">
                          <p className="text-sm text-gray-100 whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-[#00F5FF] to-[#06B6D4] text-gray-900 text-xs font-bold">AI</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 max-w-[85%]">
                        <div className="bg-gradient-to-br from-[#00F5FF]/10 to-[#06B6D4]/5 backdrop-blur-sm rounded-2xl rounded-tl-sm p-4 border border-[#00F5FF]/30 shadow-lg">
                          <p className="text-sm text-gray-100 mb-3 whitespace-pre-wrap leading-relaxed">{message.content}</p>
                          <div className="flex items-center gap-2 pt-2 border-t border-[#00F5FF]/20">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-[#00F5FF]/20 hover:text-[#00F5FF] transition-colors">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-[#00F5FF]/20 hover:text-[#00F5FF] transition-colors">
                              <Share className="h-3.5 w-3.5" />
                            </Button>
                            <div className="ml-auto flex items-center gap-2">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-red-500/20 hover:text-red-400 transition-colors">
                                <ThumbsDown className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-green-500/20 hover:text-green-400 transition-colors">
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
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none"></div>
              <form onSubmit={handleSubmit} className="flex items-center gap-2 relative z-10">
            <div className="bg-gray-900/50 backdrop-blur-sm flex flex-1 items-center rounded-xl border border-[#00F5FF]/30 px-3 py-2 relative shadow-lg hover:border-[#00F5FF] transition-colors">
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
                className="h-8 w-8 p-0 bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] hover:from-[#00F5FF]/80 hover:to-[#06B6D4]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                <Send className="h-4 w-4" />
              </Button>
            </div>
              </form>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Right Side: Transcript & Action Items (50% width, stacked vertically) */}
      <div className={`flex flex-col min-h-0 transition-all duration-300 ${rightPanelCollapsed ? 'w-0 overflow-hidden' : 'w-1/2'}`}>
        <div className="flex flex-col w-full min-h-0 h-full">
        {/* Transcript Section (Top, 50% of right side) */}
        <div className={`flex flex-col border-b-2 border-gray-700 transition-all duration-300 bg-gradient-to-b from-transparent via-cyan-400/5 to-gray-900/25 relative ${transcriptCollapsed ? 'h-0 overflow-hidden' : (actionItemsCollapsed ? 'h-full' : 'h-1/2')} min-h-0`}>
          {transcript && (
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-20"></div>
          )}
          <ScrollArea className="flex-1 overflow-y-auto">
              {/* Floating Header */}
              <div className="sticky top-0 z-10 px-6 pt-4 pb-8 bg-gradient-to-b from-black via-black/60 to-transparent">
                <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wide flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-gradient-to-r from-[#00F5FF] to-[#06B6D4]"></span>
                  Transcript
                </h3>
              </div>
            <div className="px-6 pb-6">
              <div className="space-y-3">
                {transcript && transcript.length > 0 ? (
                  transcriptSegments.length > 0 ? (
                    transcriptSegments.map((segment, index) => (
                      <div key={index} className="group relative pl-4 py-2 border-l-2 border-[#00F5FF]/40 hover:border-[#00F5FF] transition-colors">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-mono text-[#06B6D4] font-semibold bg-[#06B6D4]/10 px-2 py-0.5 rounded">
                            {Math.floor(segment.start / 60)}:{String(Math.floor(segment.start % 60)).padStart(2, '0')} - {Math.floor(segment.end / 60)}:{String(Math.floor(segment.end % 60)).padStart(2, '0')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-200 leading-relaxed">{segment.text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="pl-4 py-2 border-l-2 border-[#00F5FF]/40">
                      <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{transcript}</p>
                    </div>
                  )
                ) : (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-sm text-gray-500 italic text-center max-w-xs">
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
        <div className={`flex flex-col transition-all duration-300 bg-gradient-to-t from-transparent via-cyan-400/5 to-gray-900/25 relative ${actionItemsCollapsed ? 'h-0 overflow-hidden' : (transcriptCollapsed ? 'h-full' : 'h-1/2')} min-h-0`}>
          {actionItems && actionItems.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-20"></div>
          )}
          <ScrollArea className="flex-1 overflow-y-auto">
              {/* Floating Header */}
              <div className="sticky top-0 z-10 px-6 pt-4 pb-8 bg-gradient-to-b from-black via-black/60 to-transparent">
                <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wide flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-gradient-to-r from-[#06B6D4] to-[#00F5FF]"></span>
                  Action Items
                </h3>
              </div>
            <div className="px-6 pt-2 pb-6">
              {actionItems && actionItems.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {actionItems.map((item) => (
                    <div
                      key={item.id}
                      className="group bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 shadow-lg hover:shadow-xl hover:border-gray-600/50 transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between min-h-[110px]"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`h-2 w-2 rounded-full shadow-md ${
                            item.priority === 'high' ? 'bg-gradient-to-r from-red-400 to-red-600 shadow-red-500/50' :
                            item.priority === 'medium' ? 'bg-gradient-to-r from-yellow-400 to-amber-500 shadow-yellow-500/50' :
                            'bg-gradient-to-r from-emerald-400 to-green-600 shadow-green-500/50'
                          }`}></div>
                          <span className={`text-xs font-bold uppercase tracking-wider ${
                            item.priority === 'high' ? 'text-red-400' :
                            item.priority === 'medium' ? 'text-yellow-400' :
                            'text-emerald-400'
                          }`}>
                            {item.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-200 mb-3 leading-relaxed font-medium">{item.task}</p>
                      </div>
                      <div className="flex items-center gap-1.5 pt-2 border-t border-gray-700/50">
                        <span className="text-xs text-gray-500 font-medium">Assigned:</span>
                        <span className="text-sm font-semibold bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] bg-clip-text text-transparent">
                          {item.assignedTo}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32">
                  <p className="text-sm text-gray-500 italic text-center max-w-xs">
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