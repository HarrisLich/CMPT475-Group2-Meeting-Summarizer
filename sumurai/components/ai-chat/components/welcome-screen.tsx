"use client";

import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";

interface WelcomeScreenProps {
  onSuggestionClick: (suggestion: string) => void;
}

const suggestions = [
  {
    title: "Don't worry, this update is quicker than your internet history deletion!",
    category: "Tech Help"
  },
  {
    title:
      "A majestic bird soars high above a crystal-clear glacial lake, its wings catching the sunlight.",
    category: "Creative Writing"
  },
  {
    title:
      "For Wallace the walrus, the perfect day starts with a leisurely swim in the icy Arctic waters",
    category: "Storytelling"
  },
  {
    title: "The best time to stretch is whenever your body feels tight or stiff!",
    category: "Health & Wellness"
  }
];

export function WelcomeScreen({ onSuggestionClick }: WelcomeScreenProps) {
  return (
    <div className="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center p-8">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-6xl font-bold">
          <span className="bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] bg-clip-text text-transparent">
            Welcome, John Doe
          </span>
        </h1>
        <p className="text-muted-foreground text-xl">May I be of assistance today?</p>
      </div>

      <div className="grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
        {suggestions.map((suggestion, index) => (
          <Button
            key={index}
            variant="outline"
            onClick={() => onSuggestionClick(suggestion.title)}
            className="group h-auto border-gray-600 p-6 text-left hover:bg-gray-800 hover:border-[#00F5FF]/30">
            <div className="flex w-full items-start justify-between">
              <div className="flex-1 pr-4">
                <p className="text-muted-foreground text-sm leading-relaxed text-wrap">
                  {suggestion.title}
                </p>
              </div>
              <ArrowUpRight className="group-hover:text-primary text-muted-foreground h-4 w-4 flex-shrink-0" />
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}