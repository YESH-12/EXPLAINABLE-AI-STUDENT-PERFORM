import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Sparkles, 
  LineChart, 
  FileText, 
  CheckCircle2, 
  UserCircle,
  HelpCircle,
  ShieldCheck,
  Zap,
  Activity
} from 'lucide-react';
import { Role } from '../types/index';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  role: Role;
  isOpen: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  role,
  isOpen,
  onCloseMobile,
}) => {
  const isStudent = role === 'student';

  const navItems = isStudent
    ? [
        { id: 'student-dashboard', label: 'My Performance', icon: LayoutDashboard },
        { id: 'prediction-center', label: 'Score Simulator & XAI', icon: Sparkles },
        { id: 'model-evaluation', label: 'Model Benchmarks', icon: LineChart },
        { id: 'qa-tests', label: 'System QA Tests', icon: CheckCircle2 },
      ]
    : [
        { id: 'faculty-dashboard', label: 'Faculty Analytics', icon: LayoutDashboard },
        { id: 'students-directory', label: 'Student Directory', icon: Users },
        { id: 'prediction-center', label: 'Prediction & XAI Center', icon: Sparkles },
        { id: 'model-evaluation', label: 'Model Evaluation', icon: LineChart },
        { id: 'reports', label: 'Academic Reports', icon: FileText },
        { id: 'qa-tests', label: 'Automated Test Suite', icon: CheckCircle2 },
      ];

  const handleSelect = (id: string) => {
    setCurrentTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/40 z-30 md:hidden backdrop-blur-xs"
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed md:sticky top-16 left-0 z-40 w-64 h-[calc(100vh-4rem)] bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Active Role Card */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-medium">Active Portal</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <p className="text-sm font-bold text-slate-900 capitalize flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-blue-600" />
              {role === 'student' ? 'Student Workspace' : role === 'admin' ? 'Administrator' : 'Faculty Advisory'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {role === 'student'
                ? 'Personal academic progress & recommendations'
                : 'Cohort risk monitoring, predictions & interventions'}
            </p>
          </div>

          {/* Nav List */}
          <div className="space-y-1">
            <div className="px-2 pb-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-600'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom System Status */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[11px] font-medium text-slate-600">ML Engine</span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
              Online (4 Models)
            </span>
          </div>
          <div className="mt-2 text-[10px] text-slate-600 leading-tight">
            SHAP Shapley Values & LIME Surrogates Active
          </div>
        </div>
      </aside>
    </>
  );
};
