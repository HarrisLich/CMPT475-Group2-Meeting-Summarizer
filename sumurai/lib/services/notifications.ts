const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface NotificationResult {
  success: boolean;
  email_sent?: boolean;
  slack_sent?: boolean;
  errors?: string[];
}

export class NotificationService {
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

  static async notifyActionItem(actionItemId: string): Promise<{ success: boolean; notifications: NotificationResult }> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_URL}/action-items/${actionItemId}/notify`, {
      method: 'POST',
      headers
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorData.detail || `Failed to send notification: ${response.statusText}`);
    }
    
    return await response.json();
  }

  static async notifyAllActionItems(meetingId: string): Promise<{ success: boolean; notified: number; skipped: number; errors?: string[] }> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_URL}/meetings/${meetingId}/action-items/notify-all`, {
      method: 'POST',
      headers
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorData.detail || `Failed to send notifications: ${response.statusText}`);
    }
    
    return await response.json();
  }
}

