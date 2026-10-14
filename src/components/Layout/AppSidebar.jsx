import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';

export const AppSidebar = ({
  brandTitle = 'SVARP',
  brandSubtitle = 'EXAM',
  brandLink = '/dashboard',
  roleBadge = 'Exam Control Center',
  navLinks = [],
  footerContent,
  className = '',
}) => {
  const location = useLocation();

  const isActiveLink = (link) => {
    if (link.end) {
      return location.pathname === link.to;
    }
    return (
      location.pathname === link.to ||
      (link.to !== '/' && location.pathname.startsWith(link.to))
    );
  };

  return (
    <aside
      className={`hidden md:flex flex-col sticky top-0 h-screen w-64 bg-[#1f3b45] text-white flex-shrink-0 z-30 border-r border-white/5 ${className}`}
    >
      {/* Brand Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-white/10 flex-shrink-0">
        <Link to={brandLink} className="flex items-center gap-2.5 overflow-hidden">
          <img
            src="/company/svarp-logo.webp"
            alt="SVARP"
            className="h-7 w-auto object-contain"
            onError={(e) => {
              if (e.currentTarget.src.includes('svarp-logo.webp')) {
                e.currentTarget.src = '/svarp-logo.png';
              }
            }}
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1 leading-none">
              <span className="font-black text-sm text-white tracking-tight">
                {brandTitle}
              </span>
              <span className="text-[11px] font-bold text-emerald-400">
                {brandSubtitle}
              </span>
            </div>
            {roleBadge && (
              <span className="text-[10px] text-slate-300/80 font-medium mt-0.5">
                {roleBadge}
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navLinks.map((link) => {
          const active = isActiveLink(link);
          const Icon = link.icon;

          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group ${
                active
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {Icon && (
                  <span
                    className={`flex-shrink-0 ${
                      active ? 'text-white' : 'text-slate-400 group-hover:text-white'
                    }`}
                  >
                    {React.isValidElement(Icon) ? Icon : <Icon size={16} />}
                  </span>
                )}
                <span className="truncate">{link.label || link.name}</span>
              </div>

              {link.badge && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                    active ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {link.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-white/10 flex-shrink-0">
        {footerContent || (
          <div className="flex items-center gap-2 px-2 py-1 text-[11px] text-emerald-300/90 font-medium">
            <span className="pulse-dot" />
            <span>Single Session Active</span>
          </div>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;
