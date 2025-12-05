'use client';
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

export default function ProfilingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user came from login flow (via query param or session storage)
    const fromLogin = searchParams.get('from') === 'login';
    const sessionFromLogin = sessionStorage.getItem('fromLogin') === 'true';

    if (fromLogin || sessionFromLogin) {
      setShowBanner(true);
      // Clear the session storage flag after showing banner once
      if (sessionFromLogin) {
        sessionStorage.removeItem('fromLogin');
      }
    }
  }, [searchParams]);

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