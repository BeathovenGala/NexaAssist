"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { InteractiveRobotSpline } from "@/components/ui/interactive-3d-robot";
import { SPLINE_CHATBOT_SCENE } from "@/components/landing/copy";
import { cn } from "@/lib/utils";

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      {/* Tooltip Bubble */}
      <div 
        className={cn(
          "relative mb-4 rounded-2xl rounded-br-sm bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow-xl transition-all duration-300",
          !isOpen && "animate-bounce"
        )}
      >
        Your chatbot
        {/* Triangle pointer */}
        <div className="absolute -bottom-2 right-4 h-4 w-4 rotate-45 bg-indigo-600" />
      </div>

      {/* Widget Circle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex h-[5.5rem] w-[5.5rem] items-center justify-center overflow-hidden rounded-full border border-white/20 bg-black shadow-2xl ring-2 ring-indigo-500/50 transition-transform hover:scale-105"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(99,102,241,0.25),transparent_62%)]" />
        <div className="relative z-10 flex h-full w-full items-center justify-center pointer-events-none">
          <div
            className="absolute origin-center"
            style={{ width: "800px", height: "800px", transform: "scale(0.18) translateY(12%)" }}
          >
            <InteractiveRobotSpline scene={SPLINE_CHATBOT_SCENE} className="w-full h-full" />
          </div>
        </div>
      </button>

      {/* Chat Window Mockup */}
      {isOpen && (
        <div className="absolute bottom-28 right-0 w-80 overflow-hidden rounded-2xl border border-white/10 bg-[rgba(10,10,15,0.95)] shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3">
            <h3 className="font-medium text-white">NexaAssist Chat</h3>
            <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="flex h-64 flex-col p-4">
            <div className="mb-3 w-fit max-w-[85%] rounded-2xl rounded-tl-sm bg-indigo-600 px-3 py-2 text-sm text-white">
              Hi there! I'm your AI assistant. How can I help you manage your operations today?
            </div>
            <div className="mt-auto">
              <div className="flex w-full items-center rounded-full border border-white/10 bg-white/5 px-4 py-2">
                <span className="text-sm text-white/40">Type your message...</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
