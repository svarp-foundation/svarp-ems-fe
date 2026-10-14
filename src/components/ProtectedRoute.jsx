import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ADMIN_ROLES = [
  'admin',
  'super admin',
  'exam administrator',
  'exam admin',
  'evaluator',
  'reviewer',
  'read-only reviewer',
  'proctor',
];

export const isAdminUser = (user) => {
  if (!user) return false;
  const userRoles = [
    ...(Array.isArray(user.roles) ? user.roles : []),
    ...(user.role ? [user.role] : []),
  ].map((r) => String(r).toLowerCase().trim());

  return ADMIN_ROLES.some((role) => userRoles.includes(role.toLowerCase()));
};

export const hasAnyRole = (user, allowedRoles) => {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  if (!user) return false;

  const userRoles = [
    ...(Array.isArray(user.roles) ? user.roles : []),
    ...(user.role ? [user.role] : []),
  ].map((r) => String(r).toLowerCase().trim());

  const targetRoles = allowedRoles.map((r) => String(r).toLowerCase().trim());
  return targetRoles.some((role) => userRoles.includes(role));
};

export const ProtectedRoute = ({
  children,
  allowedRoles,
  redirectTo = '/candidate',
}) => {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="fullscreen-loading">
        <div className="btn-spinner large" />
        <p className="loading-text">Validating secure session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const isAuthorized = hasAnyRole(user, allowedRoles);
    if (!isAuthorized) {
      // If a candidate/student attempts to access an admin route, redirect them to candidate portal
      if (!isAdminUser(user)) {
        return <Navigate to={redirectTo} replace />;
      }

      // If user has other roles but not the required one
      const userRoles = user?.roles || [];
      return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full shadow-lg text-center space-y-4">
            <span className="text-4xl">⚠️</span>
            <h2 className="text-lg font-bold text-slate-800">Access Restricted</h2>
            <p className="text-xs text-slate-600">
              Your account does not possess the required permissions to access this view.
            </p>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700">
              Roles: {userRoles.join(', ') || 'None'}
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={() => logout()}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Sign In with Different Account
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return children;
};

