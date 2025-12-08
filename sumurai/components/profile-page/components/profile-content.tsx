"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import DeleteAccountDialog from "./delete-account-dialog";
import { useAuth } from "@/lib/context/auth-context";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { Contact, getContacts, createContact, updateContact, deleteContact } from "@/lib/services/supabase";
import { Pencil, Trash2, Plus, Save, X } from "lucide-react";

export default function ProfileContent() {
  const router = useRouter();
  const { logout } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newContact, setNewContact] = useState({ name: "", email: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load contacts on mount
  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    const { data, error } = await getContacts();
    if (error) {
      setError(error instanceof Error ? error.message : "Failed to load contacts");
      console.error("Error loading contacts:", error);
    } else {
      setContacts(data || []);
    }
    setLoading(false);
  };

  const handleAddContact = async () => {
    if (!newContact.name.trim() || !newContact.email.trim()) {
      setError("Please fill in both name and email");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newContact.email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error } = await createContact(newContact);

    if (error) {
      setError(error instanceof Error ? error.message : "Failed to create contact");
      console.error("Error creating contact:", error);
    } else {
      setContacts([data!, ...contacts]);
      setNewContact({ name: "", email: "" });
    }

    setLoading(false);
  };

  const handleEditContact = async (id: string) => {
    if (!editForm.name.trim() || !editForm.email.trim()) {
      setError("Please fill in both name and email");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editForm.email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error } = await updateContact(id, editForm);

    if (error) {
      setError(error instanceof Error ? error.message : "Failed to update contact");
      console.error("Error updating contact:", error);
    } else {
      setContacts(contacts.map(c => c.id === id ? data! : c));
      setEditingId(null);
      setEditForm({ name: "", email: "" });
    }

    setLoading(false);
  };

  const handleDeleteContact = async (id: string) => {
    setLoading(true);
    setError(null);

    const { error } = await deleteContact(id);

    if (error) {
      setError(error instanceof Error ? error.message : "Failed to delete contact");
      console.error("Error deleting contact:", error);
    } else {
      setContacts(contacts.filter(c => c.id !== id));
    }

    setLoading(false);
  };

  const startEdit = (contact: Contact) => {
    setEditingId(contact.id!);
    setEditForm({ name: contact.name, email: contact.email });
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: "", email: "" });
    setError(null);
  };

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
      {/* Contact Management */}
      <Card className="border-[#333333] bg-[#1A1A1A]">
        <CardHeader>
          <CardTitle className="text-white">Contact Management</CardTitle>
          <CardDescription className="text-gray-400">
            Manage your contacts and connections
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* New Contact Form */}
          <div className="border border-[#00F5FF]/30 rounded-lg p-4 bg-[#0F0F0F]/50">
            <div className="flex items-center gap-2 mb-3">
              <Plus className="h-4 w-4 text-[#00F5FF]" />
              <h3 className="text-sm font-semibold text-[#00F5FF]">New Contact</h3>
            </div>
            <div className="grid md:grid-cols-[1fr_1fr_auto] gap-3">
              <Input
                placeholder="Contact Name"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                className="bg-[#111111] border-[#333333] text-white placeholder:text-gray-500 focus:border-[#00F5FF]"
                disabled={loading}
              />
              <Input
                type="email"
                placeholder="Email"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                className="bg-[#111111] border-[#333333] text-white placeholder:text-gray-500 focus:border-[#00F5FF]"
                disabled={loading}
              />
              <Button
                onClick={handleAddContact}
                disabled={loading || !newContact.name.trim() || !newContact.email.trim()}
                className="bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] hover:from-[#00D4E6] hover:to-[#0891B2] text-black font-semibold whitespace-nowrap"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>

          {/* Contact List */}
          <div className="space-y-2">
            {contacts.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No contacts yet. Add your first contact above!</p>
              </div>
            ) : (
              <div className="rounded-lg border border-[#333333]">
                <div className={`space-y-2 p-2 ${contacts.length >= 5 ? 'max-h-[400px] overflow-y-auto' : ''}`}>
                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="border border-[#333333] rounded-lg p-3 bg-[#0F0F0F] hover:border-[#00F5FF]/30 transition-colors"
                    >
                      {editingId === contact.id ? (
                        // Edit Mode
                        <div className="grid md:grid-cols-[1fr_1fr_auto] gap-3">
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="bg-[#111111] border-[#333333] text-white focus:border-[#00F5FF]"
                            disabled={loading}
                          />
                          <Input
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            className="bg-[#111111] border-[#333333] text-white focus:border-[#00F5FF]"
                            disabled={loading}
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleEditContact(contact.id!)}
                              disabled={loading}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={cancelEdit}
                              disabled={loading}
                              size="sm"
                              variant="outline"
                              className="border-[#333333] text-gray-400 hover:text-white hover:bg-[#2A2A2A]"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-medium truncate">{contact.name}</div>
                            <div className="text-sm text-[#00F5FF] truncate">{contact.email}</div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              onClick={() => startEdit(contact)}
                              disabled={loading}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-[#00F5FF]/10 hover:text-[#00F5FF]"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleDeleteContact(contact.id!)}
                              disabled={loading}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-red-500/10 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
