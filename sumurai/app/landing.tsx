'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

function Landing() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [displayText, setDisplayText] = useState('');
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

  const features = [
    {
      icon: <Brain className="w-6 h-6" />,
      title: "AI-Powered Summarization",
      description: "Transform lengthy meetings into concise, actionable summaries with advanced AI that captures key decisions and insights.",
      color: "bg-gradient-to-br from-[#00F5FF] to-[#06B6D4]"
    },
    {
      icon: <CheckCircle className="w-6 h-6" />,
      title: "Action Item Extraction",
      description: "Automatically identify tasks, deadlines, and responsibilities from your meetings with 90% accuracy.",
      color: "bg-gradient-to-br from-[#00F5FF] to-[#06B6D4]"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Speaker Identification",
      description: "Track who said what with intelligent speaker tagging that supports up to 15 participants per meeting.",
      color: "bg-gradient-to-br from-[#00F5FF] to-[#06B6D4]"
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Calendar Integration",
      description: "Seamlessly sync action items and deadlines directly to Google Calendar and Outlook with one click.",
      color: "bg-gradient-to-br from-[#00F5FF] to-[#06B6D4]"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Enterprise Security",
      description: "Your data stays secure with end-to-end encryption and compliance with FERPA and HIPAA standards.",
      color: "bg-gradient-to-br from-[#00F5FF] to-[#06B6D4]"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Lightning Fast",
      description: "Get comprehensive summaries in under 2 minutes for 60-minute meetings. Process up to 5 meetings simultaneously.",
      color: "bg-gradient-to-br from-[#00F5FF] to-[#06B6D4]"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Product Manager",
      company: "TechCorp",
      content: "SumurAI has transformed how our team handles meeting follow-ups. We've reduced post-meeting admin work by 80%.",
      rating: 5
    },
    {
      name: "Michael Rodriguez",
      role: "Engineering Lead",
      company: "StartupXYZ",
      content: "The accuracy is incredible. It catches action items we sometimes miss and keeps everyone accountable.",
      rating: 5
    },
    {
      name: "Emily Johnson",
      role: "HR Director",
      company: "GlobalInc",
      content: "Perfect for our remote team meetings. The speaker identification works flawlessly even with different accents.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A] to-[#1A1A1A]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-lg border-b border-[#333333]">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#00F5FF] to-[#06B6D4] rounded-xl flex items-center justify-center shadow-lg">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] bg-clip-text text-transparent">
              SumurAI
            </span>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-300 hover:text-white transition-colors font-medium">
              Features
            </a>
            <a href="#testimonials" className="text-gray-300 hover:text-white transition-colors font-medium">
              Testimonials
            </a>
            <a href="#pricing" className="text-gray-300 hover:text-white transition-colors font-medium">
              Pricing
            </a>
          </nav>

          <Button onClick={() => router.push('/login')} className="bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] hover:from-[#00D4E6] hover:to-[#0891B2] text-black shadow-lg">
            Get Started
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className={`text-5xl md:text-7xl font-bold text-white mb-8 leading-tight transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            Turn meetings into
            <span className="bg-gradient-to-r from-[#00F5FF] via-[#06B6D4] to-[#00F5FF] bg-clip-text text-transparent block mt-2 leading-normal text-center">
              {displayText}
              {displayText && <span className="animate-pulse text-[#00F5FF]">|</span>}
            </span>
          </h1>
          
          <p className={`text-xl md:text-2xl text-gray-300 mb-12 leading-relaxed max-w-3xl mx-auto transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            SumurAI automatically processes your meeting recordings and transcripts, extracting key decisions, action items, and insights so your team can focus on execution, not documentation.
          </p>
          
          <div className={`flex flex-col sm:flex-row gap-4 justify-center mb-12 transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <Button 
              size="lg" 
              onClick={() => router.push('/login')}
              className="bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] hover:from-[#00D4E6] hover:to-[#0891B2] text-black text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => router.push('/demo')}
              className="text-lg px-8 py-6 border-2 border-[#333333] text-white hover:bg-[#1A1A1A]"
            >
              <Mic className="w-5 h-5 mr-2" />
              Watch Demo
            </Button>
          </div>

          <div className={`flex items-center justify-center space-x-8 text-gray-400 text-sm transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-[#00F5FF]" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-[#00F5FF]" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-[#00F5FF]" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-[#1A1A1A]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Powerful features for modern teams
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Everything you need to transform chaotic meetings into structured, actionable outcomes that drive results.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className={`border-0 shadow-lg hover:shadow-xl transition-all duration-500 group cursor-pointer bg-[#0A0A0A] border border-[#333333] animate-in fade-in slide-in-from-bottom-4`}
                style={{ animationDelay: `${index * 150}ms` }}
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
              <div className="text-black/70">Action Item Accuracy</div>
            </div>
            <div className="hover:scale-105 transition-transform duration-300 cursor-pointer">
              <div className="text-4xl md:text-5xl font-bold mb-2 animate-in fade-in slide-in-from-bottom-4" style={{animationDelay: '400ms'}}>&lt;2min</div>
              <div className="text-black/70">Processing Time</div>
            </div>
            <div className="hover:scale-105 transition-transform duration-300 cursor-pointer">
              <div className="text-4xl md:text-5xl font-bold mb-2 animate-in fade-in slide-in-from-bottom-4" style={{animationDelay: '600ms'}}>15</div>
              <div className="text-black/70">Speakers Supported</div>
            </div>
            <div className="hover:scale-105 transition-transform duration-300 cursor-pointer">
              <div className="text-4xl md:text-5xl font-bold mb-2 animate-in fade-in slide-in-from-bottom-4" style={{animationDelay: '800ms'}}>5+</div>
              <div className="text-black/70">Concurrent Meetings</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section  (Maybe will use if we get feedback?)
      <section id="testimonials" className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Loved by teams worldwide
            </h2>
            <p className="text-xl text-slate-600">
              Join thousands of teams already using SumurAI to make their meetings more productive.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-slate-600 mb-6 italic">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <div className="font-semibold text-slate-900">{testimonial.name}</div>
                    <div className="text-sm text-slate-500">{testimonial.role} at {testimonial.company}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      */}

      {/* CTA Section */}
      <section className="py-20 bg-[#0A0A0A]">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to transform your meetings?
            </h2>
            <p className="text-xl text-gray-300 mb-12">
              Start your free trial today and experience the power of AI-driven meeting intelligence.
            </p>
            <Button 
              size="lg" 
              onClick={() => router.push('/login')}
              className="bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] hover:from-[#00D4E6] hover:to-[#0891B2] text-black text-lg px-8 py-6 shadow-xl"
            >
              Start Your Free Trial
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
              <div className="w-8 h-8 bg-gradient-to-br from-[#00F5FF] to-[#06B6D4] rounded-lg flex items-center justify-center">
                <Mic className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-white">SumurAI</span>
            </div>
            <div className="text-gray-300 text-center md:text-right">
              <p>&copy; 2024 SumurAI. All rights reserved.</p>
              <div className="flex space-x-6 mt-2 justify-center md:justify-end">
                <a href="#privacy" className="hover:text-white transition-colors">Privacy</a>
                <a href="#terms" className="hover:text-white transition-colors">Terms</a>
                <a href="#support" className="hover:text-white transition-colors">Support</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;