'use client';

import { useRouter } from 'next/navigation';
import { User } from 'lucide-react';
import AiChat from '@/components/ai-chat/components/ai-chat';

export default function CorePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#111111] text-white">
      {/* Custom Header */}
      <header className="border-b border-gray-800 bg-[#111111] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/')}
              className="text-[#00F5FF] hover:text-[#06B6D4] transition-colors"
            >
              ← 
            </button>
            <div className="h-6 w-px bg-gray-600" />
            <img src="/sumurai-icon-blue.png" alt="SumurAI Logo" className="w-10 h-10 rounded-xl" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] bg-clip-text text-transparent">
              SumurAI
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-400">AI Ready</span>
            </div>
            <button
              onClick={() => router.push('/profiling')}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] hover:from-[#00D4E6] hover:to-[#0891B2] flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl"
              title="Profile"
            >
              <User className="w-5 h-5 text-black" />
            </button>
          </div>
        </div>
      </header>

      {/* AI Chat Interface */}
      <div className="h-[calc(100vh-80px)]">
        <AiChat />
      </div>
    </div>
  );
}