"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/context/auth-context";
import { Camera, Loader2, Save } from "lucide-react";
import AvatarCropper from "./avatar-cropper";

export default function ProfileSection() {
  const { profile, user, updateUserProfile, uploadUserAvatar } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    name: profile?.name || "",
    email: profile?.email || user?.email || ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setLocalError(null);
    setSuccessMessage(null);

    try {
      await updateUserProfile(formData);
      setSuccessMessage("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      setLocalError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];

    if (!file.type.startsWith('image/')) {
      setLocalError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLocalError('Image size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    setShowCropper(true);
    e.target.value = '';
  };

  const handleCrop = async (croppedFile: File) => {
    setShowCropper(false);
    setIsLoading(true);
    setLocalError(null);

    try {
      await uploadUserAvatar(croppedFile);
      setSuccessMessage("Avatar updated successfully");
    } catch (error) {
      console.error("Avatar upload error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload avatar';
      setLocalError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = () => {
    if (!formData.name && !profile?.name) return "U";
    const name = formData.name || profile?.name || "";
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="border-[#333333] bg-[#1A1A1A]">
      <CardHeader>
        <CardTitle className="text-white">Profile</CardTitle>
        <CardDescription className="text-gray-400">
          Manage your profile information
        </CardDescription>
      </CardHeader>
      <CardContent>
        {localError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-md">
            <p className="text-red-400 text-sm">{localError}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/50 rounded-md">
            <p className="text-green-400 text-sm">{successMessage}</p>
          </div>
        )}

        {showCropper && selectedFile && (
          <AvatarCropper
            imageFile={selectedFile}
            onCrop={handleCrop}
            onCancel={() => {
              setShowCropper(false);
              setSelectedFile(null);
            }}
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex justify-center">
            <div className="relative">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  key={profile.avatar_url}
                  className="h-24 w-24 rounded-full object-cover ring-2 ring-[#00F5FF] ring-offset-2 ring-offset-[#1A1A1A]"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-[#00F5FF] flex items-center justify-center ring-2 ring-[#00F5FF] ring-offset-2 ring-offset-[#1A1A1A]">
                  <span className="text-2xl text-black font-semibold">{getInitials()}</span>
                </div>
              )}
              {isLoading && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center z-10">
                  <Loader2 className="h-6 w-6 text-[#00F5FF] animate-spin" />
                </div>
              )}
              <Label
                htmlFor="avatar-upload"
                className="absolute -right-2 -bottom-2 h-8 w-8 rounded-full bg-[#00F5FF] flex items-center justify-center cursor-pointer hover:bg-[#06B6D4] transition-colors z-20"
              >
                <Camera className="h-4 w-4 text-black" />
              </Label>
              <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-white">Display Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={isSaving}
                placeholder="Enter your display name"
                className="bg-[#0F0F0F] border-[#333333] text-white placeholder:text-gray-500 focus:border-[#00F5FF]"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                disabled={true}
                className="bg-[#0F0F0F] border-[#333333] text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500">Email cannot be changed</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] hover:from-[#00D4E6] hover:to-[#0891B2] text-black font-semibold"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
