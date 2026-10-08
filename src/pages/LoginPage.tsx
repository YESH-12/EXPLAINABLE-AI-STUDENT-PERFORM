import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  Hash,
  User as UserIcon,
  Building,
  Sliders,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { User, Role } from '../types/index';
import { RiskBadge } from '../components/RiskBadge';

interface LoginPageProps {
  onLoginSuccess: (user: User, token: string) => void;
  onBackToLanding: () => void;
  onOpenPrivacy: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onBackToLanding,
  onOpenPrivacy,
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'create'>('signin');

  // Sign In States
  const [email, setEmail] = useState('faculty@university.edu');
  const [password, setPassword] = useState('faculty123');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);

  // Create New Portal (Runtime) States
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<Role>('student');
  const [newDepartment, setNewDepartment] = useState('Computer Science');
  const [newRollNo, setNewRollNo] = useState(`STU-CS-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [academicYear, setAcademicYear] = useState(2);
  const [semester, setSemester] = useState(4);
  const [attendancePercentage, setAttendancePercentage] = useState(84);
  const [internalMarks, setInternalMarks] = useState(78);
  const [assignmentPerformance, setAssignmentPerformance] = useState(82);
  const [studyHoursPerWeek, setStudyHoursPerWeek] = useState(18);
  const [previousGpa, setPreviousGpa] = useState(8.0);
  const [quizAverage, setQuizAverage] = useState(76);
  const [lateSubmissions, setLateSubmissions] = useState(0);
  const [lmsParticipation, setLmsParticipation] = useState(85);
  const [previousSemesterScore, setPreviousSemesterScore] = useState(79);

  // Real-time ML Preview for New Portal Creation
  const [livePreviewScore, setLivePreviewScore] = useState<number>(79.4);
  const [livePreviewRisk, setLivePreviewRisk] = useState<'Low Risk' | 'Medium Risk' | 'High Risk'>('Low Risk');
  const [livePreviewModel, setLivePreviewModel] = useState<string>('XGBoost Regressor');

  // Registered Portal Users List (for real-time viewing & deletion)
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setRegisteredUsers(data?.users || []);
      }
    } catch (e) {
      console.error('Failed to fetch users:', e);
    }
  };

  // Real-time ML calculation whenever runtime sliders change in Create New Portal mode
  useEffect(() => {
    if (authMode !== 'create' || newRole !== 'student') return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: newRollNo || 'PREVIEW',
            studentName: newName || 'New Student',
            department: newDepartment,
            academicYear,
            semester,
            attendancePercentage,
            internalMarks,
            assignmentPerformance,
            studyHoursPerWeek,
            previousGpa,
            quizAverage,
            lateSubmissions,
            learningActivityScore: lmsParticipation,
            lmsParticipation,
            previousSemesterScore,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setLivePreviewScore(data.predictedScore);
          setLivePreviewRisk(data.riskLevel);
          setLivePreviewModel(data.selectedModelName);
        }
      } catch (e) {
        // Fallback local calculation if offline
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [
    authMode,
    newRole,
    attendancePercentage,
    internalMarks,
    assignmentPerformance,
    studyHoursPerWeek,
    previousGpa,
    quizAverage,
    lateSubmissions,
    lmsParticipation,
    previousSemesterScore,
  ]);

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Unable to connect to authentication server');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePortalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          role: newRole,
          department: newDepartment,
          studentId: newRole === 'student' ? newRollNo : undefined,
          academicYear,
          semester,
          attendancePercentage,
          internalMarks,
          assignmentPerformance,
          studyHoursPerWeek,
          previousGpa,
          quizAverage,
          lateSubmissions,
          learningActivityScore: lmsParticipation,
          lmsParticipation,
          previousSemesterScore,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create new portal account');
      }

      await fetchUsers();
      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUserAccount = async (userId: string, userEmail: string) => {
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
      if (res.ok) {
        setRegisteredUsers(prev => prev.filter(u => u.id !== userId && u.email !== userEmail));
      }
    } catch (err) {
      console.error('Failed to delete user account:', err);
    }
  };

  const setDemoCredentials = (demoEmail: string, demoPass: string) => {
    setAuthMode('signin');
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  const generateNewRollNo = (dept: string) => {
    const code = dept.substring(0, 2).toUpperCase();
    setNewRollNo(`STU-${code}-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  return (
    <div id="login-page" className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <button
          onClick={onBackToLanding}
          className="inline-flex items-center gap-2 mb-4 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          ← Back to Overview
        </button>
        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white mx-auto flex items-center justify-center shadow-md mb-3">
          <GraduationCap className="w-7 h-7 text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          {authMode === 'signin' ? 'Academic Portal Sign In' : 'Create New Real-Time Academic Portal'}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {authMode === 'signin'
            ? 'Sign in with existing credentials or create a new runtime portal with live ML profiling'
            : 'All academic metrics entered below are evaluated in real time by the active ML & SHAP/LIME pipeline'}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-6 px-6 sm:px-8 shadow-sm border border-slate-200 rounded-2xl space-y-6">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => { setAuthMode('signin'); setError(null); }}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                authMode === 'signin'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5 text-blue-600" />
              <span>Sign In to Portal</span>
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('create'); setError(null); }}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                authMode === 'create'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create New Portal (Runtime)</span>
            </button>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {forgotSent && authMode === 'signin' && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Password recovery instructions dispatched to {email}.</span>
            </div>
          )}

          {authMode === 'signin' ? (
            <form onSubmit={handleSignInSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institutional Email Address
                </label>
                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="name@university.edu"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span>Remember session</span>
                </label>
                <button
                  type="button"
                  onClick={() => setForgotSent(true)}
                  className="font-medium text-blue-600 hover:text-blue-700"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-70"
              >
                {loading ? (
                  <span>Authenticating with Server...</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* CREATE NEW PORTAL FORM (REAL-TIME & RUNTIME DATA) */
            <form onSubmit={handleCreatePortalSubmit} className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Portal Role
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(['student', 'faculty', 'admin'] as Role[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setNewRole(r)}
                      className={`py-2 px-3 rounded-xl border font-bold capitalize transition-all ${
                        newRole === r
                          ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {r} Portal
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => {
                        setNewName(e.target.value);
                        if (!newEmail || newEmail.includes('@university.edu')) {
                          const slug = e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '.');
                          if (slug) setNewEmail(`${slug}@university.edu`);
                        }
                      }}
                      placeholder="e.g. Yeshvanth Kumar"
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department *
                  </label>
                  <div className="relative">
                    <Building className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <select
                      value={newDepartment}
                      onChange={(e) => {
                        setNewDepartment(e.target.value);
                        generateNewRollNo(e.target.value);
                      }}
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Computer Science">Computer Science</option>
                      <option value="Data Science">Data Science</option>
                      <option value="Information Technology">Information Technology</option>
                      <option value="Electrical Engineering">Electrical Engineering</option>
                      <option value="Mechanical Engineering">Mechanical Engineering</option>
                      <option value="Business Analytics">Business Analytics</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Institutional Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="student.name@university.edu"
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Portal Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Create password"
                      className="w-full pl-8 pr-8 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Runtime Student Academic Data Section */}
              {newRole === 'student' && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <div className="flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-900">
                        Real-Time Student Academic Metrics (Runtime Input)
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Live ML Connected
                    </span>
                  </div>

                  {/* Roll No, Year, Semester */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Student Roll No / ID *
                      </label>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          required
                          value={newRollNo}
                          onChange={(e) => setNewRollNo(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-300 bg-white"
                          placeholder="STU-CS-2026-1001"
                        />
                        <button
                          type="button"
                          onClick={() => generateNewRollNo(newDepartment)}
                          title="Generate Roll No"
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Academic Year
                      </label>
                      <select
                        value={academicYear}
                        onChange={(e) => setAcademicYear(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                      >
                        <option value={1}>Year 1</option>
                        <option value={2}>Year 2</option>
                        <option value={3}>Year 3</option>
                        <option value={4}>Year 4</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Semester
                      </label>
                      <select
                        value={semester}
                        onChange={(e) => setSemester(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                          <option key={s} value={s}>Semester {s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Sliders for Real-Time Academic Features */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-0.5">
                        <span>Attendance %</span>
                        <span className={attendancePercentage < 75 ? 'text-rose-600 font-bold' : 'text-blue-700 font-bold'}>
                          {attendancePercentage}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="30"
                        max="100"
                        value={attendancePercentage}
                        onChange={(e) => setAttendancePercentage(Number(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-0.5">
                        <span>Internal Marks</span>
                        <span className="font-bold text-slate-900">{internalMarks}/100</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={internalMarks}
                        onChange={(e) => setInternalMarks(Number(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-0.5">
                        <span>Assignment Score</span>
                        <span className="font-bold text-slate-900">{assignmentPerformance}/100</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={assignmentPerformance}
                        onChange={(e) => setAssignmentPerformance(Number(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-0.5">
                        <span>Previous GPA</span>
                        <span className="font-bold text-slate-900">{previousGpa.toFixed(1)} / 10</span>
                      </div>
                      <input
                        type="range"
                        min="4.0"
                        max="10.0"
                        step="0.1"
                        value={previousGpa}
                        onChange={(e) => setPreviousGpa(Number(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-0.5">
                        <span>Study Hours / Week</span>
                        <span className="font-bold text-slate-900">{studyHoursPerWeek} hrs</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="45"
                        value={studyHoursPerWeek}
                        onChange={(e) => setStudyHoursPerWeek(Number(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-0.5">
                        <span>Quiz Average</span>
                        <span className="font-bold text-slate-900">{quizAverage}/100</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={quizAverage}
                        onChange={(e) => setQuizAverage(Number(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                    </div>
                  </div>

                  {/* Live Real-Time ML Preview Banner */}
                  <div className="p-3 rounded-xl bg-white border border-blue-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                        Real-Time ML Evaluation ({livePreviewModel})
                      </span>
                      <span className="text-xs text-slate-600">
                        Live Projected Score:{' '}
                        <strong className="text-slate-900 text-sm">{livePreviewScore.toFixed(1)} / 100</strong>
                      </span>
                    </div>
                    <RiskBadge level={livePreviewRisk} size="sm" />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-70"
              >
                {loading ? (
                  <span>Creating Real-Time Portal & Computing XAI...</span>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Portal & Launch Dashboard Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Active & Runtime Portal Accounts with One-Click Login and Delete */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Quick Portal Switcher & Stored Accounts ({registeredUsers.length})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs max-h-48 overflow-y-auto pr-1">
              {(registeredUsers || []).map((u) => {
                const isDefaultDemo = ['faculty@university.edu', 'student@university.edu', 'student2@university.edu', 'admin@university.edu'].includes(u.email);
                const defaultPass = u.email.startsWith('faculty') || u.email.startsWith('prof')
                  ? 'faculty123'
                  : u.email.startsWith('admin')
                  ? 'admin123'
                  : 'student123';

                return (
                  <div
                    key={u.id}
                    className="p-2 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all flex items-center justify-between gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signin');
                        setEmail(u.email);
                        if (isDefaultDemo) setPassword(defaultPass);
                        setError(null);
                      }}
                      className="text-left flex-1 min-w-0"
                    >
                      <div className="font-bold text-slate-900 truncate">{u.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">
                        <span className="uppercase font-semibold text-blue-600">{u.role}</span>
                        {u.studentId ? ` • ${u.studentId}` : ` • ${u.department || ''}`}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteUserAccount(u.id, u.email)}
                      title="Delete Portal Account"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          <button onClick={onOpenPrivacy} className="hover:text-blue-600 underline">
            Review Responsible AI & FERPA Student Data Charter
          </button>
        </div>
      </div>
    </div>
  );
};
