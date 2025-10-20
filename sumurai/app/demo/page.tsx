'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  Play,
  FileText,
  Brain,
  CheckCircle,
  Users,
  Mic,
  Upload,
  Download,
  Clock,
  Loader2
} from 'lucide-react';
import Header from '@/components/Header';
import ReactMarkdown from 'react-markdown';
import Footer from '@/components/Footer';

export default function DemoPage() {
  const router = useRouter();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<any>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create URL for audio playback
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setError(null);
    setIsTranscribing(true);

    // Create form data
    const formData = new FormData();
    formData.append('audio_file', file);

    try {
      const response = await fetch('http://localhost:8000/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const result = await response.json();
      setTranscriptionResult(result);
    } catch (err) {
      setError('Failed to transcribe audio. Make sure the FastAPI server is running on port 8000.');
      console.error(err);
    } finally {
      setIsTranscribing(false);
    }
  };

  const demoSteps = [
    {
      step: 1,
      title: "Upload Your Recording",
      description: "Drag and drop your meeting file or record directly in the browser",
      icon: <Upload className="w-6 h-6" />,
      details: "Supports MP3, MP4, WAV, and M4A formats up to 2GB"
    },
    {
      step: 2,
      title: "AI Processing",
      description: "Our advanced AI analyzes speech patterns, identifies speakers, and extracts key information",
      icon: <Brain className="w-6 h-6" />,
      details: "Typically processes 1 hour of audio in under 2 minutes"
    },
    {
      step: 3,
      title: "Get Results",
      description: "Receive structured summaries, transcripts, and actionable insights",
      icon: <CheckCircle className="w-6 h-6" />,
      details: "Export to PDF, Word, or integrate with your favorite tools"
    }
  ];

  const features = [
    {
      title: "Smart Transcription",
      description: "Accurate speech-to-text with speaker identification and timestamps",
      icon: <Mic className="w-8 h-8" />
    },
    {
      title: "Action Item Extraction",
      description: "Automatically identifies tasks, deadlines, and responsibilities",
      icon: <CheckCircle className="w-8 h-8" />
    },
    {
      title: "Meeting Summaries",
      description: "Concise overviews highlighting key decisions and next steps",
      icon: <FileText className="w-8 h-8" />
    },
    {
      title: "Team Collaboration",
      description: "Share insights and track follow-ups with your team",
      icon: <Users className="w-8 h-8" />
    }
  ];

  return (
    <div className="min-h-screen bg-[#111111]">
      <Header />

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-[#111111] to-[#151515]">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            See SumurAI in Action
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-12 leading-relaxed">
            Watch how SumurAI transforms your meeting recordings into structured, actionable insights.
            From messy discussions to clear action plans in minutes.
          </p>

          {/* Live Transcription Demo */}
          <div className="max-w-5xl mx-auto mb-16">
            {/* Upload Section */}
            <div className="mb-8 text-center">
              <label htmlFor="audio-upload" className="cursor-pointer">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] hover:from-[#00D4E6] hover:to-[#0891B2] text-black font-semibold px-6 py-3 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl">
                  <Upload className="w-5 h-5" />
                  Upload Your Own Audio
                </div>
              </label>
              <input
                id="audio-upload"
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <p className="text-gray-400 text-sm mt-2">Supports MP3, WAV, M4A, and more</p>
              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>

            <div className="relative bg-gray-900/50 rounded-xl border border-[#00F5FF]/20 overflow-hidden shadow-2xl p-8">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Left: Audio Player */}
                <div className="flex flex-col justify-center">
                  <h3 className="text-2xl font-semibold text-white mb-4">Audio Input</h3>
                  <p className="text-gray-400 mb-6">Listen to the original audio recording</p>
                  <div className="bg-black/30 rounded-lg p-6 border border-[#00F5FF]/10">
                    <audio
                      key={audioUrl || '/demo-audio.mp3'}
                      controls
                      className="w-full"
                      style={{
                        filter: 'hue-rotate(180deg) saturate(2)',
                      }}
                    >
                      <source src={audioUrl || '/demo-audio.mp3'} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                    <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>{transcriptionResult?.filename || 'Demo Audio (0:10)'}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Transcription Result */}
                <div className="flex flex-col">
                  <h3 className="text-2xl font-semibold text-white mb-4">AI Transcription</h3>
                  <p className="text-gray-400 mb-6">Real-time speech-to-text conversion</p>
                  <div className="bg-black/30 rounded-lg border border-[#00F5FF]/10 flex-1 flex flex-col max-h-[500px] overflow-y-auto">
                    {isTranscribing ? (
                      <div className="flex flex-col items-center justify-center h-full p-6">
                        <Loader2 className="w-12 h-12 text-[#00F5FF] animate-spin mb-4" />
                        <p className="text-gray-400">Transcribing and summarizing audio...</p>
                      </div>
                    ) : (
                      <>
                        {/* Full Transcription - Scrollable */}
                        <div className="p-6 pb-4 border-b border-gray-700">
                          <div className="text-sm text-[#00F5FF] mb-2">Full Transcription:</div>
                          <div className="max-h-[150px] overflow-y-auto pr-2">
                            <p className="text-white leading-relaxed">
                              {transcriptionResult?.transcription ||
                                '"If you\'re going through a hard time remember this. Forests may be gorgeous, but there is nothing more alive than a tree that learns how to grow in a cemetery."'}
                            </p>
                          </div>
                        </div>

                        {/* Timestamped Segments - Scrollable */}
                        <div className="p-6 pb-4 border-b border-gray-700 flex-1 flex flex-col">
                          <div className="text-sm text-[#00F5FF] mb-2">Timestamped Segments:</div>
                          <div className="space-y-2 text-sm overflow-y-auto pr-2 max-h-[200px]">
                            {transcriptionResult?.segments ? (
                              transcriptionResult.segments.map((segment: any, index: number) => (
                                <div key={index} className="flex gap-3">
                                  <span className="text-gray-400 font-mono flex-shrink-0">
                                    {Math.floor(segment.start / 60)}:{String(Math.floor(segment.start % 60)).padStart(2, '0')}-
                                    {Math.floor(segment.end / 60)}:{String(Math.floor(segment.end % 60)).padStart(2, '0')}
                                  </span>
                                  <span className="text-gray-300">{segment.text}</span>
                                </div>
                              ))
                            ) : (
                              <>
                                <div className="flex gap-3">
                                  <span className="text-gray-400 font-mono">0:00-0:03</span>
                                  <span className="text-gray-300">If you're going through a hard time remember this.</span>
                                </div>
                                <div className="flex gap-3">
                                  <span className="text-gray-400 font-mono">0:03-0:11</span>
                                  <span className="text-gray-300">Forests may be gorgeous, but there is nothing more alive than a tree that learns how to grow in a cemetery.</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Language Info */}
                        <div className="p-6 pt-4 border-t border-gray-700">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span>Language: {transcriptionResult?.language || 'English'}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Summary Section - Only show when there's a result */}
            {transcriptionResult && transcriptionResult.summary && transcriptionResult.summary.success && (
              <div className="mt-8 bg-gray-900/50 rounded-xl border border-[#00F5FF]/20 overflow-hidden shadow-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Brain className="w-8 h-8 text-[#00F5FF]" />
                  <div>
                    <h3 className="text-2xl font-semibold text-white">AI Summary</h3>
                    <p className="text-gray-400 text-sm">Generated by {transcriptionResult.summary.model_used || 'AI'}</p>
                  </div>
                </div>
                <div className="bg-black/30 rounded-lg border border-[#00F5FF]/10 p-6 max-h-[600px] overflow-y-auto">
                  <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed">
                    <ReactMarkdown
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-white mb-4 mt-6" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-xl font-semibold text-white mb-3 mt-5" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-white mb-2 mt-4" {...props} />,
                        p: ({node, ...props}) => <p className="mb-4 text-gray-300" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 space-y-2 text-gray-300" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-300" {...props} />,
                        li: ({node, ...props}) => <li className="text-gray-300" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />,
                        em: ({node, ...props}) => <em className="italic text-gray-200" {...props} />,
                        code: ({node, ...props}) => <code className="bg-gray-800 px-1.5 py-0.5 rounded text-[#00F5FF] text-sm" {...props} />,
                        pre: ({node, ...props}) => <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto mb-4" {...props} />,
                      }}
                    >
                      {transcriptionResult.summary.summary}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {/* Show error if summarization failed */}
            {transcriptionResult && transcriptionResult.summary && !transcriptionResult.summary.success && (
              <div className="mt-8 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-400">
                  <Brain className="w-5 h-5" />
                  <span className="font-semibold">Summarization Failed</span>
                </div>
                <p className="text-red-300 text-sm mt-2">{transcriptionResult.summary.error}</p>
                {transcriptionResult.summary.hint && (
                  <p className="text-red-300/70 text-xs mt-1">Hint: {transcriptionResult.summary.hint}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-[#151515]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">How It Works</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Transform your meetings in three simple steps
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {demoSteps.map((step, index) => (
                <Card key={step.step} className="bg-gray-900/50 border-[#00F5FF]/20 text-center">
                  <CardContent className="p-8">
                    <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] rounded-full flex items-center justify-center">
                      {step.icon}
                    </div>
                    <div className="text-2xl font-bold text-[#00F5FF] mb-2">
                      Step {step.step}
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">
                      {step.title}
                    </h3>
                    <p className="text-gray-300 mb-4 leading-relaxed">
                      {step.description}
                    </p>
                    <p className="text-sm text-gray-400">
                      {step.details}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sample Output Section */}
      <section className="py-20 bg-gradient-to-b from-[#151515] to-[#111111]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">Sample Output</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              See what you get from a typical meeting analysis
            </p>
          </div>

          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
            {/* Summary Sample */}
            <Card className="bg-gray-900/50 border-[#00F5FF]/20">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#00F5FF]" />
                  Meeting Summary
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <strong className="text-white">Key Decisions:</strong>
                    <p className="text-gray-300 mt-1">• Approved new feature roadmap for Q2<br/>• Selected vendor for authentication system</p>
                  </div>
                  <div>
                    <strong className="text-white">Next Steps:</strong>
                    <p className="text-gray-300 mt-1">• Sarah to finalize contract by Friday<br/>• Team to begin implementation planning</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Items Sample */}
            <Card className="bg-gray-900/50 border-[#00F5FF]/20">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#00F5FF]" />
                  Action Items
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-2"></div>
                    <div>
                      <p className="text-white font-medium">High Priority</p>
                      <p className="text-gray-300">Review security documentation</p>
                      <p className="text-gray-400 text-xs">Due: March 15 • Assigned: Mike</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2"></div>
                    <div>
                      <p className="text-white font-medium">Medium Priority</p>
                      <p className="text-gray-300">Update project timeline</p>
                      <p className="text-gray-400 text-xs">Due: March 20 • Assigned: Team</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#111111]">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Transform Your Meetings?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Start turning your conversations into actionable insights today
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => router.push('/core')}
                className="bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] hover:from-[#00D4E6] hover:to-[#0891B2] text-black text-lg px-8 py-6"
              >
                Try SumurAI Now
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push('/')}
                className="border-[#00F5FF] text-[#00F5FF] hover:bg-[#00F5FF] hover:text-black text-lg px-8 py-6"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}