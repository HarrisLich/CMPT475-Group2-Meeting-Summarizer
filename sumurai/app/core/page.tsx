'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { User, Upload, FileText, CheckCircle, Share2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import AiChat from '@/components/ai-chat/components/ai-chat';

export default function CorePage() {
  const router = useRouter();
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);

  useEffect(() => {
    // Check if user has seen the welcome dialog before
    const hasSeenWelcome = localStorage.getItem('hasSeenAIEngineWelcome');
    if (!hasSeenWelcome) {
      setShowWelcomeDialog(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('hasSeenAIEngineWelcome', 'true');
    setShowWelcomeDialog(false);
  };

  return (
    <div className="min-h-screen bg-[#111111] text-white">
      {/* Welcome Dialog */}
      <Dialog open={showWelcomeDialog} onOpenChange={setShowWelcomeDialog}>
        <DialogContent className="bg-[#1A1A1A] border-[#333333] text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] bg-clip-text text-transparent">
              Welcome to the SumurAI Engine.
            </DialogTitle>
            <DialogDescription className="text-gray-400 mt-2">
              Transform your meeting recordings into actionable insights
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Flow Steps */}
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00F5FF] to-[#06B6D4] flex items-center justify-center flex-shrink-0">
                  <Upload className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">1. Upload Your Recording</h3>
                  <p className="text-sm text-gray-400">
                    Upload audio or video files of your meetings in supported formats
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00F5FF] to-[#06B6D4] flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">2. AI Processing</h3>
                  <p className="text-sm text-gray-400">
                    Our AI generates transcripts, summaries, and extracts action items automatically
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00F5FF] to-[#06B6D4] flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">3. Review & Organize</h3>
                  <p className="text-sm text-gray-400">
                    Review your summaries, transcripts, and action items in an organized dashboard
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00F5FF] to-[#06B6D4] flex items-center justify-center flex-shrink-0">
                  <Share2 className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">4. Share & Integrate</h3>
                  <p className="text-sm text-gray-400">
                    Export summaries or integrate with your favorite productivity tools
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy Notice */}
            <div className="border-t border-[#333333] pt-4">
              <h4 className="text-sm font-semibold text-white mb-2">Your Data & Privacy</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Your recordings are processed securely using our AI engine. We use your data solely to:
              </p>
              <ul className="text-xs text-gray-400 mt-2 space-y-1 ml-4">
                <li>• Generate transcripts and summaries of your meetings</li>
                <li>• Extract action items and key insights</li>
              </ul>
              <p className="text-xs text-gray-400 mt-2">
{                /*Your data is encrypted and never shared with third parties. */}We do not gather any analytics or personal user data. You may delete your recordings and user data at any time.            </p>
            </div>

            {/* Action Button */}
            <div className="flex justify-end space-x-3 pt-2">
              <Button
                onClick={handleAccept}
                className="bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] hover:from-[#00D4E6] hover:to-[#0891B2] text-black font-semibold"
              >
                Got it, let's start
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Header */}
      <header className="border-b border-gray-800 bg-[#111111] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4" onClick={() => router.push('/')}>
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