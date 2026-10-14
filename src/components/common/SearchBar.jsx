import React from 'react';
import { Search, X } from 'lucide-react';

export const SearchBar = ({
  value,
  onChange,
  placeholder = 'Search...',
  onClear,
  className = '',
  size = 'md',
  disabled = false,
}) => {
  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange({ target: { value: '' } });
    }
  };

  const sizeClasses = {
    sm: 'py-1.5 pl-8 pr-7 text-xs',
    md: 'py-2 pl-9 pr-8 text-xs',
    lg: 'py-2.5 pl-10 pr-9 text-sm',
  };

  const iconSizes = {
    sm: 14,
    md: 15,
    lg: 16,
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <Search
        size={iconSizes[size] || 15}
        className="absolute left-3 text-slate-400 pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1f3b45] focus:border-[#1f3b45] transition-all disabled:bg-slate-50 disabled:text-slate-400 ${
          sizeClasses[size] || sizeClasses.md
        }`}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors cursor-pointer"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
