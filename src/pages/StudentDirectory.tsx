import React, { useState, useEffect } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Trash2,
  UserPlus,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { Student, AiStudentBrief } from '../types/index';
import { RiskBadge } from '../components/RiskBadge';
import { AiStudentLookup } from '../components/AiStudentLookup';

interface StudentDirectoryProps {
  onSelectStudent: (studentId: string, aiBrief?: AiStudentBrief) => void;
  onOpenPredictorForStudent?: (student: Student) => void;
}

export const StudentDirectory: React.FC<StudentDirectoryProps> = ({
  onSelectStudent,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Runtime Add Student Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentRoll, setNewStudentRoll] = useState(`STU-CS-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newDepartment, setNewDepartment] = useState('Computer Science');
  const [newYear, setNewYear] = useState(2);
  const [newSemester, setNewSemester] = useState(4);
  const [newAttendance, setNewAttendance] = useState(82);
  const [newInternal, setNewInternal] = useState(76);
  const [newAssignment, setNewAssignment] = useState(80);
  const [newStudyHours, setNewStudyHours] = useState(18);
  const [newGpa, setNewGpa] = useState(7.8);
  const [newQuiz, setNewQuiz] = useState(75);
  const [newLateSubs, setNewLateSubs] = useState(0);
  const [newLms, setNewLms] = useState(84);
  const [addingStudent, setAddingStudent] = useState(false);

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
      if (yearFilter !== 'All') params.append('year', yearFilter);
      params.append('limit', '500');

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

  const handleDeleteSingleStudent = async (id: string) => {
    try {
      const res = await fetch(`/api/students/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        setStudents(prev => prev.filter(s => s.id !== id));
        setSelectedIds(prev => prev.filter(item => item !== id));
      }
    } catch (err) {
      console.error('Failed to delete student:', err);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch('/api/students', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (res.ok) {
        const idSet = new Set(selectedIds);
        setStudents(prev => prev.filter(s => !idSet.has(s.id)));
        setSelectedIds([]);
      }
    } catch (err) {
      console.error('Failed to bulk delete students:', err);
    }
  };

  const handleClearAllStudents = async () => {
    try {
      const res = await fetch('/api/students', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearAll: true }),
      });
      if (res.ok) {
        setStudents([]);
        setSelectedIds([]);
      }
    } catch (err) {
      console.error('Failed to clear all students:', err);
    }
  };

  const handleResetSeedData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data/reset', { method: 'POST' });
      if (res.ok) {
        await fetchStudents();
      }
    } catch (err) {
      console.error('Failed to reset seed data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRuntimeStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    setAddingStudent(true);
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: newStudentName,
          studentId: newStudentRoll,
          email: newStudentEmail || undefined,
          department: newDepartment,
          academicYear: newYear,
          semester: newSemester,
          attendancePercentage: newAttendance,
          internalMarks: newInternal,
          assignmentPerformance: newAssignment,
          studyHoursPerWeek: newStudyHours,
          previousGpa: newGpa,
          quizAverage: newQuiz,
          lateSubmissions: newLateSubs,
          lmsParticipation: newLms,
          learningActivityScore: newLms,
          previousSemesterScore: Math.round(newGpa * 10),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.student) {
          setStudents(prev => [data.student, ...prev]);
        }
        setShowAddModal(false);
        setNewStudentName('');
        setNewStudentEmail('');
        setNewStudentRoll(`STU-${newDepartment.substring(0, 2).toUpperCase()}-2026-${Math.floor(1000 + Math.random() * 9000)}`);
      }
    } catch (err) {
      console.error('Failed to add runtime student:', err);
    } finally {
      setAddingStudent(false);
    }
  };

  // Client-side filtering & sorting
  const filtered = (students || []).filter(s =>
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

  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAllPage = () => {
    const pageIds = pageItems.map(s => s.id);
    const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Student Directory & Runtime Record Manager</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Search, add runtime students, delete stored records, or use AI Roll No & Name lookup
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Runtime Student</span>
          </button>

          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )}

          {students.length > 0 && (
            <button
              onClick={handleClearAllStudents}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Stored Students</span>
            </button>
          )}

          <button
            onClick={handleResetSeedData}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Restore default synthetic cohort"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Seed Data</span>
          </button>

          <button
            onClick={exportCSV}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* AI Direct Roll No & Name Lookup */}
      <AiStudentLookup onSelectStudentWithAi={onSelectStudent} />

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
              placeholder="Filter by student name, Roll No / ID, or email..."
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
            Showing <strong>{sorted.length}</strong> stored students
          </div>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 w-8">
                  <input
                    type="checkbox"
                    checked={pageItems.length > 0 && pageItems.every(s => selectedIds.includes(s.id))}
                    onChange={toggleSelectAllPage}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="py-3 px-4">Student Roll No & Name</th>
                <th className="py-3 px-4">Program & Year</th>
                <th className="py-3 px-4">Attendance</th>
                <th className="py-3 px-4">Internal Marks</th>
                <th className="py-3 px-4">Study Hrs</th>
                <th className="py-3 px-4">Projected Score</th>
                <th className="py-3 px-4">Academic Risk</th>
                <th className="py-3 px-4 text-right">Actions & Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading student records...
                  </td>
                </tr>
              ) : (pageItems || []).length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 space-y-2">
                    <div>No student records found.</div>
                    <button
                      onClick={handleResetSeedData}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
                    >
                      Restore Default Cohort Data
                    </button>
                  </td>
                </tr>
              ) : (
                (pageItems || []).map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(st.id)}
                        onChange={() => toggleSelectRow(st.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{st.studentName}</div>
                      <div className="text-[10px] text-blue-600 font-mono font-semibold">{st.studentId} • <span className="text-slate-400 font-normal">{st.email}</span></div>
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
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => onSelectStudent(st.id)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Inspect Profile & XAI
                        </button>
                        <button
                          onClick={() => handleDeleteSingleStudent(st.id)}
                          title="Delete Student Record"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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

      {/* Add Runtime Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add New Runtime Student Record</h3>
                <p className="text-xs text-slate-500">
                  Real-time ML prediction & SHAP/LIME explanations will be computed automatically
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRuntimeStudent} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Student Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder="e.g. Karthik Subramanian"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Student Roll No / ID *</label>
                  <input
                    type="text"
                    required
                    value={newStudentRoll}
                    onChange={(e) => setNewStudentRoll(e.target.value)}
                    placeholder="STU-CS-2026-1001"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electrical Engineering">Electrical Engineering</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Business Analytics">Business Analytics</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Academic Year</label>
                  <select
                    value={newYear}
                    onChange={(e) => setNewYear(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Semester</label>
                  <select
                    value={newSemester}
                    onChange={(e) => setNewSemester(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Sem {s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Attendance ({newAttendance}%)</label>
                  <input
                    type="range"
                    min="30"
                    max="100"
                    value={newAttendance}
                    onChange={(e) => setNewAttendance(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Internal ({newInternal}/100)</label>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={newInternal}
                    onChange={(e) => setNewInternal(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assignments ({newAssignment}/100)</label>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={newAssignment}
                    onChange={(e) => setNewAssignment(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Study Hrs ({newStudyHours}/wk)</label>
                  <input
                    type="range"
                    min="2"
                    max="45"
                    value={newStudyHours}
                    onChange={(e) => setNewStudyHours(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GPA ({newGpa.toFixed(1)}/10)</label>
                  <input
                    type="range"
                    min="4.0"
                    max="10.0"
                    step="0.1"
                    value={newGpa}
                    onChange={(e) => setNewGpa(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quiz Avg ({newQuiz}/100)</label>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={newQuiz}
                    onChange={(e) => setNewQuiz(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingStudent}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{addingStudent ? 'Adding & Running ML...' : 'Save Student & Compute XAI'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
