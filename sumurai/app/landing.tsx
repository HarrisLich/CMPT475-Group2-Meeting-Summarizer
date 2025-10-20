'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  FileText,
  Users,
  Calendar,
  CheckCircle,
  Mic,
  Brain,
  Shield,
  Zap,
  ArrowRight,
  Star
} from 'lucide-react';
import { useAuth } from '@/lib/context/auth-context';

function Landing() {
  const router = useRouter();
  const { user, session, loading: authLoading, error: authError, login, register, logout } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [featuresVisible, setFeaturesVisible] = useState(false);
  const [swordSlicing, setSwordSlicing] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fullText = 'actionable insights';

  const openLogin = () => {
    setLoginOpen(true);
    setIsRegister(false);
  };

  const openSignUp = () => {
    setLoginOpen(true);
    setIsRegister(true);
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
        // Handle registration
        await register(formData.email, formData.password);
        console.log('Registration successful');
      } else {
        // Handle login
        await login(formData.email, formData.password);
        console.log('Login successful');
      }

      // On success: close dialog and redirect
      setLoginOpen(false);
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
      // Optionally redirect to home or refresh page
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Auth state is now managed by the AuthProvider context

  useEffect(() => {
    setIsVisible(true);
    let i = 0;
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        if (i < fullText.length) {
          setDisplayText(fullText.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
        }
      }, 100);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTriggered) {
            setHasTriggered(true);
            setSwordSlicing(true);
            setTimeout(() => {
              setFeaturesVisible(true);
            }, 800);
          }
        });
      },
      { threshold: 0.3 }
    );

    const featuresSection = document.getElementById('features');
    if (featuresSection) {
      observer.observe(featuresSection);
    }

    return () => {
      if (featuresSection) {
        observer.unobserve(featuresSection);
      }
    };
  }, [hasTriggered]);

  const features = [
    {
      icon: <Brain className="w-6 h-6" />,
      title: "AI-Powered Summarization",
      description: "Transform lengthy meetings into concise, actionable summaries automatically.",
      color: "bg-gradient-to-br from-[#00F5FF] to-[#06B6D4]"
    },
    {
      icon: <CheckCircle className="w-6 h-6" />,
      title: "Action Item Extraction",
      description: "Automatically identify tasks, deadlines, and responsibilities from discussions.",
      color: "bg-gradient-to-br from-[#00F5FF] to-[#06B6D4]"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Speaker Identification",
      description: "Track who said what with intelligent speaker recognition technology.",
      color: "bg-gradient-to-br from-[#00F5FF] to-[#06B6D4]"
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Calendar Integration",
      description: "Sync action items and deadlines to your favorite calendar apps seamlessly.",
      color: "bg-gradient-to-br from-[#00F5FF] to-[#06B6D4]"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Enterprise Security",
      description: "Keep your data secure with enterprise-grade encryption and compliance standards.",
      color: "bg-gradient-to-br from-[#00F5FF] to-[#06B6D4]"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Lightning Fast",
      description: "Get comprehensive summaries in minutes, not hours. Process multiple meetings at once.",
      color: "bg-gradient-to-br from-[#00F5FF] to-[#06B6D4]"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#111111] via-[#111111] to-[#1A1A1A]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#111111]/80 backdrop-blur-lg border-b border-[#333333]">
        <div className="container mx-auto px-6 py-4 flex items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 flex items-center justify-center shadow-lg">
              <img src="/sumurai-icon-blue.png" alt="SumurAI Logo" className="w-10 h-10 rounded-xl" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] bg-clip-text text-transparent">
              SumurAI
            </span>
          </div>

          <nav className="hidden md:flex items-center space-x-8 ml-12">
            <a href="#features" className="text-white hover:text-[#00F5FF] transition-colors font-medium">
              Features
            </a>
            <a href="/demo" className="text-white hover:text-[#00F5FF] transition-colors font-medium">
              Demo
            </a>
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
                  Welcome, {user.user_metadata?.display_name || user.email}
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

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className={`text-5xl md:text-7xl font-bold text-white mb-8 leading-tight transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            Turn meetings into
            <span className="bg-gradient-to-r from-[#00F5FF] via-[#06B6D4] to-[#00F5FF] bg-clip-text text-transparent block mt-2 leading-normal text-center">
              {displayText}
              {displayText && <span className="text-[#00F5FF]" style={{animation: 'blink 1.0s infinite'}}>|</span>}
              <style>{`
                @keyframes blink {
                  0%, 50% { opacity: 1; }
                  51%, 100% { opacity: 0; }
                }
              `}</style>
            </span>
          </h1>
          
          <p className={`text-xl md:text-2xl text-gray-300 mb-12 leading-relaxed max-w-3xl mx-auto transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            From messy discussions to clear action plans. Get structured outputs that keep you and your team aligned.
          </p>
          
          <div className={`flex flex-col sm:flex-row gap-4 justify-center mb-12 transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {user && session ? (
              <>
                <Button
                  size="lg"
                  onClick={() => router.push('/profiling')}
                  className="bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] hover:from-[#00D4E6] hover:to-[#0891B2] text-black text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all duration-300"
                >
                  Go to Dashboard
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push('/demo')}
                  className="text-lg px-8 py-6 border-2 border-[#333333] text-white hover:bg-[#1A1A1A] hover:text-[#00F5FF] transition-colors"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  Watch Demo
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="lg"
                  onClick={openSignUp}
                  className="bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] hover:from-[#00D4E6] hover:to-[#0891B2] text-black text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all duration-300"
                >
                  Upload Meeting
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push('/demo')}
                  className="text-lg px-8 py-6 border-2 border-[#333333] text-white hover:bg-[#1A1A1A] hover:text-[#00F5FF] transition-colors"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  Watch Demo
                </Button>
              </>
            )}
          </div>

          <div className={`flex items-center justify-center space-x-8 text-gray-400 text-sm transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-[#00F5FF]" />
              <span>Workflow Integrated</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-[#00F5FF]" />
              <span>Instant results</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-[#00F5FF]" />
              <span>Secure processing</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gradient-to-b from-[#111111] via-[#111111] to-[#1A1A1A] relative overflow-hidden">
        {/* Sword Slicing Effect */}
        {swordSlicing && (
          <>
            <div className="absolute inset-0 pointer-events-none">
              <div className="sword-slash absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00F5FF] to-transparent transform -translate-y-1/2 rotate-12 animate-sword-slice"></div>
            </div>
            <style jsx>{`
              @keyframes sword-slice {
                0% {
                  transform: translateX(-100%) translateY(-50%) rotate(12deg);
                  opacity: 0;
                }
                20% {
                  opacity: 1;
                }
                100% {
                  transform: translateX(100%) translateY(-50%) rotate(12deg);
                  opacity: 0;
                }
              }
              .animate-sword-slice {
                animation: sword-slice 0.8s ease-out forwards;
              }
            `}</style>
          </>
        )}

        <div className="container mx-auto px-6">
          <div className={`text-center mb-16 transition-all duration-1000 ${featuresVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-10 invisible'}`}>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Perfect for individuals and teams
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Whether you're working solo or with a group, organize your conversations effectively.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className={`border-0 shadow-lg hover:shadow-xl transition-all duration-500 group cursor-pointer bg-[#111111] border border-[#333333] ${
                  featuresVisible
                    ? 'opacity-100 transform translate-y-0'
                    : 'opacity-0 transform translate-y-10 invisible'
                }`}
                style={{
                  transitionDelay: featuresVisible ? `${index * 150 + 200}ms` : '0ms'
                }}
              >
                <CardContent className="p-8">
                  <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center mb-6 text-black group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-gray-300 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] text-black">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div className="hover:scale-105 transition-transform duration-300 cursor-pointer">
              <div className="text-4xl md:text-5xl font-bold mb-2 animate-in fade-in slide-in-from-bottom-4" style={{animationDelay: '200ms'}}>90%</div>
              <div className="text-black/70">Accuracy</div>
            </div>
            <div className="hover:scale-105 transition-transform duration-300 cursor-pointer">
              <div className="text-4xl md:text-5xl font-bold mb-2 animate-in fade-in slide-in-from-bottom-4" style={{animationDelay: '400ms'}}>&lt;2min</div>
              <div className="text-black/70">Processing Time</div>
            </div>
            <div className="hover:scale-105 transition-transform duration-300 cursor-pointer">
              <div className="text-4xl md:text-5xl font-bold mb-2 animate-in fade-in slide-in-from-bottom-4" style={{animationDelay: '600ms'}}>15</div>
              <div className="text-black/70">Speakers</div>
            </div>
            <div className="hover:scale-105 transition-transform duration-300 cursor-pointer">
              <div className="text-4xl md:text-5xl font-bold mb-2 animate-in fade-in slide-in-from-bottom-4" style={{animationDelay: '800ms'}}>5+</div>
              <div className="text-black/70">Meetings</div>
            </div>
          </div>
        </div>
      </section>



      {/* CTA Section */}
      <section className="py-20 bg-[#111111]">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to organize your conversations?
            </h2>
            <p className="text-xl text-gray-300 mb-12">
              Upload a recording and see AI-powered insights in action.
            </p>
            <Button
              size="lg"
              onClick={openLogin}
              className="bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] hover:from-[#00D4E6] hover:to-[#0891B2] text-black text-lg px-8 py-6 shadow-xl"
            >
              Get Started Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1A1A1A] border-t border-[#333333] py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 flex items-center justify-center">
                <img src="/sumurai-icon-blue.png" alt="SumurAI Logo" className="w-8 h-8 rounded-lg" />
              </div>
              <span className="text-xl font-bold text-white">SumurAI</span>
            </div>
            <div className="text-gray-300 text-center md:text-right">
              <p>&copy; 2025 SumurAI. All rights reserved.</p>
              <div className="flex space-x-6 mt-2 justify-center md:justify-end">
                <a href="#privacy" className="hover:text-white transition-colors">Privacy</a>
                <a href="#terms" className="hover:text-white transition-colors">Terms</a>
                <a href="#support" className="hover:text-white transition-colors">Support</a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Login Dialog */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="bg-[#111111] border-[#333333] text-white max-w-lg w-full">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center mb-6">
              {isRegister ? 'Create Account' : 'Welcome Back'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {(error || authError) && (
              <div className="text-red-400 text-sm text-center bg-red-900/20 border border-red-900/50 rounded-md p-2">
                {error || authError}
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
                onClick={() => setIsRegister(!isRegister)}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Landing;