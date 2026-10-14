import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, ChevronDown, Shield, User } from 'lucide-react';

export const UserMenu = ({ className = '' }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : (user?.email?.[0]?.toUpperCase() ?? 'A');

  const rolesLower = (user?.roles || []).map((r) => String(r).toLowerCase().trim());
  const effectiveRole =
    user?.role ||
    (rolesLower.some((r) => r.includes('admin'))
      ? 'Administrator'
      : rolesLower.some((r) => r.includes('proctor'))
      ? 'Exam Proctor'
      : rolesLower.some((r) => r.includes('evaluator'))
      ? 'Evaluator'
      : rolesLower.some((r) => r.includes('reviewer'))
      ? 'Reviewer'
      : user?.roles?.[0] || 'Candidate');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 transition-colors text-left focus:outline-none cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="w-8 h-8 rounded-lg bg-[#1f3b45] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
          <span>{initials}</span>
        </div>

        <div className="hidden sm:block leading-tight">
          <p className="text-xs font-bold text-slate-800 truncate max-w-[130px]">
            {user.full_name || user.email}
          </p>
          <p className="text-[10px] text-slate-500 font-medium">
            {effectiveRole}
          </p>
        </div>

        <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-fadeIn">
          {/* User Info Header */}
          <div className="px-3.5 py-2.5 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-900 truncate">
              {user.full_name || 'Admin User'}
            </p>
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
            <div className="flex items-center gap-1 mt-1.5">
              <span className="inline-block text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                {effectiveRole}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="px-3.5 py-2 text-[11px] text-slate-500 border-b border-slate-100 space-y-1">
            <div className="flex items-center justify-between">
              <span>Session Mode:</span>
              <span className="font-semibold text-emerald-700">Enforced Lock</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Security Hub:</span>
              <span className="font-semibold text-slate-700">Phase 06 Online</span>
            </div>
          </div>

          {/* Logout */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors font-semibold text-left cursor-pointer"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
