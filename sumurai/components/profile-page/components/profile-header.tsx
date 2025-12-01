"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Mail, MapPin } from "lucide-react";
import { useAuth } from "@/lib/context/auth-context";
import ProfileEditForm from "./profile-edit-form";

export default function ProfileHeader() {
  const { profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  
  // Format join date
  const formatJoinDate = () => {
    if (!profile?.updated_at) return "Recently joined";
    const date = new Date(profile.updated_at);
    return `Joined ${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
  };

  // Get initials for avatar fallback
  const getInitials = () => {
    if (!profile?.name) return "U";
    return profile.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get membership type badge
  const getMembershipBadge = () => {
    return profile?.membership_type || "Standard Member";
  };

  if (isEditing) {
    return <ProfileEditForm onCancel={() => setIsEditing(false)} />;
  }

  return (
    <Card className="border-[#333333] bg-[#1A1A1A]">
      <CardContent className="p-6">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
          <div className="relative">
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt="Profile" 
                key={profile.avatar_url}
                className="h-24 w-24 rounded-full object-cover ring-2 ring-[#00F5FF] ring-offset-2 ring-offset-background"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-[#00F5FF] flex items-center justify-center ring-2 ring-[#00F5FF] ring-offset-2 ring-offset-background">
                <span className="text-2xl text-black font-semibold">{getInitials()}</span>
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <h1 className="text-2xl font-bold text-white">{profile?.name || "User"}</h1>
              <Badge variant="secondary" className="bg-[#00F5FF]/20 text-[#00F5FF] border-[#00F5FF]/30">{getMembershipBadge()}</Badge>
            </div>
            {(profile?.job_title || profile?.role) && (
              <p className="text-gray-400">{profile.job_title || profile.role}</p>
            )}
            {profile?.company && (
              <p className="text-gray-400 text-sm">at {profile.company}</p>
            )}
            <div className="text-gray-400 flex flex-wrap gap-4 text-sm">
              {profile?.email && (
                <div className="flex items-center gap-1">
                  <Mail className="size-4" />
                  {profile.email}
                </div>
              )}
              {profile?.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="size-4" />
                  {profile.location}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="size-4" />
                {formatJoinDate()}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setIsEditing(true)}
            className="border-[#333333] text-white hover:bg-[#2A2A2A] hover:text-[#00F5FF]"
          >
            Edit Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
