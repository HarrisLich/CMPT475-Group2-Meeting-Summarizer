"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import DeleteAccountDialog from "./delete-account-dialog";
import { useAuth } from "@/lib/context/auth-context";

export default function ProfileContent() {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Management */}
      <Card className="border-[#333333] bg-[#1A1A1A]">
        <CardHeader>
          <CardTitle className="text-white">Account Management</CardTitle>
          <CardDescription className="text-gray-400">
            Manage your account settings and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base text-white">Sign Out</Label>
              <p className="text-sm text-gray-400">
                Sign out of your account on this device
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-[#333333] text-white hover:bg-[#2A2A2A] hover:text-[#00F5FF]"
            >
              Log Out
            </Button>
          </div>

          <Separator className="bg-[#333333]" />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base text-red-400">Delete Account</Label>
              <p className="text-sm text-gray-400">
                Permanently delete your account and all associated data
              </p>
            </div>
            <DeleteAccountDialog />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
