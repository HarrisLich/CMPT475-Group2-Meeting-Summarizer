interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface User {
  uid: string;
  email: string;
  display_name?: string;
  email_verified: boolean;
  created_at?: string;
}

interface AuthResponse {
  message: string;
  user: User;
  firebase_config?: any;
}

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

class AuthService {
  private baseURL: string;

  constructor() {
    // Default to localhost for development, can be configured via environment variables
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async registerUser(formData: RegisterData): Promise<AuthResponse> {
    if (formData.password !== formData.confirmPassword) {
      throw new Error('Passwords do not match');
    }

    return this.makeRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: formData.email,
        password: formData.password,
        display_name: formData.email.split('@')[0], // Use email username as display name
      }),
    });
  }

  async loginUser(formData: LoginData): Promise<AuthResponse> {
    return this.makeRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: formData.email,
        password: formData.password,
      }),
    });
  }

  async getFirebaseConfig(): Promise<{ firebase_config: FirebaseConfig }> {
    return this.makeRequest<{ firebase_config: FirebaseConfig }>('/auth/config');
  }

  async getCurrentUser(token: string): Promise<User> {
    return this.makeRequest<User>('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async verifyToken(token: string): Promise<{ valid: boolean; user: User }> {
    return this.makeRequest<{ valid: boolean; user: User }>('/auth/verify', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async logout(token: string): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>('/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async updateUser(token: string, updateData: { display_name?: string }): Promise<AuthResponse> {
    return this.makeRequest<AuthResponse>('/auth/me', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updateData),
    });
  }

  // Utility methods for token and user management
  saveToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('firebase_config');
      localStorage.removeItem('session_data');
    }
  }

  saveUser(user: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_data', JSON.stringify(user));
    }
  }

  getUser(): User | null {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null && this.getUser() !== null;
  }

  async logoutUser(): Promise<void> {
    const token = this.getToken();

    // Always clear local data first for immediate UI response
    this.removeToken();

    // Optionally try to notify the backend, but don't fail if it doesn't work
    if (token && token.startsWith('session_')) {
      // For session tokens, we don't need to call the backend
      // since they're only stored locally
      console.log('Session token logout - local only');
      return;
    }

    // For real Firebase tokens, try to revoke on the backend
    if (token) {
      try {
        await this.logout(token);
        console.log('Backend logout successful');
      } catch (error: any) {
        // Log the error but don't throw - logout should always succeed locally
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          console.log('Backend logout failed (token likely expired) - local logout completed');
        } else {
          console.warn('Logout API call failed:', error.message);
        }
      }
    }
  }

  // Method to check if current token is still valid
  async checkAuthStatus(): Promise<boolean> {
    const token = this.getToken();
    const user = this.getUser();

    // If no token or user data, not authenticated
    if (!token || !user) {
      this.removeToken();
      return false;
    }

    // For now, we'll use a simple session validation
    // In a full Firebase implementation, you'd verify the Firebase token
    try {
      // Check if the session is still valid (you can add time-based validation here)
      const sessionData = this.getSessionData();
      if (sessionData && sessionData.expires > Date.now()) {
        return true;
      } else {
        // Session expired
        this.removeToken();
        return false;
      }
    } catch (error) {
      // Session validation failed, clear local data
      this.removeToken();
      return false;
    }
  }

  // Helper method to manage session data
  saveSessionData(expiresIn: number = 24 * 60 * 60 * 1000): void { // Default 24 hours
    if (typeof window !== 'undefined') {
      const sessionData = {
        expires: Date.now() + expiresIn,
        created: Date.now()
      };
      localStorage.setItem('session_data', JSON.stringify(sessionData));
    }
  }

  private getSessionData(): { expires: number; created: number } | null {
    if (typeof window !== 'undefined') {
      const sessionData = localStorage.getItem('session_data');
      return sessionData ? JSON.parse(sessionData) : null;
    }
    return null;
  }
}

// Export singleton instance
export const authService = new AuthService();

// Export the class for testing or custom instances
export { AuthService };

// Export types for use in components
export type { RegisterData, LoginData, User, AuthResponse, FirebaseConfig };