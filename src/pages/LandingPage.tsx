import React from 'react';
import { 
  GraduationCap, 
  Brain, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  BarChart3, 
  ArrowRight, 
  Compass, 
  Users, 
  Layers, 
  Zap 
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onLoginDemo: (email: string) => void;
  onOpenPrivacy: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onLoginDemo,
  onOpenPrivacy,
}) => {
  return (
    <div id="landing-page" className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Top Banner */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-xs sticky top-0 z-20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <GraduationCap className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">
              Explainable<span className="text-blue-600">AI</span> Academic System
            </h1>
            <p className="text-xs text-slate-500">
              Student Performance Prediction with SHAP & LIME
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenPrivacy}
            className="text-xs text-slate-600 hover:text-slate-900 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Responsible AI Charter
          </button>
          <button
            onClick={onGetStarted}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <span>Sign In / Access Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-12 pb-16 w-full">
        <div className="text-center max-w-3xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Advanced Machine Learning & Interpretable Explanations</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Explainable AI-Driven Student Performance Prediction
          </h2>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Move beyond opaque "black box" algorithms. Predict final academic outcomes, pinpoint risk levels early, and understand the exact positive and negative factors driving each projection through verified SHAP and LIME interpretations.
          </p>

          {/* Direct Role Login Buttons */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => onLoginDemo('faculty@university.edu')}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2"
            >
              <Users className="w-4 h-4 text-blue-400" />
              <span>Launch Faculty Portal</span>
            </button>
            <button
              onClick={() => onLoginDemo('student@university.edu')}
              className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center gap-2"
            >
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>Launch Student Portal</span>
            </button>
            <button
              onClick={() => onLoginDemo('student2@university.edu')}
              className="px-5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center gap-2"
            >
              <Brain className="w-4 h-4 text-amber-700" />
              <span>View At-Risk Student Demo</span>
            </button>
          </div>
        </div>

        {/* 3 Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Ensemble Machine Learning</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Rigorous comparative training across Random Forest, XGBoost, LightGBM, and CatBoost. Validated on test splits for R², RMSE, MAE, and balanced multi-class risk classification.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">SHAP & LIME Explanations</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Game-theoretic Shapley values ensure local efficiency attribution, paired with LIME local perturbation surrogates to reveal exactly why an outcome was predicted.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Actionable Interventions</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Synthesizes influential features into constructive, non-punitive recommendations: attendance plans, faculty mentorship, milestone checkpoints, and study rescheduling.
            </p>
          </div>
        </div>

        {/* How The System Works */}
        <div className="mt-16 bg-white border border-slate-200 rounded-2xl p-8 shadow-xs">
          <h3 className="text-lg font-bold text-slate-900 text-center mb-8">
            How The Machine Learning Pipeline Works
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-xs font-bold text-blue-600 mb-1">Step 1</div>
              <h4 className="text-sm font-semibold text-slate-900 mb-1">Academic Ingestion</h4>
              <p className="text-xs text-slate-600">
                Collects attendance, internal exams, assignments, study hours, GPA, quiz averages, and LMS activity.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-xs font-bold text-blue-600 mb-1">Step 2</div>
              <h4 className="text-sm font-semibold text-slate-900 mb-1">Feature Engineering</h4>
              <p className="text-xs text-slate-600">
                Computes interaction terms, engagement indices, study efficiency ratios, and academic consistency metrics.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-xs font-bold text-blue-600 mb-1">Step 3</div>
              <h4 className="text-sm font-semibold text-slate-900 mb-1">Dual Explainability</h4>
              <p className="text-xs text-slate-600">
                Calculates SHAP Shapley points contribution and LIME local linear surrogate sensitivities with zero leakage.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-xs font-bold text-blue-600 mb-1">Step 4</div>
              <h4 className="text-sm font-semibold text-slate-900 mb-1">Advisory Interventions</h4>
              <p className="text-xs text-slate-600">
                Faculty monitor watchlists, log intervention notes, and track student completion of personalized growth milestones.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 px-6 text-center text-xs text-slate-500">
        <p>
          Explainable AI-Based Student Performance Prediction System • Production Grade Web Application
        </p>
        <p className="mt-1 text-slate-400">
          Compliant with Responsible AI, FERPA Guidelines, and Human-in-the-Loop Academic Decision Making.
        </p>
      </footer>
    </div>
  );
};
