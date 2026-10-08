import React, { useState, useEffect } from 'react';
import { Sparkles, Search, ArrowRight, Hash, User as UserIcon, Cpu, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Student, AiStudentBrief } from '../types/index';

interface AiStudentLookupProps {
  onSelectStudentWithAi: (studentId: string, aiBrief?: AiStudentBrief) => void;
  compact?: boolean;
}

export const AiStudentLookup: React.FC<AiStudentLookupProps> = ({
  onSelectStudentWithAi,
  compact = false,
}) => {
  const [rollNo, setRollNo] = useState('');
  const [studentName, setStudentName] = useState('');
  const [createIfNotFound, setCreateIfNotFound] = useState(true);
  const [studentsCache, setStudentsCache] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    fetch('/api/students?limit=200')
      .then(r => r.json())
      .then(d => setStudentsCache(d?.students || []))
      .catch(() => {});
  }, []);

  const matchingSuggestions = (studentsCache || []).filter(s => {
    if (!rollNo && !studentName) return false;
    const matchRoll = rollNo ? s.studentId.toLowerCase().includes(rollNo.toLowerCase()) : true;
    const matchName = studentName ? s.studentName.toLowerCase().includes(studentName.toLowerCase()) : true;
    return matchRoll && matchName;
  }).slice(0, 5);

  const handleAiLookup = async (e?: React.FormEvent, presetStudent?: Student) => {
    if (e) e.preventDefault();
    const targetRoll = presetStudent ? presetStudent.studentId : rollNo.trim();
    const targetName = presetStudent ? presetStudent.studentName : studentName.trim();

    if (!targetRoll && !targetName) {
      setError('Please enter a Student Roll No, Student Name, or both.');
      return;
    }

    setError(null);
    setLoading(true);
    setShowSuggestions(false);

    try {
      const res = await fetch('/api/ai/student-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rollNo: targetRoll,
          studentName: targetName,
          createIfNotFound,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not locate student record');
      }

      if (data.student) {
        onSelectStudentWithAi(data.student.id, data.aiBrief);
      }
    } catch (err: any) {
      setError(err.message || 'AI Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-slate-800 relative">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>AI Direct Student Navigator & XAI Profiler</span>
          </div>
          <h2 className="text-sm sm:text-base font-bold text-white">
            Enter Student Roll No & Name for Instant AI Deep-Dive
          </h2>
          {!compact && (
            <p className="text-xs text-slate-300">
              Provide any student's Roll Number and Name — AI will locate (or initialize) their runtime file, compute SHAP/LIME explanations, and open their full details immediately.
            </p>
          )}
        </div>

        <form onSubmit={(e) => handleAiLookup(e)} className="flex-1 max-w-2xl space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            {/* Roll No Input */}
            <div className="sm:col-span-4 relative">
              <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={rollNo}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  setRollNo(e.target.value);
                  setShowSuggestions(true);
                  setError(null);
                }}
                placeholder="Roll No (e.g. STU-CO-2023-0001)"
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            {/* Student Name Input */}
            <div className="sm:col-span-5 relative">
              <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={studentName}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  setStudentName(e.target.value);
                  setShowSuggestions(true);
                  setError(null);
                }}
                placeholder="Student Name (e.g. Alex Rivera)"
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Submit Button */}
            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>AI Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={createIfNotFound}
                onChange={(e) => setCreateIfNotFound(e.target.checked)}
                className="rounded border-slate-600 text-blue-500 focus:ring-blue-500 bg-slate-800"
              />
              <span>Auto-create runtime student profile if Roll No / Name is new</span>
            </label>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400">Quick Try:</span>
              <button
                type="button"
                onClick={() => {
                  setRollNo('STU-CO-2023-0001');
                  setStudentName('Alex Rivera');
                  handleAiLookup(undefined, {
                    studentId: 'STU-CO-2023-0001',
                    studentName: 'Alex Rivera',
                  } as Student);
                }}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 font-mono text-[10px]"
              >
                STU-CO-2023-0001 (Alex Rivera)
              </button>
              <button
                type="button"
                onClick={() => {
                  setRollNo('STU-DA-2023-0002');
                  setStudentName('Maya Patel');
                  handleAiLookup(undefined, {
                    studentId: 'STU-DA-2023-0002',
                    studentName: 'Maya Patel',
                  } as Student);
                }}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-mono text-[10px]"
              >
                STU-DA-2023-0002 (Maya Patel)
              </button>
            </div>
          </div>

          {error && (
            <div className="text-xs text-rose-300 bg-rose-950/60 border border-rose-800 rounded-lg px-3 py-1.5 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Live Autocomplete Dropdown */}
          {showSuggestions && matchingSuggestions.length > 0 && (
            <div className="absolute left-4 right-4 sm:left-auto sm:w-96 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-40 divide-y divide-slate-800 overflow-hidden">
              <div className="px-3 py-1.5 bg-slate-800/70 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Matching Cohort Records</span>
                <button
                  type="button"
                  onClick={() => setShowSuggestions(false)}
                  className="text-slate-400 hover:text-white"
                >
                  Close
                </button>
              </div>
              {matchingSuggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setRollNo(s.studentId);
                    setStudentName(s.studentName);
                    setShowSuggestions(false);
                    handleAiLookup(undefined, s);
                  }}
                  className="w-full px-3 py-2 text-left text-xs hover:bg-slate-800 flex items-center justify-between transition-colors"
                >
                  <div>
                    <div className="font-bold text-white">{s.studentName}</div>
                    <div className="text-[10px] text-blue-400 font-mono">{s.studentId} • {s.department}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-400">{s.latestPredictedScore?.toFixed(1)} pts</span>
                    <div className="text-[10px] text-slate-400">{s.currentRiskLevel}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
