import React from 'react';
import { Layers, HelpCircle } from 'lucide-react';
import { ExplanationFeature } from '../types/index';

interface LimeFeatureBarChartProps {
  intercept: number;
  features: ExplanationFeature[];
  maxFeatures?: number;
}

export const LimeFeatureBarChart: React.FC<LimeFeatureBarChartProps> = ({
  intercept = 70,
  features = [],
  maxFeatures = 6,
}) => {
  const displayFeatures = (features || []).slice(0, maxFeatures);
  const maxImpact = Math.max(...(displayFeatures || []).map(f => Math.abs(f?.impactValue || 0)), 1);

  return (
    <div id="lime-explanation-card" className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">LIME Local Surrogate Sensitivity</h3>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
              Perturbation Neighborhood
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Fits a local Ridge regression model around the student's specific academic vector to inspect local slope.
          </p>
        </div>
        <div className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
          Local Intercept: <span className="text-slate-900 font-semibold">{(intercept ?? 70).toFixed(1)}</span>
        </div>
      </div>

      <div className="space-y-3">
        {(displayFeatures || []).map((item, idx) => {
          const isPos = item.impactValue >= 0;
          const pctWidth = Math.min(100, Math.round((Math.abs(item.impactValue) / maxImpact) * 100));

          return (
            <div key={idx} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                  <span>{item.displayName}</span>
                  <span className="text-slate-600 font-normal">val: {item.inputValue}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-600">Surrogate Weight:</span>
                  <span
                    className={`font-semibold ${
                      isPos ? 'text-purple-700' : 'text-amber-700'
                    }`}
                  >
                    {isPos ? `+${item.impactValue.toFixed(2)}` : item.impactValue.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isPos ? 'bg-purple-600' : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.max(6, pctWidth)}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                {item.humanDescription}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-purple-600" />
          <span>Surrogate sample size: N=70 Gaussian neighborhood perturbations</span>
        </span>
        <span className="text-slate-600 font-mono text-[10px]">Kernel: Exp Euclidean</span>
      </div>
    </div>
  );
};
