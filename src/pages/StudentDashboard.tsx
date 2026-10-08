import React, { useState, useEffect } from 'react';
import { 
  User, 
  Student, 
  PredictionResult, 
  Recommendation,
  RiskLevel 
} from '../types/index';
import { RiskBadge } from '../components/RiskBadge';
import { ShapWaterfallChart } from '../components/ShapWaterfallChart';
import { LimeFeatureBarChart } from '../components/LimeFeatureBarChart';
import { 
  TrendingUp, 
  TrendingDown, 
  CheckSquare, 
  Square, 
  Sparkles, 
  Clock, 
  Award, 
  AlertCircle, 
  BookOpen, 
  Calendar,
  Layers,
  ChevronRight,
  ShieldAlert,
  Trash2
} from 'lucide-react';

interface StudentDashboardProps {
  user: User;
  onOpenPrivacy: () => void;
  onNavigateToSimulator: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  user,
  onOpenPrivacy,
  onNavigateToSimulator,
}) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeExplainTab, setActiveExplainTab] = useState<'SHAP' | 'LIME'>('SHAP');

  useEffect(() => {
    fetchStudentData();
  }, [user]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      // Fetch student profile matching user's studentId or email
      const targetId = user.studentId || user.email;
      const res = await fetch(`/api/students/${targetId}`);
      if (res.ok) {
        const data = await res.json();
        setStudent(data.student);
        if (data.predictions && data.predictions.length > 0) {
          const latest = data.predictions[0];
          setPrediction(latest);
          setRecommendations(latest.recommendations || []);
        } else {
          // If no prediction yet, trigger prediction API
          generateInitialPrediction(data.student);
        }
      } else {
        // Fallback to first student for demo
        const listRes = await fetch('/api/students?limit=1');
        const listData = await listRes.json();
        if (listData.students && listData.students.length > 0) {
          const fallback = listData.students[0];
          setStudent(fallback);
          generateInitialPrediction(fallback);
        }
      }
    } catch (err) {
      console.error('Failed to load student data:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateInitialPrediction = async (studentData: Student) => {
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData),
      });
      if (res.ok) {
        const pred = await res.json();
        setPrediction(pred);
        setRecommendations(pred.recommendations || []);
      }
    } catch (e) {
      console.error('Prediction call failed:', e);
    }
  };

  const toggleRecommendation = async (recId: string) => {
    setRecommendations(prev =>
      prev.map(r => r.id === recId ? { ...r, completed: !r.completed } : r)
    );

    if (student) {
      try {
        await fetch(`/api/recommendations/${student.id}/${recId}/toggle`, { method: 'PUT' });
      } catch (err) {
        console.error('Toggle error:', err);
      }
    }
  };

  const deleteRecommendation = async (e: React.MouseEvent, recId: string) => {
    e.stopPropagation();
    setRecommendations(prev => prev.filter(r => r.id !== recId));
    if (student) {
      try {
        await fetch(`/api/recommendations/${encodeURIComponent(student.id)}/${encodeURIComponent(recId)}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.error('Delete rec error:', err);
      }
    }
  };

  if (loading || !student) {
    return (
      <div className="p-8 text-center text-slate-500">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs font-semibold">Loading your personal academic performance data...</p>
      </div>
    );
  }

  const score = prediction ? prediction.predictedScore : student.latestPredictedScore || 70;
  const riskLevel = prediction ? prediction.riskLevel : student.currentRiskLevel;

  // Extract top strengths and weaknesses from SHAP attributions
  const shapFeatures = prediction?.explanations?.shapFeatures || [];
  const strengths = shapFeatures.filter(f => f.direction === 'Positive').slice(0, 3);
  const weaknesses = shapFeatures.filter(f => f.direction === 'Negative').slice(0, 3);

  const completedRecs = (recommendations || []).filter(r => r.completed).length;
  const progressPct = (recommendations || []).length > 0 ? Math.round((completedRecs / (recommendations.length || 1)) * 100) : 0;

  return (
    <div id="student-dashboard" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Welcome, {student.studentName}</h1>
            <span className="text-xs text-slate-500 font-mono">({student.studentId})</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Department of {student.department} • Academic Year {student.academicYear}, Semester {student.semester}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToSimulator}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulate Grade What-Ifs</span>
          </button>
        </div>
      </div>

      {/* Top 4 Performance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Predicted Score Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Projected Final Score</span>
            <RiskBadge level={riskLevel} size="sm" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-slate-900">{score.toFixed(1)}</span>
            <span className="text-xs text-slate-400 font-medium">/ 100 max</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Model: {prediction?.selectedModelName || 'Ensemble Model'}
          </p>
        </div>

        {/* Attendance Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Lecture Attendance</span>
            <span className={`text-xs font-bold ${student.attendancePercentage >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {student.attendancePercentage}%
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
            <div 
              className={`h-full rounded-full ${student.attendancePercentage >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`}
              style={{ width: `${student.attendancePercentage}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Institutional minimum target: 75%
          </p>
        </div>

        {/* Assignment Performance */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Coursework & Assignments</span>
            <span className="text-xs font-bold text-slate-900">{student.assignmentPerformance}/100</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${student.assignmentPerformance}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Late submissions recorded: <strong className={student.lateSubmissions > 0 ? 'text-amber-700' : 'text-emerald-700'}>{student.lateSubmissions}</strong>
          </p>
        </div>

        {/* Study Hours */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Weekly Study Time</span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-slate-900">{student.studyHoursPerWeek}</span>
            <span className="text-xs text-slate-500">hrs/week</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Prior Cumulative GPA: <strong>{student.previousGpa} / 10.0</strong>
          </p>
        </div>
      </div>

      {/* Strengths & Weaknesses Deconstruction */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strengths */}
        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-bold text-emerald-950">Key Academic Strengths (Positive Drivers)</h3>
          </div>
          {(strengths || []).length > 0 ? (
            <div className="space-y-2">
              {(strengths || []).map((s, idx) => (
                <div key={idx} className="bg-white p-3 rounded-xl border border-emerald-100 flex items-start justify-between gap-3 text-xs shadow-2xs">
                  <div>
                    <span className="font-semibold text-slate-800">{s.displayName}</span>
                    <p className="text-slate-500 text-[11px] mt-0.5">{s.humanDescription}</p>
                  </div>
                  <span className="font-bold text-emerald-700 whitespace-nowrap">+{s.impactValue.toFixed(1)} pts</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">All features are currently performing near cohort baseline.</p>
          )}
        </div>

        {/* Weaknesses / Growth Areas */}
        <div className="bg-rose-50/60 border border-rose-200/80 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-rose-700" />
            <h3 className="text-sm font-bold text-rose-950">Areas Requiring Focus (Score Reductions)</h3>
          </div>
          {(weaknesses || []).length > 0 ? (
            <div className="space-y-2">
              {(weaknesses || []).map((w, idx) => (
                <div key={idx} className="bg-white p-3 rounded-xl border border-rose-100 flex items-start justify-between gap-3 text-xs shadow-2xs">
                  <div>
                    <span className="font-semibold text-slate-800">{w.displayName}</span>
                    <p className="text-slate-500 text-[11px] mt-0.5">{w.humanDescription}</p>
                  </div>
                  <span className="font-bold text-rose-700 whitespace-nowrap">{w.impactValue.toFixed(1)} pts</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">No major negative detractors found. Maintain current momentum!</p>
          )}
        </div>
      </div>

      {/* Explainable AI Visualizer Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Explainable AI Interpretability</h2>
            <p className="text-xs text-slate-500">Explore transparent machine learning factors affecting your projection</p>
          </div>
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setActiveExplainTab('SHAP')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeExplainTab === 'SHAP'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              SHAP Waterfall Attribution
            </button>
            <button
              onClick={() => setActiveExplainTab('LIME')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeExplainTab === 'LIME'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              LIME Local Sensitivity
            </button>
          </div>
        </div>

        {activeExplainTab === 'SHAP' ? (
          <ShapWaterfallChart
            baseValue={prediction?.explanations?.shapBaseValue || 68.5}
            predictedScore={score}
            features={shapFeatures}
            maxFeatures={7}
          />
        ) : (
          <LimeFeatureBarChart
            intercept={prediction?.explanations?.limeIntercept || score}
            features={prediction?.explanations?.limeFeatures || []}
            maxFeatures={7}
          />
        )}
      </div>

      {/* Personalized Recommendations & Action Plan */}
      <div id="recommendations-section" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Personalized Academic Action Plan</h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                {completedRecs} of {(recommendations || []).length} Completed
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Practical, respectful, and non-punitive steps recommended based on your statistical indicators.
            </p>
          </div>

          <div className="w-full sm:w-48 bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="space-y-3">
          {(recommendations || []).map((rec) => {
            const priorityBadge = {
              High: 'bg-rose-50 text-rose-700 border-rose-200',
              Medium: 'bg-amber-50 text-amber-700 border-amber-200',
              Low: 'bg-blue-50 text-blue-700 border-blue-200',
            }[rec.priority];

            return (
              <div 
                key={rec.id}
                onClick={() => toggleRecommendation(rec.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                  rec.completed 
                    ? 'bg-slate-50/70 border-slate-200 opacity-75' 
                    : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-2xs'
                }`}
              >
                <button
                  type="button"
                  className="mt-0.5 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  {rec.completed ? (
                    <CheckSquare className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-300" />
                  )}
                </button>

                <div className="flex-1 text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-900 text-sm">{rec.recommendationArea}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${priorityBadge}`}>
                      {rec.priority} Priority
                    </span>
                  </div>
                  <p className={`text-slate-700 leading-relaxed ${rec.completed ? 'line-through text-slate-400' : ''}`}>
                    {rec.actionText}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 italic">
                    Reason: {rec.reason}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => deleteRecommendation(e, rec.id)}
                  title="Delete Recommendation"
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
