import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Sparkles, 
  Plus, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  Mail,
  Building,
  GraduationCap
} from 'lucide-react';
import { Student, PredictionResult, Intervention } from '../types/index';
import { RiskBadge } from '../components/RiskBadge';
import { ShapWaterfallChart } from '../components/ShapWaterfallChart';
import { LimeFeatureBarChart } from '../components/LimeFeatureBarChart';

interface StudentDetailsProps {
  studentId: string;
  onBack: () => void;
  currentUserRole?: string;
  currentUserName?: string;
}

export const StudentDetails: React.FC<StudentDetailsProps> = ({
  studentId,
  onBack,
  currentUserRole = 'faculty',
  currentUserName = 'Prof. Sarah Jenkins',
}) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'shap' | 'lime' | 'interventions'>('overview');

  // Intervention modal
  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [interventionType, setInterventionType] = useState('Academic Counseling');
  const [interventionNotes, setInterventionNotes] = useState('');
  const [submittingIntervention, setSubmittingIntervention] = useState(false);

  useEffect(() => {
    fetchStudentDetail();
  }, [studentId]);

  const fetchStudentDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${studentId}`);
      if (res.ok) {
        const data = await res.json();
        setStudent(data.student);
        if (data.predictions && data.predictions.length > 0) {
          setPrediction(data.predictions[0]);
        } else if (data.student) {
          // Trigger immediate prediction
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
          }
        }
      }
    } catch (err) {
      console.error('Failed to load student details:', err);
    } finally {
      setLoading(false);
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
        setInterventions(prev => [data.intervention, ...prev]);
        setShowInterventionModal(false);
        setInterventionNotes('');
      }
    } catch (err) {
      console.error('Failed to save intervention:', err);
    } finally {
      setSubmittingIntervention(false);
    }
  };

  if (loading || !student) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        Loading student file...
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInterventionModal(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Advisory Intervention</span>
          </button>
        </div>
      </div>

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
                <span className="font-mono text-slate-700 font-semibold">{student.studentId}</span>
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

          {/* Action Recommendations */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Suggested Growth Plan</h3>
            <div className="space-y-3">
              {(prediction?.recommendations || []).length > 0 ? (
                (prediction?.recommendations || []).map((r) => (
                  <div key={r.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{r.recommendationArea}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 uppercase">
                        {r.priority} Priority
                      </span>
                    </div>
                    <p className="text-slate-700">{r.actionText}</p>
                    <p className="text-[11px] text-slate-400 italic">Trigger: {r.reason}</p>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-slate-400 bg-white rounded-xl border border-slate-200 text-xs">
                  No critical intervention required.
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
            <button
              onClick={() => setShowInterventionModal(true)}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Record</span>
            </button>
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
                    <span className="text-slate-400 text-[11px]">
                      {new Date(intv.createdAt).toLocaleDateString()}
                    </span>
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
