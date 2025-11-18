'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/auth-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, session, loading: authLoading, login, register } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Once auth loading is complete, check if user is authenticated
    if (!authLoading && isClient) {
      console.log('ProtectedRoute: Auth check -', { user: !!user, session: !!session, authLoading, isClient });
      if (!user || !session) {
        // User is not authenticated, show the auth dialog
        console.log('ProtectedRoute: No auth detected, showing dialog');
        setShowAuthDialog(true);
      } else {
        // User is authenticated, hide the dialog
        console.log('ProtectedRoute: Auth detected, hiding dialog');
        setShowAuthDialog(false);
      }
    }
  }, [authLoading, user?.id, session?.access_token, isClient]); // Use stable values instead of objects

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validate form data
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      setIsLoading(false);
      return;
    }

    if (isRegister && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      if (isRegister) {
        // Handle registration
        await register(formData.email, formData.password);
        console.log('Registration successful');
      } else {
        // Handle login
        await login(formData.email, formData.password);
        console.log('Login successful');
      }

      // On success: close dialog and allow access
      setShowAuthDialog(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  // Show loading spinner while checking auth or while on server
  if (authLoading || !isClient) {
    console.log('ProtectedRoute: Showing loading -', { authLoading, isClient });
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 border-4 border-[#00F5FF] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show auth dialog (blocking access)
  if (!user || !session) {
    console.log('ProtectedRoute: Rendering auth dialog -', { showAuthDialog });
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <Dialog open={showAuthDialog} onOpenChange={(open) => {
          if (!open) {
            // If user tries to close the dialog, redirect to home
            handleBackToHome();
          }
        }}>
          <DialogContent className="bg-[#111111] border-[#333333] text-white max-w-lg w-full">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-center mb-6">
                {isRegister ? 'Create Account to Continue' : 'Sign In to Continue'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-red-400 text-sm text-center bg-red-900/20 border border-red-900/50 rounded-md p-2">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#333333] rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00F5FF] focus:border-transparent"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#333333] rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00F5FF] focus:border-transparent"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  required
                />
              </div>

              {isRegister && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#333333] rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00F5FF] focus:border-transparent"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange('confirmPassword')}
                    required
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] hover:from-[#00D4E6] hover:to-[#0891B2] text-black font-semibold py-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    <span>{isRegister ? 'Creating Account...' : 'Signing In...'}</span>
                  </div>
                ) : (
                  <span>{isRegister ? 'Create Account' : 'Sign In'}</span>
                )}
              </Button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setIsRegister(!isRegister)}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </button>
              </div>

              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={handleBackToHome}
                  className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Back to Home
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // User is authenticated, render the protected content
  console.log('ProtectedRoute: Rendering protected content - user is authenticated');
  return <>{children}</>;
}
