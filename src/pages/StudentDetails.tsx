import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Building,
  Trash2,
  RefreshCw,
  Cpu,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Student, PredictionResult, Intervention, AiStudentBrief } from '../types/index';
import { RiskBadge } from '../components/RiskBadge';
import { ShapWaterfallChart } from '../components/ShapWaterfallChart';
import { LimeFeatureBarChart } from '../components/LimeFeatureBarChart';
import { AiStudentLookup } from '../components/AiStudentLookup';

interface StudentDetailsProps {
  studentId: string;
  initialAiBrief?: AiStudentBrief | null;
  onBack: () => void;
  onSelectAnotherStudent?: (studentId: string, aiBrief?: AiStudentBrief) => void;
  currentUserRole?: string;
  currentUserName?: string;
}

export const StudentDetails: React.FC<StudentDetailsProps> = ({
  studentId,
  initialAiBrief = null,
  onBack,
  onSelectAnotherStudent,
  currentUserRole = 'faculty',
  currentUserName = 'Prof. Sarah Jenkins',
}) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [aiBrief, setAiBrief] = useState<AiStudentBrief | null>(initialAiBrief);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'shap' | 'lime' | 'interventions'>('overview');

  // Intervention modal
  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [interventionType, setInterventionType] = useState('Academic Counseling');
  const [interventionNotes, setInterventionNotes] = useState('');
  const [submittingIntervention, setSubmittingIntervention] = useState(false);

  useEffect(() => {
    setAiBrief(initialAiBrief || null);
    fetchStudentDetail(initialAiBrief);
  }, [studentId, initialAiBrief]);

  const fetchStudentDetail = async (passedBrief?: AiStudentBrief | null) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${encodeURIComponent(studentId)}`);
      if (res.ok) {
        const data = await res.json();
        setStudent(data.student);
        if (data.predictions && data.predictions.length > 0) {
          setPrediction(data.predictions[0]);
        } else if (data.student) {
          const predRes = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data.student),
          });
          if (predRes.ok) {
            const predData = await predRes.json();
            setPrediction(predData);
          }
        }
        setInterventions(data.interventions || []);
        if (!passedBrief && data.student) {
          fetchAiBriefForStudent(data.student.studentId, data.student.studentName);
        }
      } else {
        // Fallback: load first available student if ID not found
        const fallbackRes = await fetch('/api/students?limit=1');
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          const first = (fallbackData.students || [])[0];
          if (first) {
            setStudent(first);
            const predRes = await fetch('/api/predict', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(first),
            });
            if (predRes.ok) {
              const predData = await predRes.json();
              setPrediction(predData);
            }
            fetchAiBriefForStudent(first.studentId, first.studentName);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load student details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAiBriefForStudent = async (rollNo: string, name: string) => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/student-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rollNo, studentName: name, createIfNotFound: false }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.aiBrief) {
          setAiBrief(data.aiBrief);
        }
      }
    } catch (e) {
      console.error('AI brief generation error:', e);
    } finally {
      setAiLoading(false);
    }
  };

  const handleDeleteCurrentStudent = async () => {
    if (!student) return;
    try {
      const res = await fetch(`/api/students/${encodeURIComponent(student.id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onBack();
      }
    } catch (err) {
      console.error('Failed to delete student:', err);
    }
  };

  const handleAddIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    setSubmittingIntervention(true);
    try {
      const res = await fetch('/api/interventions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          studentName: student.studentName,
          department: student.department,
          facultyName: currentUserName,
          interventionType,
          notes: interventionNotes,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const created = data.intervention || data;
        setInterventions(prev => [created, ...prev]);
        setShowInterventionModal(false);
        setInterventionNotes('');
      }
    } catch (err) {
      console.error('Failed to save intervention:', err);
    } finally {
      setSubmittingIntervention(false);
    }
  };

  const handleDeleteIntervention = async (interventionId: string) => {
    try {
      const res = await fetch(`/api/interventions/${interventionId}`, { method: 'DELETE' });
      if (res.ok) {
        setInterventions(prev => prev.filter(i => i.id !== interventionId));
      }
    } catch (err) {
      console.error('Failed to delete intervention:', err);
    }
  };

  const handleClearStudentInterventions = async () => {
    if (!student) return;
    try {
      const res = await fetch(`/api/interventions?studentId=${encodeURIComponent(student.id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setInterventions([]);
      }
    } catch (err) {
      console.error('Failed to clear interventions:', err);
    }
  };

  const handleDeleteRecommendation = async (recId: string) => {
    if (!student) return;
    try {
      await fetch(`/api/recommendations/${encodeURIComponent(student.id)}/${encodeURIComponent(recId)}`, {
        method: 'DELETE',
      });
      if (prediction) {
        setPrediction({
          ...prediction,
          recommendations: (prediction.recommendations || []).filter(r => r.id !== recId),
        });
      }
    } catch (err) {
      console.error('Failed to delete recommendation:', err);
    }
  };

  if (loading || !student) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        Loading student file & AI analysis...
      </div>
    );
  }

  const score = prediction ? prediction.predictedScore : student.latestPredictedScore || 70;
  const risk = prediction ? prediction.riskLevel : student.currentRiskLevel;

  return (
    <div id="student-details-page" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Cohort Directory</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fetchAiBriefForStudent(student.studentId, student.studentName)}
            disabled={aiLoading}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-60"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{aiLoading ? 'Generating AI Brief...' : 'Regenerate AI Profile'}</span>
          </button>

          <button
            onClick={() => setShowInterventionModal(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Advisory Intervention</span>
          </button>

          <button
            onClick={handleDeleteCurrentStudent}
            className="px-3 py-2 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Delete this student record from stored data"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Student Record</span>
          </button>
        </div>
      </div>

      {/* Direct Roll No & Name AI Jump Bar */}
      {onSelectAnotherStudent && (
        <AiStudentLookup
          onSelectStudentWithAi={onSelectAnotherStudent}
          compact={true}
        />
      )}

      {/* Student Profile Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl">
              {student.studentName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900">{student.studentName}</h1>
                <RiskBadge level={risk} size="sm" />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1">
                <span className="font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold">
                  Roll No: {student.studentId}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {student.email}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5" /> {student.department}</span>
                <span>•</span>
                <span>Year {student.academicYear}, Semester {student.semester}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <span className="text-[11px] text-slate-500 font-medium block">Projected Score</span>
              <span className="text-2xl font-black text-slate-900">{score.toFixed(1)}</span>
              <span className="text-xs text-slate-400"> / 100</span>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium block">Risk Probability</span>
              <span className={`text-2xl font-black ${prediction && prediction.riskProbability > 0.5 ? 'text-rose-600' : 'text-slate-900'}`}>
                {prediction ? `${Math.round(prediction.riskProbability * 100)}%` : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-6 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500 text-[11px]">Attendance</span>
            <div className="text-base font-bold text-slate-900 mt-1">{student.attendancePercentage}%</div>
            <span className={student.attendancePercentage >= 75 ? 'text-[10px] text-emerald-600' : 'text-[10px] text-rose-600 font-semibold'}>
              {student.attendancePercentage >= 75 ? 'Meets threshold' : 'Below 75% min'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500 text-[11px]">Internal Marks</span>
            <div className="text-base font-bold text-slate-900 mt-1">{student.internalMarks}/100</div>
            <span className="text-[10px] text-slate-400">Midterm exams</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500 text-[11px]">Assignments</span>
            <div className="text-base font-bold text-slate-900 mt-1">{student.assignmentPerformance}/100</div>
            <span className="text-[10px] text-slate-400">{student.lateSubmissions} late subs</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500 text-[11px]">Study Hours</span>
            <div className="text-base font-bold text-slate-900 mt-1">{student.studyHoursPerWeek} hrs/wk</div>
            <span className="text-[10px] text-slate-400">Self study</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500 text-[11px]">Cumulative GPA</span>
            <div className="text-base font-bold text-slate-900 mt-1">{student.previousGpa} / 10.0</div>
            <span className="text-[10px] text-slate-400">Prior record</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500 text-[11px]">LMS Activity</span>
            <div className="text-base font-bold text-slate-900 mt-1">{student.lmsParticipation}/100</div>
            <span className="text-[10px] text-slate-400">Portal log score</span>
          </div>
        </div>
      </div>

      {/* AI Student Intelligence Brief Card */}
      {aiBrief && (
        <div className="bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/60 border border-blue-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-blue-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  AI Student Diagnostic & Explainability Report — {student.studentName} ({student.studentId})
                </h2>
                <p className="text-[11px] text-slate-500">
                  Generated by {aiBrief.generatedBy}
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-800 leading-relaxed font-medium bg-white/90 p-3.5 rounded-xl border border-blue-100">
            {aiBrief.executiveSummary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-white p-4 rounded-xl border border-emerald-200/80 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Positive Performance Drivers</span>
              </div>
              <ul className="space-y-1.5 text-slate-700 list-disc list-inside">
                {(aiBrief.academicStrengths || []).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="bg-white p-4 rounded-xl border border-rose-200/80 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-rose-800">
                <TrendingDown className="w-4 h-4 text-rose-600" />
                <span>Identified Risk Factors & Detractors</span>
              </div>
              <ul className="space-y-1.5 text-slate-700 list-disc list-inside">
                {(aiBrief.riskFactors || []).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-blue-950 text-white space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 block">
                AI Advisor Action Plan
              </span>
              <p className="text-slate-100 leading-relaxed">{aiBrief.aiAdvisorRecommendation}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">
                SHAP & LIME Mathematical Verdict
              </span>
              <p className="text-slate-200 leading-relaxed">{aiBrief.explainabilityVerdict}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Performance & Factors
        </button>
        <button
          onClick={() => setActiveTab('shap')}
          className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'shap'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          SHAP Waterfall Interpretations
        </button>
        <button
          onClick={() => setActiveTab('lime')}
          className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'lime'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          LIME Local Surrogate
        </button>
        <button
          onClick={() => setActiveTab('interventions')}
          className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'interventions'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Advisory Interventions ({interventions.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SHAP summary */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Key Model Drivers</h3>
            <ShapWaterfallChart
              baseValue={prediction?.explanations?.shapBaseValue || 68.5}
              predictedScore={score}
              features={prediction?.explanations?.shapFeatures || []}
              maxFeatures={5}
            />
          </div>

          {/* Action Recommendations with Delete Option */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Suggested Growth Plan</h3>
            <div className="space-y-3">
              {(prediction?.recommendations || []).length > 0 ? (
                (prediction?.recommendations || []).map((r) => (
                  <div key={r.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs text-xs space-y-1 flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{r.recommendationArea}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 uppercase">
                          {r.priority} Priority
                        </span>
                      </div>
                      <p className="text-slate-700">{r.actionText}</p>
                      <p className="text-[11px] text-slate-400 italic">Trigger: {r.reason}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteRecommendation(r.id)}
                      title="Delete Recommendation"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-slate-400 bg-white rounded-xl border border-slate-200 text-xs">
                  No active recommendations stored for this student.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'shap' && (
        <ShapWaterfallChart
          baseValue={prediction?.explanations?.shapBaseValue || 68.5}
          predictedScore={score}
          features={prediction?.explanations?.shapFeatures || []}
          maxFeatures={12}
        />
      )}

      {activeTab === 'lime' && (
        <LimeFeatureBarChart
          intercept={prediction?.explanations?.limeIntercept || score}
          features={prediction?.explanations?.limeFeatures || []}
          maxFeatures={10}
        />
      )}

      {activeTab === 'interventions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Faculty Intervention Record</h3>
            <div className="flex items-center gap-2">
              {interventions.length > 0 && (
                <button
                  onClick={handleClearStudentInterventions}
                  className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete All Interventions</span>
                </button>
              )}
              <button
                onClick={() => setShowInterventionModal(true)}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Record</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {(interventions || []).length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
                No formal interventions logged yet for this student.
              </div>
            ) : (
              (interventions || []).map((intv) => (
                <div key={intv.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{intv.interventionType}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        {intv.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px]">
                        {new Date(intv.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => handleDeleteIntervention(intv.id)}
                        title="Delete Intervention"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {intv.notes}
                  </p>
                  <div className="text-[11px] text-slate-400">
                    Advisor: <strong className="text-slate-700">{intv.facultyName}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Intervention Modal */}
      {showInterventionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Log Faculty Academic Intervention</h3>
            <p className="text-xs text-slate-500 mb-4">
              Record mentoring notes and follow-up directives for {student.studentName}.
            </p>

            <form onSubmit={handleAddIntervention} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Intervention Category</label>
                <select
                  value={interventionType}
                  onChange={(e) => setInterventionType(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white text-xs"
                >
                  <option value="Academic Counseling">Academic Counseling & Advisory</option>
                  <option value="Attendance Recovery Plan">Attendance Recovery Contract</option>
                  <option value="Peer Tutoring Assignment">Peer Tutoring Assignment</option>
                  <option value="Assignment Extension & Support">Assignment Extension & Support</option>
                  <option value="Wellness / Student Support Referral">Wellness / Student Support Referral</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Advisor Notes & Plan</label>
                <textarea
                  required
                  rows={4}
                  value={interventionNotes}
                  onChange={(e) => setInterventionNotes(e.target.value)}
                  placeholder="Summarize discussion, agreed action items, and next check-in milestone..."
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInterventionModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingIntervention}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold disabled:opacity-70"
                >
                  {submittingIntervention ? 'Saving...' : 'Save Intervention'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
