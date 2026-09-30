import React from 'react';
import { CheckCircle2, Lock, Sparkles, MapPin, Gift, Image as ImageIcon, BookOpen } from 'lucide-react';

export interface JourneyMilestone {
  id: string;
  type: 'birthday_card' | 'clue' | 'gift' | 'memory' | 'final_surprise';
  referenceId: string | null;
  title: string;
  order: number;
  weight: number;
  active: boolean;
  status: 'COMPLETED' | 'LOCKED' | 'AVAILABLE';
  completedAt?: string | null;
}

export interface JourneySummary {
  completedCount: number;
  totalCount: number;
  percent: number;
  completedWeight: number;
  totalWeight: number;
  milestones: JourneyMilestone[];
  upcomingMilestone: JourneyMilestone | null;
  remainingCount: number;
}

interface JourneyProgressProps {
  summary: JourneySummary;
  isAdmin?: boolean;
  onSelectMilestone?: (milestone: JourneyMilestone) => void;
  className?: string;
}

export const JourneyProgress: React.FC<JourneyProgressProps> = ({
  summary,
  isAdmin = false,
  onSelectMilestone,
  className = '',
}) => {
  const getIcon = (type: JourneyMilestone['type']) => {
    switch (type) {
      case 'birthday_card':
        return <BookOpen className="w-4 h-4 text-rose-500" />;
      case 'clue':
        return <MapPin className="w-4 h-4 text-amber-600" />;
      case 'gift':
        return <Gift className="w-4 h-4 text-purple-600" />;
      case 'memory':
        return <ImageIcon className="w-4 h-4 text-sky-600" />;
      case 'final_surprise':
        return <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />;
    }
  };

  return (
    <div className={`bg-stone-900/90 text-amber-50 rounded-3xl p-6 border border-amber-900/40 shadow-2xl backdrop-blur-md font-serif ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-wide text-amber-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            YOUR BIRTHDAY JOURNEY ❤️
          </h2>
          <p className="text-xs font-serif italic text-stone-400 mt-1">
            {summary.completedCount} of {summary.totalCount} surprises completed
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-extrabold text-amber-300 font-sans">{summary.percent}%</span>
          <span className="block text-[10px] font-mono tracking-widest text-stone-400 uppercase">COMPLETE</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="my-5">
        <div className="w-full h-3 bg-stone-800 rounded-full overflow-hidden p-0.5 border border-stone-700/50">
          <div
            className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-amber-300 rounded-full transition-all duration-1000 ease-out shadow-sm"
            style={{ width: `${Math.max(summary.percent, 5)}%` }}
          />
        </div>
      </div>

      {/* Milestones List Timeline */}
      <div className="space-y-3 relative before:absolute before:left-5 before:top-3 before:bottom-3 before:w-0.5 before:bg-stone-800">
        {summary.milestones.map((m) => {
          const isCompleted = m.status === 'COMPLETED';
          const isNext = summary.upcomingMilestone?.id === m.id;

          return (
            <div
              key={m.id}
              onClick={() => onSelectMilestone && onSelectMilestone(m)}
              className={`relative flex items-center gap-3.5 p-3 rounded-2xl transition-all ${
                isNext
                  ? 'bg-amber-950/70 border border-amber-500/50 shadow-md scale-[1.02]'
                  : isCompleted
                  ? 'bg-stone-800/40 hover:bg-stone-800/70 border border-stone-800/80'
                  : 'bg-stone-900/40 border border-stone-800/30 opacity-70'
              } ${onSelectMilestone ? 'cursor-pointer' : ''}`}
            >
              {/* Dot / Icon */}
              <div
                className={`z-10 w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                  isCompleted
                    ? 'bg-rose-950 border-rose-500 text-rose-300 shadow-sm'
                    : isNext
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 animate-pulse'
                    : 'bg-stone-900 border-stone-700 text-stone-600'
                }`}
              >
                {isCompleted ? <CheckCircle2 className="w-5 h-5 text-rose-400" /> : isNext ? getIcon(m.type) : <Lock className="w-4 h-4 text-stone-500" />}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className={`text-sm font-semibold truncate ${isCompleted ? 'text-amber-100' : isNext ? 'text-amber-300 font-bold' : 'text-stone-400'}`}>
                    {m.title}
                  </h4>
                  {isCompleted && (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
                      Completed
                    </span>
                  )}
                  {isNext && (
                    <span className="text-[10px] font-mono text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-500/40 animate-pulse">
                      Next Up
                    </span>
                  )}
                </div>
                {m.completedAt && (
                  <p className="text-[11px] font-serif italic text-stone-500 mt-0.5">
                    Completed on {new Date(m.completedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Encouragement */}
      <div className="mt-6 pt-4 border-t border-stone-800 text-center">
        <p className="text-sm font-handwriting italic text-amber-200">
          &ldquo;You&rsquo;re {summary.percent}% through our little adventure ❤️&rdquo;
        </p>
        <p className="text-xs text-stone-400 mt-1">
          {summary.remainingCount > 0
            ? `${summary.remainingCount} surprises are still waiting for you.`
            : 'All surprises unlocked! You completed the entire journey! 🎉'}
        </p>
      </div>
    </div>
  );
};
