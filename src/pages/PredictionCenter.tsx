import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RotateCcw,
  Sliders,
  Trash2,
  Clock,
} from 'lucide-react';
import { Student, PredictionResult } from '../types/index';
import { RiskBadge } from '../components/RiskBadge';
import { ShapWaterfallChart } from '../components/ShapWaterfallChart';
import { LimeFeatureBarChart } from '../components/LimeFeatureBarChart';

interface PredictionCenterProps {
  initialStudent?: Student | null;
}

export const PredictionCenter: React.FC<PredictionCenterProps> = ({ initialStudent }) => {
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudent ? initialStudent.id : 'manual');

  // Feature states
  const [studentName, setStudentName] = useState('Simulation Candidate');
  const [department, setDepartment] = useState('Computer Science');
  const [attendancePercentage, setAttendancePercentage] = useState(78);
  const [internalMarks, setInternalMarks] = useState(72);
  const [assignmentPerformance, setAssignmentPerformance] = useState(80);
  const [studyHoursPerWeek, setStudyHoursPerWeek] = useState(16);
  const [previousGpa, setPreviousGpa] = useState(7.8);
  const [quizAverage, setQuizAverage] = useState(74);
  const [lateSubmissions, setLateSubmissions] = useState(0);
  const [learningActivityScore, setLearningActivityScore] = useState(76);
  const [lmsParticipation, setLmsParticipation] = useState(82);
  const [previousSemesterScore, setPreviousSemesterScore] = useState(75);

  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [predictionHistory, setPredictionHistory] = useState<PredictionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeXaiTab, setActiveXaiTab] = useState<'SHAP' | 'LIME'>('SHAP');

  useEffect(() => {
    fetchStudents();
    fetchPredictionsHistory();
    if (initialStudent) {
      loadStudentFields(initialStudent);
    } else {
      triggerPredict();
    }
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/students?limit=100');
      if (res.ok) {
        const data = await res.json();
        setStudentsList(data?.students || []);
      }
    } catch (e) {
      console.error('Failed to load students:', e);
    }
  };

  const fetchPredictionsHistory = async () => {
    try {
      const res = await fetch('/api/predictions');
      if (res.ok) {
        const data = await res.json();
        setPredictionHistory(data?.predictions || []);
      }
    } catch (e) {
      console.error('Failed to load predictions:', e);
    }
  };

  const loadStudentFields = (st: Student) => {
    setStudentName(st.studentName);
    setDepartment(st.department);
    setAttendancePercentage(st.attendancePercentage);
    setInternalMarks(st.internalMarks);
    setAssignmentPerformance(st.assignmentPerformance);
    setStudyHoursPerWeek(st.studyHoursPerWeek);
    setPreviousGpa(st.previousGpa);
    setQuizAverage(st.quizAverage);
    setLateSubmissions(st.lateSubmissions);
    setLearningActivityScore(st.learningActivityScore);
    setLmsParticipation(st.lmsParticipation);
    setPreviousSemesterScore(st.previousSemesterScore);
  };

  const handleSelectStudentChange = (id: string) => {
    setSelectedStudentId(id);
    if (id === 'manual') {
      setStudentName('Manual Student Assessment');
    } else {
      const st = studentsList.find(s => s.id === id);
      if (st) {
        loadStudentFields(st);
      }
    }
  };

  const triggerPredict = async () => {
    setLoading(true);
    try {
      const payload = {
        studentId: selectedStudentId === 'manual' ? 'SIM-001' : selectedStudentId,
        studentName,
        department,
        academicYear: 3,
        semester: 5,
        attendancePercentage,
        internalMarks,
        assignmentPerformance,
        studyHoursPerWeek,
        previousGpa,
        quizAverage,
        lateSubmissions,
        learningActivityScore,
        lmsParticipation,
        previousSemesterScore,
      };

      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setPrediction(data);
        setPredictionHistory(prev => [data, ...prev.filter(p => p.id !== data.id)]);
      }
    } catch (err) {
      console.error('Prediction failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePredictionRecord = async (predId: string) => {
    try {
      const res = await fetch(`/api/predictions/${encodeURIComponent(predId)}`, { method: 'DELETE' });
      if (res.ok) {
        setPredictionHistory(prev => prev.filter(p => p.id !== predId));
      }
    } catch (err) {
      console.error('Delete prediction failed:', err);
    }
  };

  const handleClearAllPredictions = async () => {
    try {
      const res = await fetch('/api/predictions', { method: 'DELETE' });
      if (res.ok) {
        setPredictionHistory([]);
      }
    } catch (err) {
      console.error('Clear predictions failed:', err);
    }
  };

  const resetToAverage = () => {
    setAttendancePercentage(75);
    setInternalMarks(70);
    setAssignmentPerformance(75);
    setStudyHoursPerWeek(15);
    setPreviousGpa(7.5);
    setQuizAverage(72);
    setLateSubmissions(0);
    setLearningActivityScore(75);
    setLmsParticipation(78);
    setPreviousSemesterScore(72);
  };

  return (
    <div id="prediction-center" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Prediction Center & What-If Simulator</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Test real-time student vectors, simulate sensitivity scenarios, and inspect dual SHAP/LIME attributions
          </p>
        </div>

        {/* Student Preset Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Preset:</span>
          <select
            value={selectedStudentId}
            onChange={(e) => handleSelectStudentChange(e.target.value)}
            className="py-1.5 px-3 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="manual">Custom / Manual Input</option>
            {(studentsList || []).map(s => (
              <option key={s.id} value={s.id}>
                {s.studentName} ({s.studentId} • {s.department})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Feature Sliders (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              <span>Academic Feature Inputs</span>
            </h2>
            <button
              type="button"
              onClick={resetToAverage}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* Candidate Name */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Candidate / Student Name</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            {/* Attendance */}
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Lecture Attendance:</span>
                <span className={attendancePercentage < 75 ? 'text-rose-600 font-bold' : 'text-slate-900'}>
                  {attendancePercentage}%
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="100"
                value={attendancePercentage}
                onChange={(e) => setAttendancePercentage(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>30%</span>
                <span className="text-amber-600 font-semibold">75% (Target)</span>
                <span>100%</span>
              </div>
            </div>

            {/* Internal Marks */}
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Internal Assessment Marks:</span>
                <span className="text-slate-900 font-bold">{internalMarks}/100</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={internalMarks}
                onChange={(e) => setInternalMarks(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Coursework / Assignments */}
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Assignment Performance:</span>
                <span className="text-slate-900 font-bold">{assignmentPerformance}/100</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={assignmentPerformance}
                onChange={(e) => setAssignmentPerformance(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Study Hours */}
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Weekly Self-Study Time:</span>
                <span className="text-slate-900 font-bold">{studyHoursPerWeek} hrs/week</span>
              </div>
              <input
                type="range"
                min="2"
                max="45"
                value={studyHoursPerWeek}
                onChange={(e) => setStudyHoursPerWeek(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Previous GPA */}
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Prior Cumulative GPA:</span>
                <span className="text-slate-900 font-bold">{previousGpa.toFixed(1)} / 10.0</span>
              </div>
              <input
                type="range"
                min="4.0"
                max="10.0"
                step="0.1"
                value={previousGpa}
                onChange={(e) => setPreviousGpa(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Quiz Average */}
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Quiz & Milestone Average:</span>
                <span className="text-slate-900 font-bold">{quizAverage}/100</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={quizAverage}
                onChange={(e) => setQuizAverage(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* LMS Participation */}
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>LMS Activity & Engagement:</span>
                <span className="text-slate-900 font-bold">{lmsParticipation}/100</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={lmsParticipation}
                onChange={(e) => setLmsParticipation(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Late submissions count */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="font-semibold text-slate-700">Late Submissions:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLateSubmissions(Math.max(0, lateSubmissions - 1))}
                  className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center font-bold"
                >
                  -
                </button>
                <span className="font-bold text-slate-900 w-4 text-center">{lateSubmissions}</span>
                <button
                  type="button"
                  onClick={() => setLateSubmissions(lateSubmissions + 1)}
                  className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center font-bold"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={triggerPredict}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-70 cursor-pointer"
          >
            {loading ? (
              <span>Running ML & Explanations...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Compute Real-Time Prediction & XAI</span>
              </>
            )}
          </button>
        </div>

        {/* Right Output: Score & Explanations (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Prediction Metric Header */}
          {prediction && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Evaluation Result:</span>
                    <span className="text-xs font-bold text-slate-900">{prediction.studentName}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Engine: <strong className="text-slate-700">{prediction.selectedModelName}</strong> ({prediction.modelVersion})
                  </div>
                </div>

                <RiskBadge level={prediction.riskLevel} size="md" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-500">Predicted Final Score</span>
                  <div className="text-3xl font-black text-slate-900 mt-1">
                    {prediction.predictedScore.toFixed(1)}
                  </div>
                  <span className="text-[10px] text-slate-400">Scale of 0 - 100</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-500">Academic Risk Tier</span>
                  <div className={`text-xl font-bold mt-1.5 ${
                    prediction.riskLevel === 'High Risk' ? 'text-rose-600' :
                    prediction.riskLevel === 'Medium Risk' ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {prediction.riskLevel}
                  </div>
                  <span className="text-[10px] text-slate-400">Automated classification</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-500">Risk Probability</span>
                  <div className="text-3xl font-black text-slate-900 mt-1">
                    {Math.round(prediction.riskProbability * 100)}%
                  </div>
                  <span className="text-[10px] text-slate-400">Probability of failing score</span>
                </div>
              </div>
            </div>
          )}

          {/* Explainable AI Visualizer */}
          {prediction && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Explainable AI Interpretations</h3>
                  <p className="text-xs text-slate-500">Verify additive SHAP attributions and local LIME surrogates</p>
                </div>

                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                  <button
                    onClick={() => setActiveXaiTab('SHAP')}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                      activeXaiTab === 'SHAP'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    SHAP Waterfall
                  </button>
                  <button
                    onClick={() => setActiveXaiTab('LIME')}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                      activeXaiTab === 'LIME'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    LIME Surrogate
                  </button>
                </div>
              </div>

              {activeXaiTab === 'SHAP' ? (
                <ShapWaterfallChart
                  baseValue={prediction.explanations.shapBaseValue || 68.5}
                  predictedScore={prediction.predictedScore}
                  features={prediction.explanations.shapFeatures || []}
                  maxFeatures={8}
                />
              ) : (
                <LimeFeatureBarChart
                  intercept={prediction.explanations.limeIntercept || prediction.predictedScore}
                  features={prediction.explanations.limeFeatures || []}
                  maxFeatures={7}
                />
              )}
            </div>
          )}

          {/* Stored Predictions History with Delete Options */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Stored Prediction History ({predictionHistory.length})
                </h3>
              </div>
              {predictionHistory.length > 0 && (
                <button
                  onClick={handleClearAllPredictions}
                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear All Predictions</span>
                </button>
              )}
            </div>

            {(predictionHistory || []).length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No stored predictions in history. Run a simulation above to store a record.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {(predictionHistory || []).map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{p.studentName} <span className="font-mono text-[10px] text-slate-500">({p.studentId})</span></div>
                      <div className="text-[10px] text-slate-500">
                        {p.selectedModelName} • {new Date(p.predictionTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900">{p.predictedScore.toFixed(1)} pts</span>
                      <RiskBadge level={p.riskLevel} size="sm" />
                      <button
                        onClick={() => handleDeletePredictionRecord(p.id)}
                        title="Delete Prediction Record"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
