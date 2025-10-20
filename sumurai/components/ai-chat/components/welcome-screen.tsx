"use client";

interface WelcomeScreenProps {
  onSuggestionClick: (suggestion: string) => void;
}

export function WelcomeScreen({ onSuggestionClick }: WelcomeScreenProps) {
  return (
    <div className="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center p-8">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-6xl font-bold">
          <span className="bg-gradient-to-r from-[#00F5FF] to-[#06B6D4] bg-clip-text text-transparent">
            Welcome to SumurAI
          </span>
        </h1>
        <p className="text-muted-foreground text-xl">Start a chat and upload a meeting recording to get started</p>
      </div>
    </div>
  );
}