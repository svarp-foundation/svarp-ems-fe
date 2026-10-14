import React from 'react';

export const StatusBadge = ({
  status,
  variant,
  customLabel,
  label,
  showDot = true,
  className = '',
}) => {
  const displayLabel = customLabel || label;
  if (!status && !displayLabel) return null;

  let textStatus = '';
  if (typeof status === 'string') {
    textStatus = status;
  } else if (typeof displayLabel === 'string') {
    textStatus = displayLabel;
  } else if (status && typeof status === 'object') {
    textStatus = status.name || status.code || status.status || '';
  }

  const rawStatus = textStatus.toLowerCase().trim();

  let colorClasses = 'text-slate-600 bg-slate-100/80 border-slate-200';
  let dotColor = 'bg-slate-400';
  let defaultLabel = textStatus;

  if (variant === 'success') {
    colorClasses = 'text-emerald-700 bg-emerald-50/80 border-emerald-200/60';
    dotColor = 'bg-emerald-500';
  } else if (variant === 'warning') {
    colorClasses = 'text-amber-700 bg-amber-50/80 border-amber-200/60';
    dotColor = 'bg-amber-500';
  } else if (variant === 'danger') {
    colorClasses = 'text-rose-700 bg-rose-50/80 border-rose-200/60';
    dotColor = 'bg-rose-500';
  } else if (variant === 'info') {
    colorClasses = 'text-sky-700 bg-sky-50/80 border-sky-200/60';
    dotColor = 'bg-sky-500';
  } else {
    switch (rawStatus) {
      case 'active':
      case 'approved':
      case 'published':
      case 'success':
      case 'completed':
      case 'passed':
        colorClasses = 'text-emerald-700 bg-emerald-50/80 border-emerald-200/60';
        dotColor = 'bg-emerald-500';
        defaultLabel =
          rawStatus === 'published'
            ? 'Published'
            : rawStatus === 'approved'
            ? 'Approved'
            : rawStatus === 'completed'
            ? 'Completed'
            : rawStatus === 'passed'
            ? 'Passed'
            : 'Active';
        break;

      case 'pending':
      case 'draft':
      case 'in_progress':
      case 'scheduled':
      case 'processing':
      case 'under_review':
        colorClasses = 'text-amber-700 bg-amber-50/80 border-amber-200/60';
        dotColor = 'bg-amber-500';
        defaultLabel =
          rawStatus === 'draft'
            ? 'Draft'
            : rawStatus === 'in_progress'
            ? 'In Progress'
            : rawStatus === 'scheduled'
            ? 'Scheduled'
            : 'Pending';
        break;

      case 'rejected':
      case 'suspended':
      case 'failed':
      case 'inactive':
      case 'cancelled':
      case 'deleted':
      case 'interrupted':
      case 'terminated':
      case 'revoked':
        colorClasses = 'text-rose-700 bg-rose-50/80 border-rose-200/60';
        dotColor = 'bg-rose-500';
        defaultLabel =
          rawStatus === 'rejected'
            ? 'Rejected'
            : rawStatus === 'failed'
            ? 'Failed'
            : rawStatus === 'interrupted'
            ? 'Interrupted'
            : rawStatus === 'terminated'
            ? 'Terminated'
            : rawStatus === 'revoked'
            ? 'Revoked'
            : 'Inactive';
        break;

      case 'archived':
        colorClasses = 'text-slate-700 bg-slate-100/90 border-slate-300';
        dotColor = 'bg-slate-400';
        defaultLabel = 'Archived';
        break;

      case 'admin':
        colorClasses = 'text-indigo-700 bg-indigo-50/80 border-indigo-200/60';
        dotColor = 'bg-indigo-500';
        defaultLabel = 'Admin';
        break;

      default:
        defaultLabel = textStatus;
        break;
    }
  }

  const finalLabel =
    typeof displayLabel === 'string'
      ? displayLabel
      : typeof defaultLabel === 'string'
      ? defaultLabel
      : String(defaultLabel || '');

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${colorClasses} ${className}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} flex-shrink-0`} />
      )}
      {finalLabel}
    </span>
  );
};

export default StatusBadge;
