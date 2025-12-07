const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Contact {
  id: string;
  name: string;
  email?: string;
  slack_user_id?: string;
  slack_email?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  created_at?: string;
  updated_at?: string;
}

export class ContactService {
  private static async getAuthHeaders(): Promise<HeadersInit> {
    const { supabase } = await import('@/lib/services/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    };
  }

  static async getContacts(): Promise<Contact[]> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_URL}/contacts`, { headers });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch contacts: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.contacts || [];
  }

  static async createContact(contact: Omit<Contact, 'id' | 'created_at' | 'updated_at'>): Promise<Contact> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_URL}/contacts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(contact)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorData.detail || `Failed to create contact: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.contact;
  }

  static async updateContact(contactId: string, updates: Partial<Contact>): Promise<Contact> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_URL}/contacts/${contactId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorData.detail || `Failed to update contact: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.contact;
  }

  static async deleteContact(contactId: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_URL}/contacts/${contactId}`, {
      method: 'DELETE',
      headers
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorData.detail || `Failed to delete contact: ${response.statusText}`);
    }
  }

  static async getContact(contactId: string): Promise<Contact> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_URL}/contacts/${contactId}`, { headers });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch contact: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.contact;
  }
}

