import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  UserCheck, 
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import { Student, RiskLevel } from '../types/index';
import { RiskBadge } from '../components/RiskBadge';

interface StudentDirectoryProps {
  onSelectStudent: (studentId: string) => void;
  onOpenPredictorForStudent?: (student: Student) => void;
}

export const StudentDirectory: React.FC<StudentDirectoryProps> = ({
  onSelectStudent,
  onOpenPredictorForStudent,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'attendance' | 'gpa'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    fetchStudents();
  }, [deptFilter, riskFilter, yearFilter]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (deptFilter !== 'All') params.append('department', deptFilter);
      if (riskFilter !== 'All') params.append('risk', riskFilter);
      if (yearFilter !== 'All') params.append('academicYear', yearFilter);
      params.append('limit', '400');

      const res = await fetch(`/api/students?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data?.students || []);
      }
    } catch (err) {
      console.error('Failed to load student directory:', err);
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering & sorting
  const filtered = students.filter(s =>
    s.studentName.toLowerCase().includes(search.toLowerCase()) ||
    s.studentId.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    let diff = 0;
    if (sortBy === 'name') diff = a.studentName.localeCompare(b.studentName);
    else if (sortBy === 'score') diff = (a.latestPredictedScore || 0) - (b.latestPredictedScore || 0);
    else if (sortBy === 'attendance') diff = a.attendancePercentage - b.attendancePercentage;
    else if (sortBy === 'gpa') diff = a.previousGpa - b.previousGpa;

    return sortOrder === 'asc' ? diff : -diff;
  });

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const pageItems = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const exportCSV = () => {
    const headers = [
      'Student ID', 'Student Name', 'Email', 'Department', 'Year', 'Semester',
      'Attendance %', 'Internal Marks', 'Assignment %', 'Study Hrs/Wk', 'Previous GPA',
      'Quiz Avg', 'Late Subs', 'LMS Score', 'Predicted Final Score', 'Risk Level'
    ];

    const rows = (sorted || []).map(s => [
      s.studentId,
      `"${s.studentName}"`,
      s.email,
      `"${s.department}"`,
      s.academicYear,
      s.semester,
      s.attendancePercentage,
      s.internalMarks,
      s.assignmentPerformance,
      s.studyHoursPerWeek,
      s.previousGpa,
      s.quizAverage,
      s.lateSubmissions,
      s.lmsParticipation,
      s.latestPredictedScore || '',
      `"${s.currentRiskLevel}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...(rows || []).map(e => (e || []).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `student_performance_cohort_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="student-directory" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Student Directory & Academic Records</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Search, filter, and inspect student records with integrated Explainable AI profiles
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Filtered Cohort (CSV)</span>
          </button>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Search by student name, ID, or email..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Department */}
          <div>
            <select
              value={deptFilter}
              onChange={(e) => { setDeptFilter(e.target.value); setCurrentPage(1); }}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="All">All Departments</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Data Science">Data Science</option>
              <option value="Information Technology">Information Technology</option>
              <option value="Electrical Engineering">Electrical Engineering</option>
              <option value="Mechanical Engineering">Mechanical Engineering</option>
              <option value="Business Analytics">Business Analytics</option>
            </select>
          </div>

          {/* Risk Level */}
          <div>
            <select
              value={riskFilter}
              onChange={(e) => { setRiskFilter(e.target.value); setCurrentPage(1); }}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="All">All Risk Tiers</option>
              <option value="High Risk">High Risk (&lt;50)</option>
              <option value="Medium Risk">Medium Risk (50-69)</option>
              <option value="Low Risk">Low Risk (&ge;70)</option>
            </select>
          </div>

          {/* Academic Year */}
          <div>
            <select
              value={yearFilter}
              onChange={(e) => { setYearFilter(e.target.value); setCurrentPage(1); }}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="All">All Academic Years</option>
              <option value="1">Year 1 (Freshmen)</option>
              <option value="2">Year 2 (Sophomore)</option>
              <option value="3">Year 3 (Junior)</option>
              <option value="4">Year 4 (Senior)</option>
            </select>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span>Sort By:</span>
            <button
              onClick={() => { setSortBy('score'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
              className={`px-2.5 py-1 rounded-lg border font-medium ${sortBy === 'score' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200 text-slate-600'}`}
            >
              Predicted Score {sortBy === 'score' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => { setSortBy('attendance'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
              className={`px-2.5 py-1 rounded-lg border font-medium ${sortBy === 'attendance' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200 text-slate-600'}`}
            >
              Attendance {sortBy === 'attendance' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => { setSortBy('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
              className={`px-2.5 py-1 rounded-lg border font-medium ${sortBy === 'name' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200 text-slate-600'}`}
            >
              Name {sortBy === 'name' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
          </div>

          <div>
            Showing <strong>{sorted.length}</strong> matching students
          </div>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Student Details</th>
                <th className="py-3 px-4">Program & Year</th>
                <th className="py-3 px-4">Attendance</th>
                <th className="py-3 px-4">Internal Marks</th>
                <th className="py-3 px-4">Study Hrs</th>
                <th className="py-3 px-4">Projected Score</th>
                <th className="py-3 px-4">Academic Risk</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading student records...
                  </td>
                </tr>
              ) : (pageItems || []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No students found matching the selected filter criteria.
                  </td>
                </tr>
              ) : (
                (pageItems || []).map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{st.studentName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{st.studentId} • {st.email}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{st.department}</div>
                      <div className="text-[10px] text-slate-400">Year {st.academicYear}, Sem {st.semester}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={st.attendancePercentage < 75 ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                        {st.attendancePercentage}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{st.internalMarks}/100</td>
                    <td className="py-3 px-4 text-slate-700">{st.studyHoursPerWeek} hrs</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 text-sm">
                        {st.latestPredictedScore ? st.latestPredictedScore.toFixed(1) : '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <RiskBadge level={st.currentRiskLevel} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onSelectStudent(st.id)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        Inspect Profile & XAI
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({sorted.length} total students)
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
