'use client';
import ProfileSection from '@/components/profile-page/components/profile-section';
import ProfileContent from '@/components/profile-page/components/profile-content';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function ProfilingPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-[#111111] via-[#111111] to-[#1A1A1A]">
        <Header />

        {/* Profile Content */}
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
          <ProfileSection />
          <ProfileContent />
        </div>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}