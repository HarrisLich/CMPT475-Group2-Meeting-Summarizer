"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/context/auth-context";
import { getSpeakers, saveSpeakerMappings } from "@/lib/services/summarization";
import { Loader2, User } from "lucide-react";

interface Speaker {
  id: string;
  sample_text: string;
}

interface SpeakerMappingProps {
  meetingId: string;
  onComplete: () => void;
}

export default function SpeakerMapping({ meetingId, onComplete }: SpeakerMappingProps) {
  const { session } = useAuth();
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpeakers = async () => {
      try {
        setIsFetching(true);
        console.log("Fetching speakers for meeting:", meetingId);
        
        const data = await getSpeakers(meetingId);
        console.log("Speakers data:", data);
        
        if (data.speakers) {
          setSpeakers(data.speakers);
          
          // Initialize mappings with empty strings
          const initialMappings: Record<string, string> = {};
          data.speakers.forEach((speaker: Speaker) => {
            initialMappings[speaker.id] = "";
          });
          setMappings(initialMappings);
        }
        
      } catch (err) {
        console.error("Error fetching speakers:", err);
        setError("Failed to load speakers from the meeting");
      } finally {
        setIsFetching(false);
      }
    };
    
    if (meetingId) {
      fetchSpeakers();
    }
  }, [meetingId]);

  const handleChange = (speakerId: string, name: string) => {
    setMappings(prev => ({
      ...prev,
      [speakerId]: name
    }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Saving speaker mappings:", mappings);
      
      // Filter out empty mappings
      const filteredMappings = Object.fromEntries(
        Object.entries(mappings).filter(([_, name]) => name.trim() !== "")
      );
      
      if (Object.keys(filteredMappings).length === 0) {
        setError("Please assign at least one speaker name");
        return;
      }
      
      const result = await saveSpeakerMappings(meetingId, filteredMappings);
      console.log("Speaker mappings saved:", result);
      
      if (result.success) {
        onComplete();
      } else {
        throw new Error(result.error || "Failed to save speaker mappings");
      }
      
    } catch (err) {
      console.error("Error saving speaker mappings:", err);
      setError(err instanceof Error ? err.message : "Failed to save speaker mappings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // Allow users to skip speaker mapping if they don't want to assign names
    onComplete();
  };

  if (isFetching) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading speakers...</span>
        </CardContent>
      </Card>
    );
  }

  if (speakers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Speaker Identification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground">
              No speakers were detected in this meeting, or speaker diarization was not performed.
            </p>
            <Button onClick={handleSkip} className="mt-4">
              Continue Without Speaker Names
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Assign Speaker Names
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          We detected {speakers.length} different speakers in this meeting. 
          Please assign names to help identify who said what.
        </p>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        
        <div className="space-y-6">
          {speakers.map((speaker, index) => (
            <div key={speaker.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" style={{backgroundColor: `hsl(${index * 137.5}, 70%, 50%)`}} />
                <Label htmlFor={`speaker-${speaker.id}`} className="font-medium">
                  {speaker.id}
                </Label>
              </div>
              
              <div className="ml-5 p-3 bg-gray-50 rounded-md border-l-4 border-gray-300">
                <p className="text-sm text-gray-600 italic">
                  Sample: "{speaker.sample_text}..."
                </p>
              </div>
              
              <div className="ml-5">
                <Input
                  id={`speaker-${speaker.id}`}
                  value={mappings[speaker.id] || ""}
                  onChange={(e) => handleChange(speaker.id, e.target.value)}
                  placeholder="Enter speaker name (e.g., John Smith)"
                  disabled={isLoading}
                  className="max-w-md"
                />
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-8 flex justify-between">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={isLoading}
          >
            Skip Speaker Names
          </Button>
          
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Speaker Names
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
