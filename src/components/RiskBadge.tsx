import React from 'react';
import { AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { RiskLevel } from '../types/index';

interface RiskBadgeProps {
  level: RiskLevel | string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, showIcon = true, size = 'md' }) => {
  const isHigh = level === 'High Risk';
  const isMed = level === 'Medium Risk';
  const isLow = level === 'Low Risk';

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs font-medium px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-semibold px-3 py-1.5 gap-2',
  }[size];

  if (isHigh) {
    return (
      <span
        id="badge-risk-high"
        className={`inline-flex items-center rounded-full bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900 ${sizeClasses} whitespace-nowrap`}
      >
        {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />}
        <span>High Academic Risk</span>
      </span>
    );
  }

  if (isMed) {
    return (
      <span
        id="badge-risk-medium"
        className={`inline-flex items-center rounded-full bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900 ${sizeClasses} whitespace-nowrap`}
      >
        {showIcon && <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />}
        <span>Medium Academic Risk</span>
      </span>
    );
  }

  return (
    <span
      id="badge-risk-low"
      className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900 ${sizeClasses} whitespace-nowrap`}
    >
      {showIcon && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
      <span>Low Academic Risk</span>
    </span>
  );
};
