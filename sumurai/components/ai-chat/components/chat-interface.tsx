"use client";

import React from "react";
import type { ChangeEvent, FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Copy, Share, ThumbsUp, ThumbsDown, Send, Paperclip, Mic, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Users, Settings, Download, FileText, ListChecks, FileStack, Menu, Mail, Send as SendIcon, Loader2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { downloadMeetingData, type MeetingData, type DownloadType } from '@/lib/services/output-download';
import { NotificationService } from '@/lib/services/notifications';

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
  transcriptSegments?: Array<{start: number; end: number; text: string; speaker?: string; speaker_name?: string}>;
  actionItems?: ActionItem[];
  useSpeakerDiarization?: boolean;
  setUseSpeakerDiarization?: (value: boolean) => void;
  audioUrl?: string;
  onToggleSidebar?: () => void;
  meetingId?: string;
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
  actionItems = [],
  useSpeakerDiarization = false,
  setUseSpeakerDiarization,
  audioUrl,
  onToggleSidebar,
  meetingId
}: ChatInterfaceProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputLabelRef = React.useRef<HTMLLabelElement>(null);
  const [isFocused, setIsFocused] = React.useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = React.useState(false);
  const [transcriptCollapsed, setTranscriptCollapsed] = React.useState(false);
  const [actionItemsCollapsed, setActionItemsCollapsed] = React.useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = React.useState(false);
  const [showConsentDialog, setShowConsentDialog] = React.useState(false);
  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>({});
  const [mobileBottomSheet, setMobileBottomSheet] = React.useState<'transcript' | 'actions' | null>(null);
  const [notifyingItems, setNotifyingItems] = React.useState<Set<string>>(new Set());
  const [notificationStatus, setNotificationStatus] = React.useState<Record<string, 'success' | 'error' | null>>({});
  const [notifyingAll, setNotifyingAll] = React.useState(false);
  const downloadButtonRef = React.useRef<HTMLDivElement>(null);

  // Get unique speakers for color coding
  const uniqueSpeakers = React.useMemo(() => {
    // Ensure transcriptSegments is an array
    if (!Array.isArray(transcriptSegments)) {
      console.warn("transcriptSegments is not an array:", transcriptSegments);
      return [];
    }
    return Array.from(new Set(transcriptSegments.map(s => s.speaker).filter((speaker): speaker is string => Boolean(speaker))));
  }, [transcriptSegments]);

  const speakerColors: Record<string, string> = React.useMemo(() => {
    const colors: Record<string, string> = {};
    uniqueSpeakers.forEach((speaker, index) => {
      colors[speaker] = `hsl(${index * 137.5}, 70%, 50%)`;
    });
    return colors;
  }, [uniqueSpeakers]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  React.useEffect(() => {
    console.log("ChatInterface props updated:", {
      transcriptLength: transcript?.length || 0,
      segmentsCount: transcriptSegments?.length || 0,
      actionItemsCount: actionItems?.length || 0,
      hasTranscript: !!transcript && transcript.length > 0,
      hasSegments: transcriptSegments && transcriptSegments.length > 0,
      hasActionItems: actionItems && actionItems.length > 0,
      transcriptPreview: transcript?.substring(0, 100) || "none",
      segmentsPreview: transcriptSegments?.slice(0, 2) || [],
      actionItemsPreview: actionItems?.slice(0, 2) || []
    });
  }, [transcript, transcriptSegments, actionItems]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadButtonRef.current && !downloadButtonRef.current.contains(event.target as Node)) {
        setDownloadMenuOpen(false);
      }
    };

    if (downloadMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [downloadMenuOpen]);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log("[UPLOAD] File selected:", file?.name, "Size:", file?.size, "Type:", file?.type);
    console.log("[UPLOAD] onFileUpload handler available:", !!onFileUpload);
    
    if (file && onFileUpload) {
      console.log("[UPLOAD] Calling onFileUpload handler");
      onFileUpload(file);
    } else {
      if (!file) {
        console.error("[UPLOAD] No file selected!");
      }
      if (!onFileUpload) {
        console.error("[UPLOAD] onFileUpload handler is missing!");
        alert("Upload handler is not available. Please refresh the page.");
      }
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleDownload = (type: DownloadType) => {
    // Prepare meeting data from component props
    const meetingData: MeetingData = {
      summary: messages.find(m => m.role === 'assistant')?.content || '',
      transcript: transcript,
      transcriptSegments: transcriptSegments,
      actionItems: actionItems,
      meetingTitle: chatTitle || 'Meeting'
    };

    // Always export as PDF
    downloadMeetingData(type, meetingData, 'pdf');

    setDownloadMenuOpen(false);
  };

  const handleUploadClick = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    console.log("[UPLOAD] Upload button clicked");
    console.log("[UPLOAD] onFileUpload available:", !!onFileUpload);
    console.log("[UPLOAD] File input ref:", fileInputRef.current);
    console.log("[UPLOAD] isUploading:", isUploading);
    console.log("[UPLOAD] showConsentDialog state:", showConsentDialog);
    
    // Check if onFileUpload is available
    if (!onFileUpload) {
      console.error("[UPLOAD] onFileUpload handler is not available!");
      alert("Upload functionality is not available. Please refresh the page.");
      return;
    }
    
    // Check if file input ref is available
    if (!fileInputRef.current) {
      console.error("[UPLOAD] File input ref is not available!");
      alert("File input error. Please refresh the page.");
      return;
    }
    
    // Show consent dialog
    console.log("[UPLOAD] Showing consent dialog");
    setShowConsentDialog(true);
  };

  const handleConsentAccept = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    console.log("[UPLOAD] Consent accepted");
    
    // CRITICAL: Trigger file input BEFORE closing dialog
    // This preserves the user interaction context which browsers require
    const input = fileInputRef.current || document.getElementById('file-upload-input') as HTMLInputElement;
    const label = fileInputLabelRef.current || document.querySelector('label[for="file-upload-input"]') as HTMLLabelElement;
    
    if (!input) {
      console.error("[UPLOAD] File input not found!");
      setShowConsentDialog(false);
      alert("File input error. Please refresh the page.");
      return;
    }
    
    if (!onFileUpload) {
      console.error("[UPLOAD] onFileUpload handler missing!");
      setShowConsentDialog(false);
      alert("Upload handler not available. Please refresh the page.");
      return;
    }
    
    // Try to trigger file input immediately while user interaction is active
    let triggered = false;
    
    try {
      // Method 1: Click label (most reliable for hidden inputs)
      if (label) {
        console.log("[UPLOAD] Attempting label click");
        label.click();
        triggered = true;
        console.log("[UPLOAD] ✓ Label click executed");
      }
      
      // Method 2: Direct input click (if label didn't work)
      if (!triggered) {
        console.log("[UPLOAD] Attempting direct input click");
        
        // Temporarily make input accessible
        const originalDisplay = input.style.display;
        const originalVisibility = input.style.visibility;
        const originalPointerEvents = input.style.pointerEvents;
        
        // Make it clickable but invisible
        input.style.display = 'block';
        input.style.visibility = 'visible';
        input.style.pointerEvents = 'auto';
        input.style.position = 'fixed';
        input.style.left = '0';
        input.style.top = '0';
        input.style.width = '1px';
        input.style.height = '1px';
        input.style.opacity = '0';
        input.style.zIndex = '99999';
        
        // Trigger click
        input.focus();
        input.click();
        
        // Restore immediately
        requestAnimationFrame(() => {
          input.style.display = originalDisplay;
          input.style.visibility = originalVisibility;
          input.style.pointerEvents = originalPointerEvents;
          input.style.position = '';
          input.style.left = '';
          input.style.top = '';
          input.style.width = '';
          input.style.height = '';
          input.style.opacity = '';
          input.style.zIndex = '';
        });
        
        triggered = true;
        console.log("[UPLOAD] ✓ Direct input click executed");
      }
    } catch (error) {
      console.error("[UPLOAD] Error triggering file input:", error);
    }
    
    // Close dialog after attempting to trigger
    setShowConsentDialog(false);
    
    if (!triggered) {
      alert("Failed to open file picker. Please try clicking the paperclip icon (📎) in the chat input area instead.");
    }
  };

  const triggerFileInput = () => {
    console.log("[UPLOAD] triggerFileInput called");
    console.log("[UPLOAD] fileInputRef.current:", fileInputRef.current);
    console.log("[UPLOAD] onFileUpload:", !!onFileUpload);
    
    // First, try to find the input element
    let input: HTMLInputElement | null = fileInputRef.current;
    
    if (!input) {
      console.warn("[UPLOAD] File input ref is null, trying querySelector fallback");
      // Try to find the input element by querySelector as fallback
      input = document.querySelector('input[type="file"][accept*="audio"]') as HTMLInputElement;
      if (input) {
        console.log("[UPLOAD] Found file input via querySelector");
      } else {
        console.error("[UPLOAD] Could not find file input element!");
        alert("File input error. Please refresh the page and try again.");
        return;
      }
    }

    if (!onFileUpload) {
      console.error("[UPLOAD] onFileUpload handler is missing!");
      alert("Upload handler is not available. Please refresh the page.");
      return;
    }

    // Verify input is in the DOM
    if (!input.isConnected) {
      console.error("[UPLOAD] File input is not connected to DOM!");
      alert("File input is not available. Please refresh the page.");
      return;
    }

    // Try multiple methods to trigger the file input
    let success = false;
    
    // Method 1: Direct click (most reliable)
    try {
      console.log("[UPLOAD] Method 1: Direct click()");
      input.click();
      success = true;
      console.log("[UPLOAD] ✓ Direct click() succeeded");
    } catch (error) {
      console.warn("[UPLOAD] Method 1 failed:", error);
    }

    // Method 2: MouseEvent dispatch (fallback)
    if (!success) {
      try {
        console.log("[UPLOAD] Method 2: MouseEvent dispatch");
        const event = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
          buttons: 1
        });
        input.dispatchEvent(event);
        success = true;
        console.log("[UPLOAD] ✓ MouseEvent dispatch succeeded");
      } catch (error) {
        console.warn("[UPLOAD] Method 2 failed:", error);
      }
    }

    // Method 3: Focus and click (another fallback)
    if (!success) {
      try {
        console.log("[UPLOAD] Method 3: Focus then click");
        input.focus();
        input.click();
        success = true;
        console.log("[UPLOAD] ✓ Focus + click succeeded");
      } catch (error) {
        console.warn("[UPLOAD] Method 3 failed:", error);
      }
    }

    if (!success) {
      console.error("[UPLOAD] All methods failed to trigger file input");
      alert("Failed to open file picker. Please try clicking the paperclip icon (📎) in the chat input area instead.");
    } else {
      console.log("[UPLOAD] File input triggered successfully!");
    }
  };

  const handleNotifyActionItem = async (actionItemId: string) => {
    // Validate that actionItemId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(actionItemId)) {
      console.error("[NOTIFICATION] Invalid action item ID format:", actionItemId);
      alert("Cannot send notification: Action item ID is invalid. Please refresh the page to reload action items.");
      setNotificationStatus(prev => ({ ...prev, [actionItemId]: 'error' }));
      return;
    }
    
    setNotifyingItems(prev => new Set(prev).add(actionItemId));
    setNotificationStatus(prev => ({ ...prev, [actionItemId]: null }));

    try {
      const result = await NotificationService.notifyActionItem(actionItemId);
      setNotificationStatus(prev => ({ ...prev, [actionItemId]: 'success' }));
      setTimeout(() => {
        setNotificationStatus(prev => {
          const updated = { ...prev };
          delete updated[actionItemId];
          return updated;
        });
      }, 3000);
    } catch (err) {
      console.error("Error sending notification:", err);
      setNotificationStatus(prev => ({ ...prev, [actionItemId]: 'error' }));
      setTimeout(() => {
        setNotificationStatus(prev => {
          const updated = { ...prev };
          delete updated[actionItemId];
          return updated;
        });
      }, 5000);
    } finally {
      setNotifyingItems(prev => {
        const updated = new Set(prev);
        updated.delete(actionItemId);
        return updated;
      });
    }
  };

  const handleNotifyAll = async () => {
    if (!meetingId) {
      alert("Meeting ID not available. Cannot send notifications.");
      return;
    }

    setNotifyingAll(true);
    try {
      const result = await NotificationService.notifyAllActionItems(meetingId);
      alert(`Notifications sent! ${result.notified} notified, ${result.skipped} skipped.`);
    } catch (err) {
      console.error("Error sending notifications:", err);
      alert(`Failed to send notifications: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setNotifyingAll(false);
    }
  };

  const handleConsentDecline = () => {
    console.log("[UPLOAD] Consent declined, closing dialog");
    setShowConsentDialog(false);
  };

  return (
    <div className="flex h-full overflow-hidden bg-[#111111]">
      {/* Left Side: Summary Section - Full width on mobile, 50% on desktop */}
      <div className={`flex flex-col min-h-0 border-r border-[#333333] transition-all duration-300 relative ${rightPanelCollapsed ? 'w-full' : 'w-full md:w-1/2'}`}>
        {/* Horizontal Collapse Handle - Hidden on mobile */}
        <div
          onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
          className="hidden md:block absolute right-0 top-0 bottom-0 w-1 bg-transparent hover:bg-[#00F5FF]/30 cursor-col-resize transition-all duration-200 z-50 group"
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
            <div className="sticky top-0 z-10 px-6 pt-6 pb-3 bg-gradient-to-b from-[#111111] via-[#111111]/95 to-transparent">
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-[#333333] bg-[#1A1A1A] shadow-lg">
                <div className="flex items-center gap-3">
                  {/* Mobile Menu Button */}
                  {onToggleSidebar && (
                    <Button
                      onClick={onToggleSidebar}
                      variant="ghost"
                      className="h-8 w-8 p-0 md:hidden flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#00F5FF]/10 border border-[#333333] hover:border-[#00F5FF]/50 transition-all"
                    >
                      <Menu className="h-4 w-4" />
                    </Button>
                  )}
                  {chatTitle && (
                    <>
                      <h2 className="text-lg font-bold bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] bg-clip-text text-transparent leading-none">
                        {chatTitle.replace(/^#{1,6}\s+/, '')}
                      </h2>
                      <div className="h-5 w-px bg-[#333333]"></div>
                    </>
                  )}
                </div>

                {/* Mobile Quick Access Buttons - Only show when there's content */}
                <div className="flex items-center gap-2">
                  {/* Transcript Button - Mobile Only */}
                  {transcript && (
                    <Button
                      onClick={() => setMobileBottomSheet(mobileBottomSheet === 'transcript' ? null : 'transcript')}
                      variant="ghost"
                      className="md:hidden h-8 w-8 p-0 flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#00F5FF]/10 border border-[#333333] hover:border-[#00F5FF]/50 transition-all"
                      title="View Transcript"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Action Items Button - Mobile Only */}
                  {actionItems && actionItems.length > 0 && (
                    <Button
                      onClick={() => setMobileBottomSheet(mobileBottomSheet === 'actions' ? null : 'actions')}
                      variant="ghost"
                      className="md:hidden h-8 w-8 p-0 flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#00F5FF]/10 border border-[#333333] hover:border-[#00F5FF]/50 transition-all"
                      title="View Action Items"
                    >
                      <ListChecks className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Export/Download Button with Dropdown */}
                  {messages && messages.length > 0 && (
                    <div className="relative" ref={downloadButtonRef}>
                      <Button
                        onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
                        variant="ghost"
                        className="h-8 w-8 p-0 flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#00F5FF]/10 border border-[#333333] hover:border-[#00F5FF]/50 transition-all"
                      >
                        <Download className="h-4 w-4" />
                      </Button>

                    {/* Dropdown Menu */}
                    {downloadMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-[#1A1A1A] border border-[#333333] rounded-lg shadow-xl overflow-hidden z-50">
                        <div className="py-1">
                          <button
                            onClick={() => handleDownload('summary')}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#00F5FF]/10 hover:text-white transition-colors"
                          >
                            <FileText className="h-4 w-4 text-[#00F5FF]" />
                            <span>Export Summary</span>
                          </button>
                          <button
                            onClick={() => handleDownload('transcript')}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#00F5FF]/10 hover:text-white transition-colors"
                          >
                            <FileText className="h-4 w-4 text-[#00F5FF]" />
                            <span>Export Transcript</span>
                          </button>
                          <button
                            onClick={() => handleDownload('action-items')}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#00F5FF]/10 hover:text-white transition-colors"
                          >
                            <ListChecks className="h-4 w-4 text-[#00F5FF]" />
                            <span>Export Action Items</span>
                          </button>
                          <div className="border-t border-[#333333] my-1"></div>
                          <button
                            onClick={() => handleDownload('all')}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white font-semibold hover:bg-[#00F5FF]/20 transition-colors"
                          >
                            <FileStack className="h-4 w-4 text-[#00F5FF]" />
                            <span>Export All</span>
                          </button>
                        </div>
                      </div>
                    )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          <div className="px-6 pb-6 pt-3">
            <div className="space-y-4">
              {messages && messages.length === 0 && !isLoading && !isUploading ? (
                <div className="flex flex-col items-center justify-center gap-6 min-h-[600px]">
                  <p className="text-sm text-gray-400 text-center max-w-xs">
                    Upload a meeting recording to generate an AI summary.
                  </p>

                  <div className="flex flex-col items-center gap-4">
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleUploadClick(e);
                      }}
                      size="lg"
                      type="button"
                      disabled={isUploading || !onFileUpload}
                      className="bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] hover:from-[#00F5FF]/90 hover:to-[#06B6D4]/90 text-black font-semibold shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-6 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Paperclip className="h-5 w-5 mr-2" />
                      Upload Meeting
                    </Button>

                    {/* Mode Toggle - only show on initial upload page */}
                    {onFileUpload && setUseSpeakerDiarization && messages.length === 0 && !isUploading && (
                      <div className="flex flex-col items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setUseSpeakerDiarization(!useSpeakerDiarization)}
                          className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-[#333333] hover:border-[#00F5FF]/30 transition-all duration-200"
                        >
                          <span className={`text-xs font-medium transition-colors ${!useSpeakerDiarization ? 'text-[#00F5FF]' : 'text-gray-500'}`}>
                            Fast
                          </span>
                          <div className="relative w-9 h-5 bg-[#333333] rounded-full transition-colors duration-200">
                            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] rounded-full transition-transform duration-200 shadow-sm ${useSpeakerDiarization ? 'translate-x-4' : 'translate-x-0'}`}></div>
                          </div>
                          <span className={`text-xs font-medium transition-colors ${useSpeakerDiarization ? 'text-[#00F5FF]' : 'text-gray-500'}`}>
                            Diarized
                          </span>
                        </button>
                        <span className="text-xs text-gray-500">
                          {useSpeakerDiarization ? '<2 Min • identifies speakers' : '~2-3 Min • no speakers'}
                        </span>
                      </div>
                    )}
                  </div>

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
                             width: uploadStatus?.includes('Uploading') ? '10%' :
                                    uploadStatus?.includes('Validating') ? '20%' :
                                    uploadStatus?.includes('Processing meeting') ? '60%' :
                                    uploadStatus?.includes('Finalizing') ? '95%' :
                                    uploadStatus?.includes('Complete') ? '100%' : '10%',
                             transition: 'width 0.5s ease-in-out'
                           }}>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-[#00F5FF] font-medium mb-2">{uploadStatus || 'Processing your meeting...'}</p>
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
                          <div className="text-sm text-white prose prose-invert prose-sm max-w-none prose-headings:text-white prose-headings:font-bold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:text-gray-200 prose-li:text-gray-200 prose-strong:text-[#00F5FF] prose-ul:list-disc prose-ol:list-decimal prose-li:marker:text-[#06B6D4]">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
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
                          <div className="text-sm text-white mb-3">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                h1: ({node, ...props}) => <h1 className="text-3xl font-extrabold text-[#00F5FF] mb-4" {...props} />,
                                h2: ({node, ...props}) => <h2 className="text-xl font-extrabold text-[#00F5FF] mb-3" {...props} />,
                                h3: ({node, ...props}) => <h3 className="text-lg font-bold text-[#00F5FF] mb-2 mt-4" {...props} />,
                                p: ({node, ...props}) => <p className="text-gray-200 mb-3 leading-relaxed" {...props} />,
                                ul: ({node, ...props}) => <ul className="list-disc ml-6 my-3 space-y-1" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal ml-6 my-3 space-y-1" {...props} />,
                                li: ({node, ...props}) => <li className="text-gray-200" {...props} />,
                                strong: ({node, ...props}) => <strong className="text-[#00F5FF] font-bold" {...props} />,
                                em: ({node, ...props}) => <em className="text-gray-300 italic" {...props} />,
                                code: ({node, ...props}) => <code className="bg-[#1A1A1A] px-1 py-0.5 rounded text-[#00F5FF] text-xs" {...props} />
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
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
              <label
                ref={fileInputLabelRef}
                htmlFor="file-upload-input"
                style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0, pointerEvents: 'auto', visibility: 'visible' }}
                aria-hidden="true"
              >
                Upload file
              </label>
              <input
                ref={fileInputRef}
                id="file-upload-input"
                type="file"
                accept="audio/*,video/*,.mp3,.wav,.m4a,.flac,.ogg,.webm"
                onChange={handleFileSelect}
                style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}
                tabIndex={-1}
                aria-hidden="true"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-[#00F5FF]/20 hover:text-[#00F5FF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleUploadClick(e);
                }}
                disabled={isUploading || !onFileUpload}
                title={!onFileUpload ? "Upload not available" : "Upload meeting recording"}
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

      {/* Right Side: Transcript & Action Items - Hidden on mobile, 50% width on desktop */}
      <div className={`hidden md:flex flex-col min-h-0 transition-all duration-300 bg-[#111111] ${rightPanelCollapsed ? 'w-0 overflow-hidden' : 'md:w-1/2'}`}>
        <div className="flex flex-col w-full min-h-0 h-full">
        {/* Transcript Section (Top, 50% of right side) */}
        <div className={`flex flex-col border-b border-[#333333] transition-all duration-300 bg-[#111111] relative ${transcriptCollapsed ? 'h-0 overflow-hidden' : (actionItemsCollapsed ? 'h-full' : 'h-1/2')} min-h-0`}>
          {transcript && (
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-20"></div>
          )}
          <ScrollArea className="flex-1 overflow-y-auto">
              {/* Floating Header with Audio Player */}
              <div className="sticky top-0 z-10 px-6 pt-4 pb-4 bg-[#111111]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
                    Transcript
                  </h3>
                </div>
                {/* Audio Player */}
                {audioUrl && (
                  <div className="bg-[#1A1A1A] rounded-lg border border-[#333333] p-3 mb-3">
                    <audio
                      key={audioUrl}
                      controls
                      className="w-full h-8"
                      style={{
                        filter: 'hue-rotate(180deg) saturate(2)',
                      }}
                    >
                      <source src={audioUrl} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
              </div>
            <div className="px-6 pb-6">
              <div className="space-y-3">
                {(transcript && transcript.length > 0) || (transcriptSegments && transcriptSegments.length > 0) ? (
                  transcriptSegments && transcriptSegments.length > 0 ? (
                    <div className="space-y-3">
                      {transcriptSegments.map((segment, index) => (
                        <div key={index} className="bg-[#1A1A1A] rounded-lg p-3 border border-[#333333] hover:shadow-lg transition-all duration-300">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {segment.speaker && (
                              <Badge 
                                variant="outline" 
                                className="text-xs"
                                style={{ 
                                  borderColor: speakerColors[segment.speaker] || '#666',
                                  color: speakerColors[segment.speaker] || '#fff'
                                }}
                              >
                                {segment.speaker_name || segment.speaker}
                              </Badge>
                            )}
                            <span className="text-xs font-mono text-[#00F5FF] font-semibold">
                              {formatTime(segment.start)} - {formatTime(segment.end)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 leading-relaxed flex-1 whitespace-pre-wrap">
                            {segment.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                  <div className="border-l-2 border-[#333333] pl-4">
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
              <div className="sticky top-0 z-10 px-6 pt-4 pb-4 bg-[#111111] flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
                  Action Items
                </h3>
                {meetingId && actionItems && actionItems.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleNotifyAll}
                    disabled={notifyingAll}
                    className="text-xs border-[#00F5FF] text-[#00F5FF] hover:bg-[#00F5FF] hover:text-black"
                  >
                    {notifyingAll ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <SendIcon className="h-3 w-3 mr-1" />
                        Notify All
                      </>
                    )}
                  </Button>
                )}
              </div>
            <div className="px-6 pt-2 pb-6">
              {actionItems && actionItems.length > 0 ? (
                (() => {
                  // Group action items by assigned person
                  const groupedByPerson: Record<string, ActionItem[]> = {};
                  actionItems.forEach((item) => {
                    const person = item.assignedTo || "Unassigned";
                    if (!groupedByPerson[person]) {
                      groupedByPerson[person] = [];
                    }
                    groupedByPerson[person].push(item);
                  });

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {Object.entries(groupedByPerson).map(([person, items]) => {
                        const isExpanded = expandedGroups[person] ?? false;
                        const ITEMS_TO_SHOW = 1;
                        const hasMore = items.length > ITEMS_TO_SHOW;
                        const displayedItems = isExpanded ? items : items.slice(0, ITEMS_TO_SHOW);

                        return (
                          <div
                            key={person}
                            className="bg-[#1A1A1A] rounded-lg border border-[#333333] p-4 shadow-lg hover:shadow-xl transition-all duration-300"
                          >
                            {/* Person Header */}
                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#333333]">
                              {person === "Unassigned" ? (
                                <span className="text-base font-semibold text-[#00F5FF]">
                                  {person}
                                </span>
                              ) : (
                                <>
                                  <span className="text-xs text-gray-400">Assigned to:</span>
                                  <span className="text-base font-semibold text-[#00F5FF]">
                                    {person}
                                  </span>
                                </>
                              )}
                              <span className="text-xs text-gray-500 ml-auto">
                                {items.length} {items.length === 1 ? 'item' : 'items'}
                              </span>
                            </div>

                            {/* Action Items List */}
                            <div className="space-y-3">
                              {displayedItems.map((item, index) => (
                                <div
                                  key={item.id}
                                  className="bg-[#0F0F0F] rounded-md p-3 border border-[#2A2A2A]"
                                >
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
                                    <span className="text-xs text-gray-500 ml-auto">
                                      #{index + 1}
                                    </span>
                                  </div>
                                  <p className="text-sm text-white leading-relaxed mb-2">{item.task}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleNotifyActionItem(item.id)}
                                      disabled={notifyingItems.has(item.id)}
                                      className="text-xs h-7 border-[#00F5FF]/50 text-[#00F5FF] hover:bg-[#00F5FF] hover:text-black"
                                    >
                                      {notifyingItems.has(item.id) ? (
                                        <>
                                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                          Sending...
                                        </>
                                      ) : notificationStatus[item.id] === 'success' ? (
                                        <>
                                          <Mail className="h-3 w-3 mr-1" />
                                          Sent!
                                        </>
                                      ) : notificationStatus[item.id] === 'error' ? (
                                        <>
                                          <Mail className="h-3 w-3 mr-1" />
                                          Failed
                                        </>
                                      ) : (
                                        <>
                                          <Mail className="h-3 w-3 mr-1" />
                                          Notify
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Expand/Collapse Button */}
                            {hasMore && (
                              <button
                                onClick={() => setExpandedGroups(prev => ({
                                  ...prev,
                                  [person]: !isExpanded
                                }))}
                                className="w-full mt-3 py-2 text-xs font-medium text-[#00F5FF] hover:text-[#06B6D4] transition-colors flex items-center justify-center gap-1"
                              >
                                {isExpanded ? (
                                  <>
                                    Show Less
                                    <ChevronUp className="w-3 h-3" />
                                  </>
                                ) : (
                                  <>
                                    Show {items.length - ITEMS_TO_SHOW} More
                                    <ChevronDown className="w-3 h-3" />
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
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

      {/* Consent Dialog */}
      {showConsentDialog && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            // Close dialog if clicking on backdrop (not the dialog content)
            if (e.target === e.currentTarget) {
              console.log("[UPLOAD] Backdrop clicked, closing dialog");
              setShowConsentDialog(false);
            }
          }}
        >
          <div 
            className="bg-[#1A1A1A] border border-[#333333] rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()} // Prevent backdrop click from closing when clicking inside dialog
          >
            {/* Header */}
            <div className="border-b border-[#333333] px-4 md:px-6 py-3 md:py-4 flex-shrink-0">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#00F5FF]/10 border border-[#00F5FF]/30 flex items-center justify-center">
                  <svg className="w-4 h-4 md:w-5 md:h-5 text-[#00F5FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-bold text-white">Data Privacy Notice</h3>
                  <p className="text-xs text-gray-400">Please review before uploading</p>
                </div>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="px-4 md:px-6 py-3 md:py-5 space-y-3 md:space-y-4 overflow-y-auto flex-1">
              <p className="text-xs md:text-sm text-gray-300 leading-relaxed">
                <span className="font-semibold text-[#00F5FF]">Important:</span> Do not upload recordings containing sensitive information.
              </p>

              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Avoid uploading:</p>
                <ul className="space-y-1 md:space-y-1.5 text-xs md:text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-[#00F5FF]/60 mt-0.5 text-xs">▸</span>
                    <span>Personal identifying information</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#00F5FF]/60 mt-0.5 text-xs">▸</span>
                    <span>Financial or payment data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#00F5FF]/60 mt-0.5 text-xs">▸</span>
                    <span>Health or medical records</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#00F5FF]/60 mt-0.5 text-xs">▸</span>
                    <span>Confidential business information</span>
                  </li>
                </ul>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                Your audio will be processed by AI models. While we prioritize security, please avoid uploading sensitive content to minimize risk.
              </p>
            </div>

            {/* Footer */}
            <div className="bg-[#111111] border-t border-[#333333] px-4 md:px-6 py-3 md:py-4 flex items-center justify-end gap-2 md:gap-3 flex-shrink-0">
              <Button
                onClick={handleConsentDecline}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white hover:bg-[#1A1A1A] border border-[#333333] hover:border-[#00F5FF]/30 transition-all text-xs md:text-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleConsentAccept(e);
                }}
                size="sm"
                type="button"
                className="bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] hover:from-[#00F5FF]/90 hover:to-[#06B6D4]/90 text-gray-900 font-semibold text-xs md:text-sm whitespace-nowrap"
              >
                I Understand & Consent
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Sheet for Transcript and Action Items */}
      {mobileBottomSheet && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileBottomSheet(null)}
          />

          {/* Bottom Sheet */}
          <div className="relative w-full bg-[#111111] rounded-t-2xl border-t border-[#333333] max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#333333]">
              <h3 className="text-lg font-bold text-white">
                {mobileBottomSheet === 'transcript' ? 'Transcript' : 'Action Items'}
              </h3>
              <Button
                onClick={() => setMobileBottomSheet(null)}
                variant="ghost"
                className="h-8 w-8 p-0 text-gray-400 hover:text-white"
              >
                <ChevronDown className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 overflow-y-auto">
              {mobileBottomSheet === 'transcript' && transcript && (
                <div className="p-4">
                  {/* Audio Player */}
                  {audioUrl && (
                    <div className="mb-4 p-3 bg-[#1A1A1A] rounded-lg border border-[#333333]">
                      <audio controls className="w-full" src={audioUrl}>
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}

                  {/* Transcript Content */}
                  <div className="space-y-2">
                    {transcriptSegments && transcriptSegments.length > 0 ? (
                      <>
                        {transcriptSegments.map((segment, index) => (
                          <div key={index} className="p-3 bg-[#1A1A1A] rounded-lg border border-[#333333]">
                            <div className="flex items-start gap-2 mb-1">
                              <span className="text-xs text-[#00F5FF] font-mono">
                                {formatTime(segment.start)}
                              </span>
                              {segment.speaker && (
                                <span
                                  className="text-xs font-semibold px-2 py-0.5 rounded"
                                  style={{
                                    backgroundColor: speakerColors[segment.speaker] + '20',
                                    color: speakerColors[segment.speaker]
                                  }}
                                >
                                  {segment.speaker_name || segment.speaker}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-300">{segment.text}</p>
                          </div>
                        ))}
                      </>
                    ) : (
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{transcript}</p>
                    )}
                  </div>
                </div>
              )}

              {mobileBottomSheet === 'actions' && actionItems && actionItems.length > 0 && (
                <div className="p-4 space-y-3">
                  {actionItems.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="p-4 bg-[#1A1A1A] rounded-lg border border-[#333333] hover:border-[#00F5FF]/30 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${
                          item.priority === 'high' ? 'bg-red-500' :
                          item.priority === 'medium' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white mb-2">{item.task}</p>
                          <div className="flex items-center gap-2 text-xs">
                            <Badge variant="outline" className="text-gray-400 border-[#333333]">
                              {item.assignedTo}
                            </Badge>
                            <Badge variant="outline" className={`border-[#333333] ${
                              item.priority === 'high' ? 'text-red-400' :
                              item.priority === 'medium' ? 'text-yellow-400' :
                              'text-green-400'
                            }`}>
                              {item.priority}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}