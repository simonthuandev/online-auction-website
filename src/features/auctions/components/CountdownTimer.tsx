import React, { useEffect, useState, useRef } from 'react';
import { getRemainingMs, formatCountdown } from '@/lib/time';
import { Clock } from 'lucide-react';

export interface CountdownTimerProps {
  targetTime: string;
  label?: string;
  onZero?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
  autoRefetchDelayMs?: number;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetTime,
  label,
  onZero,
  size = 'md',
  showIcon = true,
  className = '',
  autoRefetchDelayMs = 1500,
}) => {
  const [remainingMs, setRemainingMs] = useState<number>(() =>
    getRemainingMs(targetTime)
  );
  const [prevTargetTime, setPrevTargetTime] = useState(targetTime);
  const onZeroTriggeredRef = useRef(false);

  // Adjust remaining time if targetTime prop changes
  if (targetTime !== prevTargetTime) {
    setPrevTargetTime(targetTime);
    setRemainingMs(getRemainingMs(targetTime));
  }

  useEffect(() => {
    onZeroTriggeredRef.current = getRemainingMs(targetTime) <= 0;

    const interval = setInterval(() => {
      const remaining = getRemainingMs(targetTime);
      setRemainingMs(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        if (!onZeroTriggeredRef.current) {
          onZeroTriggeredRef.current = true;
          if (onZero) {
            // Trigger refetch after 1-2s delay as requested in specification
            setTimeout(() => {
              onZero();
            }, autoRefetchDelayMs);
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime, onZero, autoRefetchDelayMs]);

  const { formatted, days, hours, minutes, seconds } = formatCountdown(remainingMs);
  const isZero = remainingMs <= 0;

  const sizeClasses = {
    sm: {
      container: 'text-xs gap-1.5',
      icon: 'h-3.5 w-3.5',
      badge: 'px-1.5 py-0.5 rounded text-xs font-mono font-semibold',
    },
    md: {
      container: 'text-sm gap-2',
      icon: 'h-4 w-4',
      badge: 'px-2 py-1 rounded-md text-sm font-mono font-bold',
    },
    lg: {
      container: 'text-base gap-2.5',
      icon: 'h-5 w-5',
      badge: 'px-2.5 py-1.5 rounded-lg text-base font-mono font-extrabold',
    },
  }[size];

  return (
    <div
      className={`inline-flex items-center font-medium ${sizeClasses.container} ${
        isZero ? 'text-slate-400' : 'text-slate-700'
      } ${className}`}
      role="timer"
      aria-label={label ?? 'Thời gian đếm ngược'}
    >
      {showIcon && (
        <Clock
          className={`${sizeClasses.icon} ${
            isZero ? 'text-slate-400' : 'text-amber-500 animate-pulse'
          }`}
        />
      )}

      {label && <span className="text-xs text-slate-500">{label}</span>}

      {isZero ? (
        <span
          className={`bg-slate-100 text-slate-500 border border-slate-200 ${sizeClasses.badge}`}
        >
          00:00:00
        </span>
      ) : (
        <div className="flex items-center gap-1">
          {days > 0 && (
            <span className="font-semibold text-slate-700">{days}d</span>
          )}
          <span
            className={`bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs ${sizeClasses.badge}`}
          >
            {days > 0
              ? `${hours.toString().padStart(2, '0')}:${minutes
                  .toString()
                  .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
              : formatted}
          </span>
        </div>
      )}
    </div>
  );
};
