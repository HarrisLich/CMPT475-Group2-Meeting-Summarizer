"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/context/auth-context";
import { Camera, Loader2 } from "lucide-react";
import AvatarCropper from "./avatar-cropper";

export default function ProfileEditForm({ onCancel }: { onCancel: () => void }) {
  const { profile, updateUserProfile, uploadUserAvatar } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: profile?.name || "",
    first_name: profile?.first_name || "",
    last_name: profile?.last_name || "",
    email: profile?.email || "",
    phone: profile?.phone || "",
    role: profile?.role || "",
    job_title: profile?.job_title || "",
    company: profile?.company || "",
    bio: profile?.bio || "",
    location: profile?.location || ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLocalError(null);
    
    try {
      console.log("Submitting form data:", formData);
      await updateUserProfile(formData);
      console.log("Profile updated successfully");
      onCancel(); // Close form after successful update
    } catch (error) {
      console.error("Error updating profile:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLocalError(errorMessage);
    } finally {
      setIsLoading(false);
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
      console.log("Starting avatar upload with cropped file:", croppedFile.name, croppedFile.size);
      const avatarUrl = await uploadUserAvatar(croppedFile);
      console.log("Avatar upload successful, URL:", avatarUrl);
      
      // Force component to refresh by waiting a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Verify the profile was updated
      if (profile?.avatar_url !== avatarUrl) {
        console.log("Profile avatar_url updated:", avatarUrl);
      }
    } catch (error) {
      console.error("Avatar upload error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload avatar.';
      setLocalError(errorMessage);
      setShowCropper(true); // Reopen cropper on error
    } finally {
      setIsLoading(false);
    }
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Profile</CardTitle>
      </CardHeader>
      <CardContent>
        {localError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{localError}</p>
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
          <div className="flex justify-center mb-4">
            <div className="relative">
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="Profile" 
                  key={profile.avatar_url}
                  className="h-24 w-24 rounded-full object-cover ring-2 ring-[#00F5FF] ring-offset-2 ring-offset-background"
                  onLoad={() => console.log("✅ Profile image loaded:", profile.avatar_url)}
                  onError={async (e) => {
                    console.error("❌ Profile image failed to load:", profile.avatar_url);
                    // Test if URL is accessible
                    if (profile.avatar_url) {
                      try {
                        const response = await fetch(profile.avatar_url, { method: 'HEAD' });
                        console.error("URL test - Status:", response.status, "OK:", response.ok);
                        if (!response.ok) {
                          console.error("File does not exist or is not accessible");
                        }
                      } catch (fetchError) {
                        console.error("URL fetch test failed:", fetchError);
                      }
                    }
                  }}
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-[#00F5FF] flex items-center justify-center ring-2 ring-[#00F5FF] ring-offset-2 ring-offset-background">
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
                className="absolute -right-2 -bottom-2 h-8 w-8 rounded-full bg-[#00F5FF] flex items-center justify-center cursor-pointer hover:bg-[#06B6D4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-20"
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

          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium mb-4">Basic Information</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={isLoading}
                    placeholder="Enter your display name"
                  />
                </div>
                
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      disabled={isLoading}
                      placeholder="Enter your first name"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      disabled={isLoading}
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-medium mb-4">Contact Information</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isLoading}
                    placeholder="Enter your email"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={isLoading}
                    placeholder="e.g. +1 (555) 123-4567"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    disabled={isLoading}
                    placeholder="e.g. San Francisco, CA"
                  />
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div>
              <h3 className="text-lg font-medium mb-4">Professional Information</h3>
              <div className="grid gap-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="job_title">Job Title</Label>
                    <Input
                      id="job_title"
                      name="job_title"
                      value={formData.job_title}
                      onChange={handleChange}
                      disabled={isLoading}
                      placeholder="e.g. Senior Product Designer"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      disabled={isLoading}
                      placeholder="e.g. Acme Inc."
                    />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="role">Role/Position</Label>
                  <Input
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    disabled={isLoading}
                    placeholder="e.g. Team Lead, Senior Developer"
                  />
                </div>
              </div>
            </div>

            {/* Bio */}
            <div>
              <h3 className="text-lg font-medium mb-4">About</h3>
              <div className="grid gap-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  disabled={isLoading}
                  placeholder="Tell us about yourself..."
                  rows={4}
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
