'use client';
import { useRouter } from 'next/navigation';
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

  const features = [
    {
      icon: <Brain className="w-6 h-6" />,
      title: "AI-Powered Summarization",
      description: "Transform lengthy meetings into concise, actionable summaries with advanced AI that captures key decisions and insights.",
      color: "bg-blue-500"
    },
    {
      icon: <CheckCircle className="w-6 h-6" />,
      title: "Action Item Extraction",
      description: "Automatically identify tasks, deadlines, and responsibilities from your meetings with 90% accuracy.",
      color: "bg-green-500"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Speaker Identification",
      description: "Track who said what with intelligent speaker tagging that supports up to 15 participants per meeting.",
      color: "bg-purple-500"
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Calendar Integration",
      description: "Seamlessly sync action items and deadlines directly to Google Calendar and Outlook with one click.",
      color: "bg-orange-500"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Enterprise Security",
      description: "Your data stays secure with end-to-end encryption and compliance with FERPA and HIPAA standards.",
      color: "bg-red-500"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Lightning Fast",
      description: "Get comprehensive summaries in under 2 minutes for 60-minute meetings. Process up to 5 meetings simultaneously.",
      color: "bg-yellow-500"
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              SumurAI
            </span>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">
              Features
            </a>
            <a href="#testimonials" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">
              Testimonials
            </a>
            <a href="#pricing" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">
              Pricing
            </a>
          </nav>

          <Button onClick={() => router.push('/login')} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg">
            Get Started
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm font-medium">
            🚀 Transform Your Meeting Experience
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-8 leading-tight">
            Turn meetings into
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent block mt-2">
              actionable insights
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-600 mb-12 leading-relaxed max-w-3xl mx-auto">
            SumurAI automatically processes your meeting recordings and transcripts, extracting key decisions, action items, and insights so your team can focus on execution, not documentation.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              onClick={() => router.push('/login')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => router.push('/demo')}
              className="text-lg px-8 py-6 border-2 hover:bg-slate-50"
            >
              <Mic className="w-5 h-5 mr-2" />
              Watch Demo
            </Button>
          </div>

          <div className="flex items-center justify-center space-x-8 text-slate-500 text-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
              Powerful features for modern teams
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Everything you need to transform chaotic meetings into structured, actionable outcomes that drive results.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer">
                <CardContent className="p-8">
                  <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center mb-6 text-white group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">90%</div>
              <div className="text-blue-100">Action Item Accuracy</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">&lt;2min</div>
              <div className="text-blue-100">Processing Time</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">15</div>
              <div className="text-blue-100">Speakers Supported</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">5+</div>
              <div className="text-blue-100">Concurrent Meetings</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section  (Maybe will use if we get feedback?)
      <section id="testimonials" className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
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
      <section className="py-20 bg-slate-900">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to transform your meetings?
            </h2>
            <p className="text-xl text-slate-300 mb-12">
              Start your free trial today and experience the power of AI-driven meeting intelligence.
            </p>
            <Button 
              size="lg" 
              onClick={() => router.push('/login')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-6 shadow-xl"
            >
              Start Your Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Mic className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-800">SumurAI</span>
            </div>
            <div className="text-slate-600 text-center md:text-right">
              <p>&copy; 2024 SumurAI. All rights reserved.</p>
              <div className="flex space-x-6 mt-2 justify-center md:justify-end">
                <a href="#privacy" className="hover:text-slate-900 transition-colors">Privacy</a>
                <a href="#terms" className="hover:text-slate-900 transition-colors">Terms</a>
                <a href="#support" className="hover:text-slate-900 transition-colors">Support</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;