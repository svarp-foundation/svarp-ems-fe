import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Layers,
  CircleHelp,
  ClipboardList,
  Timer,
  Trophy,
  Shield,
} from 'lucide-react';

const ADMIN_NAV_LINKS = [
  {
    name: 'Dashboard',
    label: 'Dashboard',
    to: '/dashboard',
    icon: LayoutDashboard,
    end: true,
  },
  {
    name: 'Streams',
    label: 'Subject Streams',
    to: '/streams',
    icon: Layers,
  },
  {
    name: 'Questions',
    label: 'Question Bank',
    to: '/questions',
    icon: CircleHelp,
  },
  {
    name: 'Exams',
    label: 'Exams & Schedules',
    to: '/exams',
    icon: ClipboardList,
  },
  {
    name: 'Attempts',
    label: 'Student Attempts',
    to: '/attempts',
    icon: Timer,
  },
  {
    name: 'Results',
    label: 'Results & Scoring',
    to: '/results',
    icon: Trophy,
  },
  {
    name: 'Audit',
    label: 'Security & Audit',
    to: '/audit',
    icon: Shield,
  },
];

export const AdminLayout = ({ headerActions }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8fafc] text-slate-500 text-xs">
        Loading Assessment Studio...
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f8fafc] font-sans antialiased text-slate-900 pb-16 md:pb-0">
      {/* Desktop Sidebar */}
      <AppSidebar
        brandTitle="SVARP"
        brandSubtitle="EXAM"
        brandLink="/dashboard"
        roleBadge="Exam Control Center"
        navLinks={ADMIN_NAV_LINKS}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader
          brandTitle="SVARP"
          brandSubtitle="EXAM PORTAL"
          brandLink="/dashboard"
          actions={headerActions}
        />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-slate-200 z-40 flex items-center justify-around px-1 shadow-lg">
        {ADMIN_NAV_LINKS.map((link) => {
          const isActive = link.end
            ? location.pathname === link.to
            : location.pathname.startsWith(link.to);
          const Icon = link.icon;

          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={`flex flex-col items-center justify-center flex-1 py-1 text-[9px] font-semibold transition-colors ${
                isActive
                  ? 'text-emerald-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon size={16} />
              <span className="mt-0.5 truncate max-w-[48px]">{link.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default AdminLayout;
