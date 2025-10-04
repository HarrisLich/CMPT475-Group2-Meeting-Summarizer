'use client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import ProfileHeader from '@/components/profile-page/components/profile-header';
import ProfileContent from '@/components/profile-page/components/profile-content';

export default function ProfilingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#111111] via-[#111111] to-[#1A1A1A]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#111111]/80 backdrop-blur-lg border-b border-[#333333]">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => router.back()}
              variant="outline"
              size="sm"
              className="border-[#333333] text-white hover:bg-[#1A1A1A]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 flex items-center justify-center">
                <img src="/sumurai-icon-blue.png" alt="SumurAI Logo" className="w-8 h-8 rounded-lg" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] bg-clip-text text-transparent">
                SumurAI
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Profile Content */}
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        <ProfileHeader />
        <ProfileContent />
      </div>
    </div>
  );
}