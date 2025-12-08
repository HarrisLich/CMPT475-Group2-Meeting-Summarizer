'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  CheckCircle,
  Users,
  Brain,
  Gauge,
  Zap,
  Github,
  Linkedin,
  Mail,
  GraduationCap,
  Target,
  Lightbulb,
  Code,
  Database,
  Cpu
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function AboutPage() {
  const router = useRouter();

  const teamMembers = [
    {
      name: "Stefano Farro",
      role: "UI/UX & Frontend",
      description: "New Jersey native, fan of hockey and good music. Can cook minute rice in 50 seconds. ",
      skills: ["TypeScript", "Next.js", "ShadCN", "Tailwind CSS"],
      github: "https://github.com/stefanog1121",
      linkedin: "https://www.linkedin.com/in/stefanogfarro/",
      email: "stefanogfarro@gmail.com"
    },
    {
      name: "Evan Brown ",
      role: "Frontend Developer & UI/UX Designer",
      description: "Marist University '26, forever trying to better myself as a programmer. First example, this app.",
      skills: ["React", "TypeScript", "UI/UX Design", "Next.js", "Tailwind CSS"],
      github: "https://github.com/ecool78",
      linkedin: "https://www.linkedin.com/in/evan-brown-016332222/",
      email: "evan.brown2@marist.edu"
    },
    {
      name: "Harris Lichstein",
      role: "Project Management",
      description: "I'm a passionate full-stack engineer with a strong background in real time data integration, microservices architecture, and DevOps. I love building scalable systems from the ground up and I'm always looking for new ways to solve complex problems.",
      skills: ["Docker", "PostgreSQL", "RabbitMQ", "Node.js", "Svelte", "AWS", "CI/CD"],
      github: "https://github.com/harrislich",
      linkedin: "https://www.linkedin.com/in/harris-lichstein-620b84291/",
      email: "harris.lichstein@gmail.com"
    },
    {
      name: "Joshua Chenoweth",
      role: "IT",
      description: "I'm a passionate IT professional from Maryland with a strong background in security, infrastructure, and backend development. I'm a quick learner and I'm always looking for new ways to improve my skills.",
      skills: ["Python", "Security/Infrastructure", "Backend Development"],
      github: "https://github.com/JoshuaChenoweth",
      linkedin: "https://linkedin.com/in/jgchenoweth",
      email: "Joshua.chenoweth10@gmail.com"
    },
    {
      name: "Marko Pavic",
      role: "Software Engineer",
      description: "Trying to learn everything I can about, in, and around programming!",
      skills: ["Python, Backend Development, FastAPI, CI/CD, Docker, AI"],
      github: "https://github.com/markopav88",
      linkedin: "https://www.linkedin.com/in/marko-p-159122231/",
      email: "markopavic7777@gmail.com"
    }
  ];

  const projectHighlights = [
    {
      icon: <Target className="w-6 h-6" />,
      title: "Academic Excellence",
      description: "Capstone project for Marist University Computer Science program, demonstrating advanced technical skills and real-world application."
    },
    {
      icon: <Lightbulb className="w-6 h-6" />,
      title: "Innovation Focus",
      description: "Combining cutting-edge AI technology with practical business needs to solve real workplace challenges."
    },
    {
      icon: <Code className="w-6 h-6" />,
      title: "Modern Tech Stack",
      description: "Built with industry-standard technologies including React, Next.js, Python, and advanced AI/ML frameworks."
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Collaborative Development",
      description: "Developed using agile methodologies with focus on teamwork, code quality, and continuous integration."
    }
  ];

  const techStack = [
    { category: "Frontend", technologies: ["React", "Next.js", "TypeScript", "Tailwind CSS", "ShadCN UI"] },
    { category: "Backend", technologies: ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker"] },
    { category: "AI/ML", technologies: ["OpenAI API", "Whisper", "Natural Language Processing", "Speech Recognition"] },
    { category: "Infrastructure", technologies: ["AWS", "Vercel", "CI/CD", "Git", "Docker Compose"] }
  ];

  return (
    <div className="min-h-screen bg-[#111111]">
      <Header />

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-[#111111] to-[#151515]">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            About SumurAI
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-12 leading-relaxed">
            A capstone project turned practical tool. SumurAI transforms meeting recordings into
            structured summaries, actionable tasks, and timestamped transcripts—powered by AI.
          </p>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="py-20 bg-[#151515]">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Mission Column */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-4xl font-bold text-white mb-6">Our Mission</h2>
                  <p className="text-gray-300 leading-relaxed text-lg">
                    Transform meeting recordings into clear, actionable insights. SumurAI helps individuals
                    and teams capture important conversations, extract key decisions, and stay organized—without
                    manually reviewing hours of audio.
                  </p>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-white mb-4">The Problem</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Reviewing meeting recordings is time-consuming. Important action items get lost in
                    long transcripts, decisions are forgotten, and team members waste hours searching
                    for specific moments in recordings.
                  </p>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-white mb-4">Our Solution</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Upload audio or video, get instant AI-powered analysis. SumurAI generates structured
                    summaries with key points, extracts prioritized action items, and provides timestamped
                    transcripts—with optional speaker identification.
                  </p>
                </div>
              </div>

              {/* Features Column */}
              <div className="bg-gray-900/50 rounded-xl border border-[#00F5FF]/20 p-8">
                <h3 className="text-2xl font-bold text-white mb-6 text-center">Why Choose SumurAI?</h3>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] flex items-center justify-center flex-shrink-0 mt-1">
                      <Brain className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-1">AI-Powered Intelligence</h4>
                      <p className="text-gray-400">Advanced NLP extracts summaries, action items, and key decisions automatically.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] flex items-center justify-center flex-shrink-0 mt-1">
                      <Zap className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-1">Fast Processing</h4>
                      <p className="text-gray-400">Get results in under 2 minutes with fast mode, or detailed analysis in 10-20 min.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] flex items-center justify-center flex-shrink-0 mt-1">
                      <Users className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-1">Speaker Tracking</h4>
                      <p className="text-gray-400">Optional diarization mode identifies and tracks up to 15+ speakers.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] flex items-center justify-center flex-shrink-0 mt-1">
                      <Gauge className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-1">Flexible Modes</h4>
                      <p className="text-gray-400">Choose speed or detail: fast transcription or full speaker diarization.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      
      {/* --------- Unsure if we'll use this yet, maybe if we need to fill space ---------
      Technology Stack Section 
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">Technology Stack</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Built with modern, industry-standard technologies for performance, scalability, and maintainability.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {techStack.map((stack, index) => (
              <Card key={index} className="bg-gray-900/30 border-gray-700 hover:border-[#00F5FF]/40 transition-colors">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 text-center">
                    {stack.category}
                  </h3>
                  <div className="space-y-2">
                    {stack.technologies.map((tech, techIndex) => (
                      <div key={techIndex} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#00F5FF]"></div>
                        <span className="text-gray-300 text-sm">{tech}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      */}
            
      {/* Team Section */}
      <section className="py-20 bg-gradient-to-b from-[#151515] to-[#111111]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">Meet the Development Team</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Created as part of Marist University 2025 Computer Science Senior Capping.
            </p>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            {teamMembers.map((member, index) => (
              <Card key={index} className="bg-gray-900/50 border-[#00F5FF]/20 hover:border-[#00F5FF]/40 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] rounded-full flex items-center justify-center text-black font-bold text-lg flex-shrink-0">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-1">{member.name}</h3>
                          <p className="text-[#00F5FF] font-medium text-base">{member.role}</p>
                        </div>
                        <div className="flex gap-2 mt-2 md:mt-0">
                          <a
                            href={member.github}
                            className="text-gray-400 hover:text-[#00F5FF] transition-colors"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Github className="w-5 h-5" />
                          </a>
                          <a
                            href={member.linkedin}
                            className="text-gray-400 hover:text-[#00F5FF] transition-colors"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Linkedin className="w-5 h-5" />
                          </a>
                          <a
                            href={`mailto:${member.email}`}
                            className="text-gray-400 hover:text-[#00F5FF] transition-colors"
                            aria-label={`Email ${member.name}`}
                            title={`Send email to ${member.email}`}
                          >
                            <Mail className="w-5 h-5" />
                          </a>
                        </div>
                      </div>

                      <p className="text-gray-300 text-sm leading-relaxed mb-3">
                        {member.description}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {member.skills.map((skill, skillIndex) => (
                          <span
                            key={skillIndex}
                            className="px-2 py-1 bg-[#00F5FF]/20 text-[#00F5FF] text-xs rounded-md"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#111111]">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Experience SumurAI?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              See how our AI-powered meeting summarization can transform your workflow
            </p>
            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={() => router.push('/core')}
                className="bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] hover:from-[#00D4E6] hover:to-[#0891B2] text-black text-lg px-8 py-6"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
