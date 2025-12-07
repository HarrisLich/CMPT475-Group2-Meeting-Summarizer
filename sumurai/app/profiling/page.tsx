'use client';
import { Suspense } from 'react';
import ProfileSection from '@/components/profile-page/components/profile-section';
import ProfileContent from '@/components/profile-page/components/profile-content';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic';

function ProfilingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showBanner, setShowBanner] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Check if user came from login flow (via query param or session storage)
    const fromLogin = searchParams.get('from') === 'login';
    const sessionFromLogin = sessionStorage.getItem('fromLogin') === 'true';

    // Show banner if: from login flow OR always on mobile
    if (fromLogin || sessionFromLogin || isMobile) {
      setShowBanner(true);
      // Clear the session storage flag after showing banner once
      if (sessionFromLogin) {
        sessionStorage.removeItem('fromLogin');
      }
    }
  }, [searchParams, isMobile]);
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-[#111111] via-[#111111] to-[#1A1A1A]">
        <Header />

        {/* Profile Content */}
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
          {/* Special App Engine Banner (directs new users to App Engine) */}
          {showBanner && (
            <Card className="border-[#00F5FF]/30 bg-[#1A1A1A]/30">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-[#00F5FF]">
                    SumurAI is ready to slash through your workload.
                  </p>
                  <Button
                    onClick={() => router.push('/core')}
                    size="sm"
                    variant="outline"
                    className="border-[#00F5FF] text-[#00F5FF] hover:bg-[#00F5FF] hover:text-black whitespace-nowrap"
                  >
                    Go to SumurAI
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <ProfileSection />
          <ProfileContent />
        </div>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}

export default function ProfilingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 border-4 border-[#00F5FF] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    }>
      <ProfilingContent />
    </Suspense>
  );
}