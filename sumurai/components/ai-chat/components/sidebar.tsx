"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Star,
  Archive,
  Puzzle,
  Search,
  MessageCircle,
  Settings,
  HelpCircle,
  User,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Chat {
  id: string;
  title: string;
  preview: string;
  timestamp: Date;
}

interface SidebarProps {
  chats: Chat[];
  selectedChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
}

export function Sidebar({ chats, selectedChatId, onNewChat, onSelectChat }: SidebarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);

  const filteredChats = chats.filter(
    (chat) =>
      chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={cn(
      "bg-[#111111] flex flex-col border-r border-[#333333] h-full transition-all duration-300 relative",
      isCollapsed ? "w-16" : "w-72"
    )}>
      {/* Collapse/Expand Handle */}
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute right-0 top-0 bottom-0 w-1 bg-transparent hover:bg-[#00F5FF]/30 cursor-col-resize transition-all duration-200 z-50 group"
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <div className="absolute top-1/2 -translate-y-1/2 right-0 w-3 h-12 bg-[#1A1A1A] group-hover:bg-[#00F5FF]/80 border border-[#333333] rounded-l-md flex items-center justify-center transition-all duration-200">
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3 text-gray-400 group-hover:text-white transition-colors duration-200" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-gray-400 group-hover:text-white transition-colors duration-200" />
          )}
        </div>
      </div>

      {/* Logo & Profile Header */}
      <div className="border-b border-[#333333] p-4 flex-shrink-0">
        {!isCollapsed ? (
          <>
            {/* Logo and Profile on same line */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3 cursor-pointer" onClick={() => router.push('/')}>
                <img src="/sumurai-icon-blue.png" alt="SumurAI Logo" className="w-8 h-8 rounded-lg" />
                <span className="text-xl font-bold text-white">
                  SumurAI
                </span>
              </div>
              <button
                onClick={() => router.push('/profiling')}
                className="w-8 h-8 rounded-full bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] hover:from-[#00D4E6] hover:to-[#0891B2] flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl"
                title="Profile"
              >
                <User className="w-4 h-4 text-black" />
              </button>
            </div>

            <Button className="w-full bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] hover:from-[#00D4E6] hover:to-[#0891B2] text-black font-semibold shadow-lg hover:shadow-xl transition-all duration-300" onClick={onNewChat}>
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </>
        ) : (
          <>
            <img
              src="/sumurai-icon-blue.png"
              alt="SumurAI Logo"
              className="w-8 h-8 rounded-lg mx-auto cursor-pointer mb-3"
              onClick={() => router.push('/')}
            />
            <Button className="w-full p-2 bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] hover:from-[#00D4E6] hover:to-[#0891B2] shadow-lg" onClick={onNewChat} title="New Chat">
              <Plus className="w-4 h-4 text-black" />
            </Button>
          </>
        )}
      </div>

      {/* Recent Chats */}
      <div className="flex flex-col flex-1 min-h-0">
        {!isCollapsed && (
          <div className="px-4 py-2 flex-shrink-0">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
                Recent Chats
              </h3>
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <div className="relative">
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-1 px-2 pb-4">
              {filteredChats.map((chat) => (
                <Button
                  key={chat.id}
                  variant="ghost"
                  onClick={() => onSelectChat(chat.id)}
                  className={cn(
                    "h-auto w-full p-3 text-left rounded-lg transition-all duration-300",
                    selectedChatId === chat.id
                      ? "bg-[#1A1A1A] border border-[#333333] shadow-lg hover:shadow-xl"
                      : "hover:bg-[#1A1A1A] border border-transparent hover:border-[#333333]",
                    isCollapsed ? "justify-center" : "justify-start"
                  )}
                  title={isCollapsed ? chat.title : undefined}
                >
                  {isCollapsed ? (
                    <MessageCircle className="h-4 w-4 text-gray-400" />
                  ) : (
                    <div className="flex w-full items-start gap-2">
                      <MessageCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-white">{chat.title}</div>
                        <div className="mt-0.5 truncate text-xs text-gray-400">
                          {chat.preview}
                        </div>
                      </div>
                    </div>
                  )}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t p-[1px] flex-shrink-0">
        {!isCollapsed ? (
          <div className="space-y-1">
            <Button variant="ghost" className="text-muted-foreground w-full justify-start gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            <Button variant="ghost" className="text-muted-foreground w-full justify-start gap-2">
              <HelpCircle className="h-4 w-4" />
              Help & Support
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              variant="ghost"
              className="w-full p-2 text-muted-foreground"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              className="w-full p-2 text-muted-foreground"
              title="Help & Support"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}