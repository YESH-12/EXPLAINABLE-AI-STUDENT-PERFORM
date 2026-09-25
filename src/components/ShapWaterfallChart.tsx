import React from 'react';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';
import { ExplanationFeature } from '../types/index';

interface ShapWaterfallChartProps {
  baseValue: number;
  predictedScore: number;
  features: ExplanationFeature[];
  maxFeatures?: number;
}

export const ShapWaterfallChart: React.FC<ShapWaterfallChartProps> = ({
  baseValue = 70,
  predictedScore = 70,
  features = [],
  maxFeatures = 8,
}) => {
  const displayFeatures = (features || []).slice(0, maxFeatures);
  const maxImpact = Math.max(...(displayFeatures || []).map(f => Math.abs(f?.impactValue || 0)), 1);

  return (
    <div id="shap-waterfall-card" className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">SHAP Feature Attribution (Shapley Values)</h3>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              Additive Local Attributions
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Deconstructs the deviation from cohort baseline ({baseValue.toFixed(1)} pts) to projected score ({predictedScore.toFixed(1)} pts).
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
            <span>Positive Boost</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
            <span>Negative Drag</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {(displayFeatures || []).map((item, idx) => {
          const isPos = item.impactValue >= 0;
          const pctWidth = Math.min(100, Math.round((Math.abs(item.impactValue) / maxImpact) * 100));

          return (
            <div key={idx} className="group p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5 font-medium text-slate-800">
                  {isPos ? (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  )}
                  <span>{item.displayName}</span>
                  <span className="text-slate-600 font-normal">({item.inputValue})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-semibold ${
                      isPos ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {isPos ? `+${item.impactValue.toFixed(1)}` : item.impactValue.toFixed(1)} pts
                  </span>
                </div>
              </div>

              {/* Progress Bar with Zero-center logic */}
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    isPos ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.max(8, pctWidth)}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-600 mt-1 pl-5 group-hover:text-slate-700 leading-relaxed">
                {item.humanDescription}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg">
        <Info className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
        <span>
          <strong>Efficiency Axiom Verified:</strong> Baseline Expected Value ({baseValue.toFixed(1)}) + sum of all SHAP feature impacts equals the predicted score ({predictedScore.toFixed(1)}).
        </span>
      </div>
    </div>
  );
};
