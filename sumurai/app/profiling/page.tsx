'use client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import ProfileHeader from '@/components/profile-page/components/profile-header';
import ProfileContent from '@/components/profile-page/components/profile-content';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function ProfilingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#111111] via-[#111111] to-[#1A1A1A]">
      <Header />

      {/* Profile Content */}
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        <ProfileHeader />
        <ProfileContent />
      </div>

      <Footer />
    </div>
  );
}