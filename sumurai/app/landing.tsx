'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { AuthDialog } from '@/components/AuthDialog';
import {
  Users,
  FileText,
  CheckCircle,
  Mic,
  Brain,
  Gauge,
  Zap,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/lib/context/auth-context';

function Landing() {
  const router = useRouter();
  const { user, session } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [featuresVisible, setFeaturesVisible] = useState(false);
  const [swordSlicing, setSwordSlicing] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const fullText = 'actionable insights';

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
            setTimeout(() => {
              setSwordSlicing(true);
              setTimeout(() => {
                setFeaturesVisible(true);
              }, 800);
            }, 300);
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
      description: "Transform audio and video recordings into detailed, responsive summaries.",
      color: "bg-gradient-to-br from-[#00F5FF] to-[#06B6D4]"
    },
    {
      icon: <CheckCircle className="w-6 h-6" />,
      title: "Smart Action Items",
      description: (
        <>
          Automatically extract tasks with priorities and assignments—slam{' '}
          <a
            href="https://www.youtube.com/watch?v=_Qf7q-nD74A"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-300 hover:text-gray-300 no-underline cursor-default hover:cursor-pointer"
            style={{ color: 'inherit' }}
          >
            dunk
          </a>
          {' '}on your deadlines.
        </>
      ),
      color: "bg-gradient-to-br from-[#00F5FF] to-[#06B6D4]"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Speaker Diarization",
      description: "Optional speaker identification mode to track who said what throughout your meeting.",
      color: "bg-gradient-to-br from-[#00F5FF] to-[#06B6D4]"
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Export & Share",
      description: "Download summaries, transcripts, and action items as PDFs to share with your team.",
      color: "bg-gradient-to-br from-[#00F5FF] to-[#06B6D4]"
    },
    {
      icon: <Gauge className="w-6 h-6" />,
      title: "Dual Processing Modes",
      description: "Fast mode for quick results (~2 min) or diarized mode with full speaker tracking (< 1 Min).",
      color: "bg-gradient-to-br from-[#00F5FF] to-[#06B6D4]"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Instant Transcription",
      description: "Upload audio or video and get accurate transcripts with timestamps in minutes.",
      color: "bg-gradient-to-br from-[#00F5FF] to-[#06B6D4]"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#111111] via-[#111111] to-[#1A1A1A]">
      <Header />

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center container mx-auto px-6 py-20 text-center">
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
            Slash lengthy meetings into structured, actionable summaries with AI.
          </p>
          
          <div className={`flex justify-center mb-12 transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {user && session ? (
              <Button
                size="lg"
                onClick={() => router.push('/core')}
                className="bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] hover:from-[#00D4E6] hover:to-[#0891B2] text-black text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                Meet SumurAI
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={() => setAuthDialogOpen(true)}
                className="bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] hover:from-[#00D4E6] hover:to-[#0891B2] text-black text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            )}
          </div>

          <div className={`flex items-center justify-center space-x-8 text-gray-400 text-sm transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-[#00F5FF]" />
              <span>AI-powered analysis</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-[#00F5FF]" />
              <span>Fast & accurate</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-[#00F5FF]" />
              <span>Export ready</span>
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
              <div className="text-4xl md:text-5xl font-bold mb-2 animate-in fade-in slide-in-from-bottom-4" style={{animationDelay: '200ms'}}>90%+</div>
              <div className="text-black/70">Transcription Accuracy</div>
            </div>
            <div className="hover:scale-105 transition-transform duration-300 cursor-pointer">
              <div className="text-4xl md:text-5xl font-bold mb-2 animate-in fade-in slide-in-from-bottom-4" style={{animationDelay: '400ms'}}>&lt;2min</div>
              <div className="text-black/70">Fast Mode Processing</div>
            </div>
            <div className="hover:scale-105 transition-transform duration-300 cursor-pointer">
              <div className="text-4xl md:text-5xl font-bold mb-2 animate-in fade-in slide-in-from-bottom-4" style={{animationDelay: '600ms'}}>15+</div>
              <div className="text-black/70">Speaker Tracking</div>
            </div>
            <div className="hover:scale-105 transition-transform duration-300 cursor-pointer">
              <div className="text-4xl md:text-5xl font-bold mb-2 animate-in fade-in slide-in-from-bottom-4" style={{animationDelay: '800ms'}}>PDF</div>
              <div className="text-black/70">Export Format</div>
            </div>
          </div>
        </div>
      </section>



      {/* CTA Section */}
      <section className="py-20 bg-[#111111]">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to transform your meetings?
            </h2>
            <Button
              size="lg"
              onClick={() => router.push('/core')}
              className="bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] hover:from-[#00D4E6] hover:to-[#0891B2] text-black text-lg px-8 py-6 shadow-xl"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}

      <Footer />

      {/* Auth Dialog */}
      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        defaultMode="register"
        redirectTo="/core"
      />
    </div>
  );
}

export default Landing;