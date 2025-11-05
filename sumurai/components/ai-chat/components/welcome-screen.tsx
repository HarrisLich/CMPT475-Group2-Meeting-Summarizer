"use client";

interface WelcomeScreenProps {
  onSuggestionClick: (suggestion: string) => void;
}

export function WelcomeScreen({ onSuggestionClick }: WelcomeScreenProps) {
  return (
    <div className="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center p-8">
      <div className="mb-12 text-center">
        <h1 className="mb-6 text-6xl font-bold text-white">
          <span className="bg-gradient-to-r from-[#2EF8FF] to-[#04ADCC] bg-clip-text text-transparent">Welcome to SumurAI</span>
        </h1>

        {/* Animated Horizontal Rule - Sword Swipe Effect */}
        <div className="relative w-full max-w-4xl mx-auto mb-6 h-[2px] bg-gradient-to-r from-transparent via-[#333333] to-transparent overflow-hidden">
          <div className="absolute inset-0 sword-flash"></div>
          <style jsx>{`
            @keyframes sword-flash {
              0% {
                transform: translateX(-100%);
                opacity: 0;
              }
              20% {
                opacity: 1;
              }
              80% {
                opacity: 1;
              }
              100% {
                transform: translateX(100%);
                opacity: 0;
              }
            }
            .sword-flash {
              background: linear-gradient(90deg,
                transparent 0%,
                transparent 25%,
                rgba(0, 245, 255, 0.5) 40%,
                rgba(0, 245, 255, 1) 50%,
                rgba(0, 245, 255, 0.5) 60%,
                transparent 75%,
                transparent 100%
              );
              width: 100%;
              height: 100%;
              animation: sword-flash 1.75s ease-in-out infinite;
            }
          `}</style>
        </div>

        <p className="text-gray-400 text-xl">Select a chat or upload a meeting recording to get started.</p>
      </div>
    </div>
  );
}