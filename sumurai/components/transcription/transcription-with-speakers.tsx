"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User } from "lucide-react";

interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  speaker: string;
  speaker_name?: string;
}

interface TranscriptionWithSpeakersProps {
  segments: TranscriptionSegment[];
  title?: string;
}

export default function TranscriptionWithSpeakers({ 
  segments, 
  title = "Meeting Transcription" 
}: TranscriptionWithSpeakersProps) {
  
  // Format time from seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get unique speakers for color coding
  const uniqueSpeakers = Array.from(new Set(segments.map(s => s.speaker)));
  const speakerColors: Record<string, string> = {};
  uniqueSpeakers.forEach((speaker, index) => {
    speakerColors[speaker] = `hsl(${index * 137.5}, 70%, 50%)`;
  });

  // Group consecutive segments from the same speaker
  const groupedSegments = segments.reduce((acc, segment) => {
    const lastGroup = acc[acc.length - 1];
    
    if (lastGroup && lastGroup.speaker === segment.speaker) {
      // Extend the last group
      lastGroup.end = segment.end;
      lastGroup.text += " " + segment.text;
    } else {
      // Start a new group
      acc.push({
        start: segment.start,
        end: segment.end,
        text: segment.text,
        speaker: segment.speaker,
        speaker_name: segment.speaker_name
      });
    }
    
    return acc;
  }, [] as TranscriptionSegment[]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          {title}
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{segments.length} segments</span>
          <span>•</span>
          <span>{uniqueSpeakers.length} speakers detected</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {groupedSegments.map((segment, index) => (
            <div key={index} className="flex gap-3">
              {/* Speaker indicator */}
              <div className="flex-shrink-0 flex flex-col items-center">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                  style={{ backgroundColor: speakerColors[segment.speaker] }}
                >
                  {segment.speaker_name ? 
                    segment.speaker_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) :
                    segment.speaker.replace('SPEAKER_', 'S')
                  }
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge 
                    variant="outline" 
                    className="text-xs"
                    style={{ borderColor: speakerColors[segment.speaker] }}
                  >
                    {segment.speaker_name || segment.speaker}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(segment.start)} - {formatTime(segment.end)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{segment.text}</p>
              </div>
            </div>
          ))}
        </div>
        
        {segments.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No transcription segments available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
