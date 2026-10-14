import React from 'react';
import { Link } from 'react-router-dom';

export const StatCard = ({
  label,
  value,
  sub,
  icon: Icon,
  to,
  className = '',
  valueColor = 'text-slate-900',
}) => {
  const content = (
    <div
      className={`bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs transition-all duration-200 flex flex-col justify-between ${
        to ? 'hover:border-slate-300 hover:shadow-sm cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {label}
        </p>
        {Icon && (
          <div className="w-7 h-7 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center flex-shrink-0">
            {typeof Icon === 'function' || typeof Icon === 'object' ? (
              <Icon size={14} />
            ) : (
              <span>{Icon}</span>
            )}
          </div>
        )}
      </div>

      <div className="mt-2">
        <h3 className={`text-2xl font-extrabold tracking-tight ${valueColor}`}>
          {value}
        </h3>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block">
        {content}
      </Link>
    );
  }

  return content;
};

export default StatCard;
