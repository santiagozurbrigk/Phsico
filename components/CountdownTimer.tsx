"use client";

import { useEffect, useState } from "react";

interface CountdownTimerProps {
  nextResetAt: number;
  onReset?: () => void;
}

export default function CountdownTimer({
  nextResetAt,
  onReset,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    function update() {
      const now = Date.now();
      const diff = nextResetAt - now;

      if (diff <= 0) {
        setTimeLeft("Renovando...");
        onReset?.();
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [nextResetAt, onReset]);

  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>Nuevas preguntas en {timeLeft}</span>
    </div>
  );
}
