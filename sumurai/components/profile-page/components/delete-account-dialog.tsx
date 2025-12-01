"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/context/auth-context";
import { useToast } from "@/hooks/use-toast";

export default function DeleteAccountDialog() {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);

      // Get the API URL from environment variable
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      // Get the user's session token
      const { data: { session } } = await (await import("@/lib/services/supabase")).supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No authentication token found");
      }

      // Call the delete account API endpoint
      const response = await fetch(`${apiUrl}/account`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to delete account");
      }

      // Show success message
      toast({
        title: "Account deleted",
        description: "Your account and all associated data have been permanently deleted.",
      });

      // Log out the user
      await logout();

      // Redirect to home page
      router.push("/");

    } catch (error) {
      console.error("Failed to delete account:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-[#1A1A1A] border-[#333333]">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <DialogTitle className="text-center text-red-400">
            Delete Account
          </DialogTitle>
          <DialogDescription className="text-center text-gray-400">
            This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-red-500/50 bg-red-500/5 p-4">
            <p className="text-sm font-medium mb-2 text-white">This will permanently delete:</p>
            <ul className="text-sm space-y-1 text-gray-400">
              <li>• Your profile information</li>
              <li>• All your meetings and transcriptions</li>
              <li>• All summaries and action items</li>
              <li>• All conversations and chat history</li>
              <li>• Your authentication account</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isDeleting} className="border-[#333333] text-white hover:bg-[#2A2A2A]">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDeleteAccount}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
