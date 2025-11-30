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
  const { user, session, profile, loading: authLoading, login, register, logout } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

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
        // Register the user
        await register(formData.email, formData.password);

        // Show verification dialog after successful registration
        setRegisteredEmail(formData.email);
        closeDialog();
        setShowVerificationDialog(true);
        setFormData({ email: '', password: '', confirmPassword: '' });
        return;
      } else {
        // Login the user
        await login(formData.email, formData.password);
      }

      // After successful login, redirect to profiling
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

  // password validation
  const meetsMinLength = formData.password.length >= 6;
  const passwordsMatch =
    formData.password.length > 0 &&
    formData.confirmPassword.length > 0 &&
    formData.password === formData.confirmPassword;

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
            {user && session && (
              <a href="/core" className="text-white hover:text-[#00F5FF] transition-colors font-medium">
                App
              </a>
            )}
            <a href="/about" className="text-white hover:text-[#00F5FF] transition-colors font-medium">
              About
            </a>
          </nav>

          <div className="flex items-center space-x-4 ml-auto">
            {authLoading ? (
              <div className="w-8 h-8 border-2 border-[#00F5FF] border-t-transparent rounded-full animate-spin"></div>
            ) : user && session ? (
              <div className="flex items-center gap-4">
                <span className="text-white text-sm">
                  Welcome, {profile?.name || profile?.first_name || user.email?.split('@')[0]}
                </span>
                <button
                  onClick={() => router.push('/profiling')}
                  className="flex-shrink-0"
                  title="Go to Profile"
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-[#00F5FF] hover:ring-[#06B6D4] transition-all duration-300 cursor-pointer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] hover:from-[#00D4E6] hover:to-[#0891B2] flex items-center justify-center transition-all duration-300 cursor-pointer ring-2 ring-[#00F5FF]">
                      <span className="text-sm text-black font-semibold">
                        {profile?.name ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                      </span>
                    </div>
                  )}
                </button>
              </div>
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

                {/* Simple Password Requirements */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <span
                    className={`flex items-center justify-center px-2 py-1 text-xs rounded transition-all duration-200 ease-in-out ${
                      meetsMinLength
                        ? 'bg-[#06B6D4]/20 text-[#06B6D4]'
                        : 'bg-gray-800/50 text-gray-500 opacity-60'
                    }`}
                  >
                    6 characters minimum
                  </span>
                  <span
                    className={`flex items-center justify-center px-2 py-1 text-xs rounded transition-all duration-200 ease-in-out ${
                      passwordsMatch
                        ? 'bg-[#06B6D4]/20 text-[#06B6D4]'
                        : 'bg-gray-800/50 text-gray-500 opacity-60'
                    }`}
                  >
                    Passwords match
                  </span>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || (isRegister && (!meetsMinLength || !passwordsMatch))}
              className={`w-full font-semibold py-2 mt-6 ${
                isRegister && (!meetsMinLength || !passwordsMatch)
                  ? 'bg-gray-800/50 text-gray-500 opacity-60 cursor-not-allowed transition-all duration-500 ease-out'
                  : 'bg-[#06B6D4] hover:bg-[#0891B2] text-black transition-all duration-700 ease-in delay-200'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
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

      {/* Email Verification Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent className="bg-[#111111] border-[#333333] text-white max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center mb-4">
              Verify Your Email
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-black"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>

            <div className="text-center space-y-3">
              <p className="text-gray-300">
                We've sent a verification email to:
              </p>
              <p className="text-[#00F5FF] font-semibold text-lg">
                {registeredEmail}
              </p>
              <p className="text-gray-400 text-sm">
                Please check your inbox and click the verification link to activate your account and begin using Sumurai.
              </p>
            </div>

            <Button
              onClick={() => {setShowVerificationDialog(false); openLogin();}}
              className="w-full bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] hover:from-[#00D4E6] hover:to-[#0891B2] text-black font-semibold py-2 mt-4"
            >
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
