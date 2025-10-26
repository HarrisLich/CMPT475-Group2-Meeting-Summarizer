'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/context/auth-context';

interface HeaderProps {
  showAuthDialog?: boolean;
  onAuthDialogChange?: (open: boolean) => void;
}

export default function Header({ showAuthDialog, onAuthDialogChange }: HeaderProps = {}) {
  const router = useRouter();
  const { user, session, loading: authLoading, login, register, logout } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Sync external dialog control
  useEffect(() => {
    if (showAuthDialog !== undefined) {
      setLoginOpen(showAuthDialog);
    }
  }, [showAuthDialog]);

  const openLogin = () => {
    setLoginOpen(true);
    setIsRegister(false);
    onAuthDialogChange?.(true);
  };

  const openSignUp = () => {
    setLoginOpen(true);
    setIsRegister(true);
    onAuthDialogChange?.(true);
  };

  const closeDialog = () => {
    setLoginOpen(false);
    onAuthDialogChange?.(false);
  };

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
        await register(formData.email, formData.password);
      } else {
        await login(formData.email, formData.password);
      }

      closeDialog();
      router.push('/profiling');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
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
    <>
      <header className="sticky top-0 z-50 bg-[#111111]/80 backdrop-blur-lg border-b border-[#333333]">
        <div className="container mx-auto px-6 py-4 flex items-center">
          <div role="button" className="flex items-center space-x-3" onClick={() => router.push('/')}>
            <div className="w-10 h-10 flex items-center justify-center shadow-lg">
              <img src="/sumurai-icon-blue.png" alt="SumurAI Logo" className="w-10 h-10 rounded-xl" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] bg-clip-text text-transparent">
              SumurAI
            </span>
          </div>

          <nav className="hidden md:flex items-center space-x-8 ml-12">
            <a href="/#features" className="text-white hover:text-[#00F5FF] transition-colors font-medium">
              Features
            </a>
            <a href="/demo" className="text-white hover:text-[#00F5FF] transition-colors font-medium">
              Demo
            </a>
            {/* ----TEMPORARY---- direct link to AI Engine. Breaks regular user flow, delete before prod*/}
            <a href="/core" className="text-white hover:text-[#00F5FF] transition-colors font-medium">
              AI Engine
            </a>
            <a href="/about" className="text-white hover:text-[#00F5FF] transition-colors font-medium">
              About
            </a>
          </nav>

          <div className="flex items-center space-x-4 ml-auto">
            {authLoading ? (
              <div className="w-8 h-8 border-2 border-[#00F5FF] border-t-transparent rounded-full animate-spin"></div>
            ) : user && session ? (
              <>
                <span className="text-white text-sm">
                  Welcome, {user.email}
                </span>
                <Button
                  onClick={() => router.push('/profiling')}
                  variant="outline"
                  className="border-[#333333] hover:bg-[#1A1A1A] text-white hover:text-[#00F5FF] transition-colors"
                >
                  Dashboard
                </Button>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="border-red-600 hover:bg-red-900/20 text-red-400 hover:text-red-300 transition-colors"
                >
                  Log Out
                </Button>
              </>
            ) : (
              <>
                <Button onClick={openLogin} variant="outline" className="border-[#333333] hover:bg-[#1A1A1A] text-white hover:text-[#00F5FF] transition-colors">
                  Log In
                </Button>
                <Button onClick={openSignUp} className="bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] hover:from-[#00D4E6] hover:to-[#0891B2] text-black shadow-lg">
                  Try It Now
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Login Dialog */}
      <Dialog open={loginOpen} onOpenChange={closeDialog}>
        <DialogContent className="bg-[#111111] border-[#333333] text-white max-w-lg w-full">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center mb-6">
              {isRegister ? 'Create Account' : 'Welcome Back'}
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
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
