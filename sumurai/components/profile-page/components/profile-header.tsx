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
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile?.avatar_url || ""} alt="Profile" />
              <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <h1 className="text-2xl font-bold">{profile?.name || "User"}</h1>
              <Badge variant="secondary">{getMembershipBadge()}</Badge>
            </div>
            {(profile?.job_title || profile?.role) && (
              <p className="text-muted-foreground">{profile.job_title || profile.role}</p>
            )}
            {profile?.company && (
              <p className="text-muted-foreground text-sm">at {profile.company}</p>
            )}
            <div className="text-muted-foreground flex flex-wrap gap-4 text-sm">
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
          <Button variant="default" onClick={() => setIsEditing(true)}>
            Edit Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
