import React, { useState, useEffect } from 'react';
import { 
  Users, 
  AlertTriangle, 
  GraduationCap, 
  Activity, 
  ArrowRight, 
  Search, 
  Filter, 
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Clock,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { Student, DashboardSummary, Intervention } from '../types/index';
import { RiskBadge } from '../components/RiskBadge';

interface FacultyDashboardProps {
  onSelectStudent: (studentId: string) => void;
  onNavigateToDirectory: () => void;
  onNavigateToPredictor: () => void;
  onNavigateToReports: () => void;
}

export const FacultyDashboard: React.FC<FacultyDashboardProps> = ({
  onSelectStudent,
  onNavigateToDirectory,
  onNavigateToPredictor,
  onNavigateToReports,
}) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [watchlist, setWatchlist] = useState<Student[]>([]);
  const [recentInterventions, setRecentInterventions] = useState<Intervention[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [sumRes, studentsRes, interRes] = await Promise.all([
        fetch('/api/dashboard/summary'),
        fetch('/api/students?limit=100'),
        fetch('/api/interventions'),
      ]);

      if (sumRes.ok) {
        const sumData = await sumRes.json();
        setSummary(sumData);
      }

      if (studentsRes.ok) {
        const studData = await studentsRes.json();
        // High risk watchlist
        const studentsList = studData?.students || [];
        const highRisk = studentsList.filter((s: Student) => s.currentRiskLevel === 'High Risk');
        setWatchlist(highRisk.slice(0, 8));
      }

      if (interRes.ok) {
        const interData = await interRes.json();
        const interList = interData?.interventions || [];
        setRecentInterventions(interList.slice(0, 5));
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredWatchlist = watchlist.filter(s =>
    s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="faculty-dashboard" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Faculty Analytics & Cohort Monitoring</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time machine learning academic predictions and early warning risk indicators
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToPredictor}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>New Prediction & XAI</span>
          </button>
          <button
            onClick={onNavigateToReports}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            Generate Reports
          </button>
        </div>
      </div>

      {/* Top 4 Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Cohort Size</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {summary ? summary.totalStudents : '...'}
            </span>
            <span className="text-xs text-slate-400 font-medium">enrolled</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Across 6 academic engineering disciplines
          </p>
        </div>

        {/* Avg Predicted Score */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Cohort Avg Predicted Score</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {summary ? summary.averagePredictedScore : '...'}
            </span>
            <span className="text-xs text-slate-400 font-medium">/ 100 max</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-2 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Normal bell-curve distribution
          </p>
        </div>

        {/* High Risk Count */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">High Risk Watchlist</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-600">
              {summary ? summary.highRiskCount : '...'}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              ({summary ? Math.round((summary.highRiskCount / summary.totalStudents) * 100) : 0}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Requires immediate advisor outreach
          </p>
        </div>

        {/* Average Attendance */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Cohort Attendance</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {summary ? summary.averageAttendance : '...'}%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Target threshold: 75% minimum
          </p>
        </div>
      </div>

      {/* Cohort Risk Distribution & Department Benchmarks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution Breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">Cohort Risk Distribution</h2>
              <span className="text-xs text-slate-400">Current Semester</span>
            </div>

            {summary && (
              <div className="space-y-4">
                {/* Low Risk */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-emerald-800">Low Risk (&ge;70 pts)</span>
                    <span className="font-bold text-slate-900">
                      {summary.lowRiskCount} ({Math.round((summary.lowRiskCount / summary.totalStudents) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${(summary.lowRiskCount / summary.totalStudents) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Medium Risk */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-amber-800">Medium Risk (50-69 pts)</span>
                    <span className="font-bold text-slate-900">
                      {summary.mediumRiskCount} ({Math.round((summary.mediumRiskCount / summary.totalStudents) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full"
                      style={{ width: `${(summary.mediumRiskCount / summary.totalStudents) * 100}%` }}
                    />
                  </div>
                </div>

                {/* High Risk */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-rose-800">High Risk (&lt;50 pts)</span>
                    <span className="font-bold text-slate-900">
                      {summary.highRiskCount} ({Math.round((summary.highRiskCount / summary.totalStudents) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full"
                      style={{ width: `${(summary.highRiskCount / summary.totalStudents) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-500">
            Based on active XGBoost/Ensemble model classification.
          </div>
        </div>

        {/* Department Comparison */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Department Performance Comparison</h2>
              <p className="text-xs text-slate-500">Average projected scores & high-risk counts across programs</p>
            </div>
            <button
              onClick={onNavigateToDirectory}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-y border-slate-100 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Students</th>
                  <th className="py-2.5 px-3">Avg Score</th>
                  <th className="py-2.5 px-3">Avg Attendance</th>
                  <th className="py-2.5 px-3">High Risk Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {[
                  { dept: 'Computer Science', count: 85, score: 76.4, att: 81.2, highRisk: 6 },
                  { dept: 'Data Science', count: 72, score: 78.1, att: 83.5, highRisk: 4 },
                  { dept: 'Information Technology', count: 68, score: 71.9, att: 76.8, highRisk: 11 },
                  { dept: 'Electrical Engineering', count: 75, score: 70.2, att: 75.1, highRisk: 14 },
                  { dept: 'Mechanical Engineering', count: 80, score: 68.8, att: 73.4, highRisk: 18 },
                  { dept: 'Business Analytics', count: 70, score: 74.5, att: 79.6, highRisk: 8 },
                ].map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{d.dept}</td>
                    <td className="py-2.5 px-3">{d.count}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{d.score}</td>
                    <td className="py-2.5 px-3">{d.att}%</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        {d.highRisk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Priority Watchlist Table & Recent Interventions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Watchlist Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">High-Risk Student Watchlist</h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                  {watchlist.length} Flagged
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Students requiring early intervention based on multidimensional feature attributions
              </p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search watchlist..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-full sm:w-48"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-y border-slate-100 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Attendance</th>
                  <th className="py-2.5 px-3">Projected Score</th>
                  <th className="py-2.5 px-3">Risk Level</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {(filteredWatchlist || []).map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{st.studentName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{st.studentId}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{st.department}</td>
                    <td className="py-2.5 px-3">
                      <span className={st.attendancePercentage < 75 ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                        {st.attendancePercentage}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-rose-600">
                      {st.latestPredictedScore ? st.latestPredictedScore.toFixed(1) : '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <RiskBadge level={st.currentRiskLevel} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onSelectStudent(st.id)}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        <span>Deep Dive & XAI</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Interventions Log */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Recent Interventions Log</h2>
              <span className="text-xs text-blue-600 font-medium">Active Follow-ups</span>
            </div>

            <div className="space-y-3">
              {(recentInterventions || []).length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No active interventions recorded yet.
                </div>
              ) : (
                (recentInterventions || []).map((intv) => (
                  <div key={intv.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900">{intv.studentName}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        {intv.status}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-600">{intv.interventionType}</p>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 italic">
                      "{intv.notes}"
                    </p>
                    <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>By: {intv.facultyName}</span>
                      <span>{new Date(intv.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={onNavigateToDirectory}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1"
            >
              <span>Explore All Student Records</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
