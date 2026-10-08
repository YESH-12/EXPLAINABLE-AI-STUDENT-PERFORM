import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Bell,
  ShieldCheck,
  LogOut,
  Menu,
  Sparkles,
  Trash2,
  UserPlus,
  Search,
  X,
} from 'lucide-react';
import { User, NotificationItem, AiStudentBrief } from '../types/index';
import { AiStudentLookup } from './AiStudentLookup';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  onOpenPrivacy: () => void;
  onSwitchUser?: (email: string) => void;
  toggleSidebar?: () => void;
  onSelectStudentWithAi?: (studentId: string, aiBrief?: AiStudentBrief) => void;
  onOpenAuthPortal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  onOpenPrivacy,
  onSwitchUser,
  toggleSidebar,
  onSelectStudentWithAi,
  onOpenAuthPortal,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAiFinderModal, setShowAiFinderModal] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const demoAccounts = [
    { label: 'Faculty (Prof. Jenkins)', email: 'faculty@university.edu', role: 'faculty' },
    { label: 'Student (Alex Rivera)', email: 'student@university.edu', role: 'student' },
    { label: 'Student (Maya Patel - At Risk)', email: 'student2@university.edu', role: 'student' },
    { label: 'Admin (Dr. Vance)', email: 'admin@university.edu', role: 'admin' },
  ];

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data?.notifications || []);
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [showNotifications]);

  const handleDeleteNotification = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (e) {
      console.error('Delete notification failed:', e);
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', { method: 'DELETE' });
      if (res.ok) {
        setNotifications([]);
      }
    } catch (e) {
      console.error('Clear notifications failed:', e);
    }
  };

  return (
    <>
      <header id="main-navbar" className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        {/* Left: Brand and Mobile menu toggle */}
        <div className="flex items-center gap-3">
          {toggleSidebar && (
            <button
              onClick={toggleSidebar}
              className="md:hidden p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <GraduationCap className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                  Explainable<span className="text-blue-600">AI</span> Academic
                </span>
                <span className="hidden sm:inline-flex text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  v2.4 ML
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden md:block">
                Student Performance Prediction & SHAP/LIME Interpretations
              </p>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* AI Roll No & Name Quick Finder Button */}
          {onSelectStudentWithAi && (
            <button
              onClick={() => setShowAiFinderModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
              title="Find Student by Roll No & Name using AI"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">AI Roll No / Name Lookup</span>
              <span className="sm:hidden">AI Lookup</span>
            </button>
          )}

          {/* Create New Portal Button */}
          {onOpenAuthPortal && (
            <button
              onClick={onOpenAuthPortal}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              title="Open Authentication & Create New Portal"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create New Portal</span>
            </button>
          )}

          {/* Quick Persona Switcher */}
          {onSwitchUser && (
            <div className="hidden xl:flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <span className="text-[11px] font-medium text-slate-500 px-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Demo:
              </span>
              {demoAccounts.map((acc) => {
                const active = user?.email.toLowerCase() === acc.email.toLowerCase();
                return (
                  <button
                    key={acc.email}
                    onClick={() => onSwitchUser(acc.email)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      active
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    {acc.role.toUpperCase()}
                  </button>
                );
              })}
            </div>
          )}

          {/* Notifications with Delete Options */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 relative transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    System Notifications ({notifications.length})
                  </span>
                  {notifications.length > 0 && (
                    <button
                      onClick={handleClearAllNotifications}
                      className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear All
                    </button>
                  )}
                </div>
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {(notifications || []).length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No stored notifications.
                    </div>
                  ) : (
                    (notifications || []).map((n) => (
                      <div key={n.id} className="p-3 text-xs hover:bg-slate-50 transition-colors flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-800">{n.title}</p>
                          <p className="text-slate-500 mt-0.5">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteNotification(n.id)}
                          title="Delete notification"
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Badge / Dropdown */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  {user.name.charAt(0)}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-bold text-slate-900 leading-none">{user.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5 capitalize">
                    {user.role} {user.studentId ? `• ${user.studentId}` : user.department ? `• ${user.department}` : ''}
                  </p>
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{user.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    {user.studentId && (
                      <p className="text-[10px] font-mono text-blue-600 mt-0.5">Roll No: {user.studentId}</p>
                    )}
                  </div>
                  <div className="py-1">
                    {onOpenAuthPortal && (
                      <button
                        onClick={() => { setShowUserMenu(false); onOpenAuthPortal(); }}
                        className="w-full text-left px-4 py-2 text-xs text-blue-700 hover:bg-blue-50 flex items-center gap-2 font-semibold"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                        Create New Portal Account
                      </button>
                    )}
                    <button
                      onClick={() => { setShowUserMenu(false); onOpenPrivacy(); }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      FERPA & Privacy Charter
                    </button>
                    <button
                      onClick={() => { setShowUserMenu(false); onLogout(); }}
                      className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-600" />
                      Sign Out / Switch Portal
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => onOpenAuthPortal && onOpenAuthPortal()}
              className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Global AI Roll No & Name Lookup Modal */}
      {showAiFinderModal && onSelectStudentWithAi && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-3xl w-full relative">
            <button
              onClick={() => setShowAiFinderModal(false)}
              className="absolute -top-3 -right-3 z-50 w-8 h-8 rounded-full bg-white text-slate-800 shadow-lg flex items-center justify-center hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
            <AiStudentLookup
              onSelectStudentWithAi={(id, brief) => {
                setShowAiFinderModal(false);
                onSelectStudentWithAi(id, brief);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
};
