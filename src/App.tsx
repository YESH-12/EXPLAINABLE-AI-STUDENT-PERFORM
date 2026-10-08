import React, { useState, useEffect } from 'react';
import { User, Student, AiStudentBrief } from './types/index';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { PrivacyNoticeModal } from './components/PrivacyNoticeModal';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { FacultyDashboard } from './pages/FacultyDashboard';
import { StudentDirectory } from './pages/StudentDirectory';
import { StudentDetails } from './pages/StudentDetails';
import { PredictionCenter } from './pages/PredictionCenter';
import { ModelEvaluationPage } from './pages/ModelEvaluationPage';
import { ReportsPage } from './pages/ReportsPage';
import { SystemTestPage } from './pages/SystemTestPage';

export default function App() {
  // Default session with Faculty persona so the application is immediately testable and active
  const [user, setUser] = useState<User | null>({
    id: 'usr_faculty',
    email: 'faculty@university.edu',
    name: 'Prof. Sarah Jenkins',
    role: 'faculty',
    department: 'Computer Science',
  });

  const [currentTab, setCurrentTab] = useState<string>('faculty-dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedAiBrief, setSelectedAiBrief] = useState<AiStudentBrief | null>(null);
  const [selectedStudentForPredictor, setSelectedStudentForPredictor] = useState<Student | null>(null);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Sync tab when user switches role
  useEffect(() => {
    if (user) {
      if (user.role === 'student') {
        setCurrentTab('student-dashboard');
      } else {
        if (currentTab === 'student-dashboard') {
          setCurrentTab('faculty-dashboard');
        }
      }
    }
  }, [user]);

  const handleLoginSuccess = (authenticatedUser: User, token: string) => {
    setUser(authenticatedUser);
    localStorage.setItem('auth_token', token);
    if (authenticatedUser.role === 'student') {
      setCurrentTab('student-dashboard');
    } else {
      setCurrentTab('faculty-dashboard');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('auth_token');
    setCurrentTab('login');
  };

  const handleOpenAuthPortal = () => {
    setUser(null);
    setCurrentTab('login');
  };

  const handleSwitchUser = async (email: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: email.startsWith('faculty') ? 'faculty123' : email.startsWith('admin') ? 'admin123' : 'student123',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.user.role === 'student') {
          setCurrentTab('student-dashboard');
        } else {
          setCurrentTab('faculty-dashboard');
        }
      }
    } catch (e) {
      console.error('Failed to switch persona:', e);
    }
  };

  const navigateToStudentDetails = (studentId: string, aiBrief?: AiStudentBrief) => {
    setSelectedStudentId(studentId);
    setSelectedAiBrief(aiBrief || null);
    setCurrentTab('student-details');
  };

  const navigateToPredictorWithStudent = (student: Student) => {
    setSelectedStudentForPredictor(student);
    setCurrentTab('prediction-center');
  };

  // If on landing or login view
  if (currentTab === 'landing' || (!user && currentTab !== 'login')) {
    return (
      <>
        <LandingPage
          onGetStarted={() => setCurrentTab('login')}
          onLoginDemo={(email) => handleSwitchUser(email)}
          onOpenPrivacy={() => setIsPrivacyOpen(true)}
        />
        <PrivacyNoticeModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      </>
    );
  }

  if (currentTab === 'login' && !user) {
    return (
      <>
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onBackToLanding={() => setCurrentTab('landing')}
          onOpenPrivacy={() => setIsPrivacyOpen(true)}
        />
        <PrivacyNoticeModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        onSwitchUser={handleSwitchUser}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onSelectStudentWithAi={navigateToStudentDetails}
        onOpenAuthPortal={handleOpenAuthPortal}
      />

      <div className="flex-1 flex">
        {/* Responsive Sidebar */}
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={(tab) => {
            setCurrentTab(tab);
            if (tab !== 'student-details') {
              setSelectedStudentId(null);
              setSelectedAiBrief(null);
            }
          }}
          role={user?.role || 'faculty'}
          isOpen={isSidebarOpen}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-x-hidden min-h-[calc(100vh-4rem)]">
          {currentTab === 'student-dashboard' && user && (
            <StudentDashboard
              user={user}
              onOpenPrivacy={() => setIsPrivacyOpen(true)}
              onNavigateToSimulator={() => setCurrentTab('prediction-center')}
            />
          )}

          {currentTab === 'faculty-dashboard' && (
            <FacultyDashboard
              onSelectStudent={navigateToStudentDetails}
              onNavigateToDirectory={() => setCurrentTab('students-directory')}
              onNavigateToPredictor={() => setCurrentTab('prediction-center')}
              onNavigateToReports={() => setCurrentTab('reports')}
            />
          )}

          {currentTab === 'students-directory' && (
            <StudentDirectory
              onSelectStudent={navigateToStudentDetails}
              onOpenPredictorForStudent={navigateToPredictorWithStudent}
            />
          )}

          {currentTab === 'student-details' && (
            <StudentDetails
              studentId={selectedStudentId || 'STU-CO-2023-0001'}
              initialAiBrief={selectedAiBrief}
              onBack={() => setCurrentTab(user?.role === 'student' ? 'student-dashboard' : 'students-directory')}
              onSelectAnotherStudent={navigateToStudentDetails}
              currentUserRole={user?.role}
              currentUserName={user?.name}
            />
          )}

          {currentTab === 'prediction-center' && (
            <PredictionCenter initialStudent={selectedStudentForPredictor} />
          )}

          {currentTab === 'model-evaluation' && (
            <ModelEvaluationPage />
          )}

          {currentTab === 'reports' && (
            <ReportsPage />
          )}

          {currentTab === 'qa-tests' && (
            <SystemTestPage />
          )}
        </main>
      </div>

      {/* Global Privacy Modal */}
      <PrivacyNoticeModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </div>
  );
}
