"use client";

import { useState, useEffect } from "react";

interface CountdownTimerProps {
  expiresAt: string;
  onExpired?: () => void;
}

export function CountdownTimer({ expiresAt, onExpired }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      return Math.max(0, Math.floor(diff / 1000));
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (remaining <= 0) {
        setIsExpired(true);
        clearInterval(interval);
        onExpired?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const percentage = (timeLeft / (10 * 60)) * 100; // 10 min window

  const isUrgent = timeLeft <= 60;
  const isWarning = timeLeft <= 180;

  if (isExpired) {
    return (
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-xl bg-red-950/50 border border-red-800/30 px-6 py-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span className="text-lg font-bold text-red-400">
            Reservation Expired
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--muted-foreground)]">
          Time remaining
        </span>
        <div
          className={`text-3xl font-mono font-bold tabular-nums ${
            isUrgent
              ? "text-red-400 pulse-warning"
              : isWarning
              ? "text-amber-400"
              : "text-emerald-400"
          }`}
        >
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${
            isUrgent
              ? "bg-gradient-to-r from-red-600 to-red-500"
              : isWarning
              ? "bg-gradient-to-r from-amber-600 to-amber-500"
              : "bg-gradient-to-r from-emerald-600 to-emerald-500"
          }`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  );
}
