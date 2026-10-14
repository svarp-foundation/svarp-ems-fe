import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../api/client';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  RefreshCw,
  Lock,
  Unlock,
  AlertTriangle,
  Clock,
  CheckCircle,
  X,
  Mail,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const Attempts = () => {
  const { toast } = useToast();
  const [attempts, setAttempts] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [lockedOnly, setLockedOnly] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Resumption approval modal / state
  const [approvingAttempt, setApprovingAttempt] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const refreshIntervalRef = useRef(null);

  const fetchAttempts = useCallback(async () => {
    try {
      setError(null);
      const params = {};
      if (selectedExamId) params.exam_id = selectedExamId;
      if (lockedOnly) params.locked_only = true;

      const data = await api.getAdminAttempts(params);
      setAttempts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load exam attempts');
    } finally {
      setLoading(false);
    }
  }, [selectedExamId, lockedOnly]);

  useEffect(() => {
    const loadExams = async () => {
      try {
        const examList = await api.getExams();
        setExams(Array.isArray(examList) ? examList : []);
      } catch (e) {
        console.warn('Failed to load exams list:', e);
      }
    };
    loadExams();
    fetchAttempts();
  }, [fetchAttempts]);

  useEffect(() => {
    if (!autoRefresh) {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      return;
    }

    refreshIntervalRef.current = setInterval(() => {
      fetchAttempts();
    }, 10000);

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [autoRefresh, fetchAttempts]);

  const handleApproveResumption = async () => {
    if (!approvingAttempt) return;
    try {
      setActionLoading(true);
      await api.approveResumption(approvingAttempt.attempt_id);
      const msg = `Resumption successfully approved for ${
        approvingAttempt.student_email || 'candidate'
      }. Original deadline remains intact.`;
      setSuccessMessage(msg);
      toast.success(msg);
      setApprovingAttempt(null);
      await fetchAttempts();
    } catch (err) {
      toast.error(err.message || 'Failed to approve resumption');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const lockedAttemptsCount = attempts.filter(
    (a) => a.is_locked || a.state === 'INTERRUPTED'
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Exam Attempts &amp; Resumption"
        subtitle="Live proctoring telemetry, focus loss / fullscreen lock events, and proctor resumption approval"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAttempts}
            isLoading={loading}
            icon={RefreshCw}
          >
            Refresh Telemetry
          </Button>
        }
      />

      {/* Success Banner */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
          <span className="font-medium">✓ {successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle size={16} className="text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">
              Exam:
            </span>
            <select
              className="bg-white border border-slate-200 text-xs text-slate-800 rounded-lg py-1.5 px-3 focus:outline-none focus:border-[#1f3b45]"
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
            >
              <option value="">All Examinations</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={lockedOnly}
              onChange={(e) => setLockedOnly(e.target.checked)}
              className="text-emerald-600 rounded"
            />
            <span>Show Locked &amp; Interrupted Only ({lockedAttemptsCount})</span>
          </label>
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-600 font-medium cursor-pointer self-end sm:self-auto">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="text-emerald-600 rounded"
          />
          <span className="flex items-center gap-1.5">
            <span className={`pulse-dot ${autoRefresh ? '' : 'opacity-40'}`} />
            Auto-refresh (10s)
          </span>
        </label>
      </div>

      {/* Attempts Grid of Cards matching LMS Card Style */}
      {attempts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 mx-auto flex items-center justify-center mb-2">
            <Clock size={20} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            No Candidate Attempts Found
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {lockedOnly
              ? 'No candidate attempts are currently in locked or interrupted state.'
              : 'No candidates have active or submitted attempts for the selected filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {attempts.map((att) => {
            const isLocked = att.is_locked || att.state === 'INTERRUPTED';
            const progressPercent =
              att.total_questions > 0
                ? Math.round((att.answered_count / att.total_questions) * 100)
                : 0;

            return (
              <div
                key={att.attempt_id}
                className={`bg-white rounded-xl p-4 border transition-all shadow-xs flex flex-col justify-between ${
                  isLocked
                    ? 'border-rose-200 bg-rose-50/20'
                    : 'border-slate-200/90'
                }`}
              >
                <div>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-slate-900 truncate">
                        {att.student_email || 'Candidate'}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {att.exam_title}
                      </p>
                    </div>

                    <StatusBadge
                      status={
                        att.state === 'IN_PROGRESS'
                          ? 'Active'
                          : att.state === 'INTERRUPTED'
                          ? 'Interrupted'
                          : att.state === 'COMPLETED'
                          ? 'Completed'
                          : att.state
                      }
                    />
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span>
                        Answered: {att.answered_count} / {att.total_questions}
                      </span>
                      <span className="font-bold">{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Timing info */}
                  <div className="text-[11px] text-slate-500 space-y-0.5 pb-2">
                    <p>Started: {formatDateTime(att.start_time)}</p>
                    <p>Deadline: {formatDateTime(att.deadline)}</p>
                  </div>

                  {/* Interruption Notice */}
                  {isLocked && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] mb-2 space-y-1">
                      <div className="flex items-center gap-1 font-bold">
                        <Lock size={12} className="text-rose-600" />
                        <span>Security Lockout Triggered</span>
                      </div>
                      <p className="text-[10px] leading-relaxed">
                        {att.lock_reason ||
                          'Focus loss or fullscreen exit triggered proctor lock.'}
                      </p>
                    </div>
                  )}

                  {/* Resumption Request */}
                  {att.pending_resume_reason && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] mb-2 space-y-0.5">
                      <div className="flex items-center gap-1 font-bold">
                        <Mail size={12} className="text-amber-700" />
                        <span>Candidate Request:</span>
                      </div>
                      <p className="text-[10px] italic">
                        "{att.pending_resume_reason}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer action */}
                {isLocked && (
                  <div className="pt-3 border-t border-slate-100">
                    <Button
                      variant="emerald"
                      size="xs"
                      className="w-full"
                      onClick={() => setApprovingAttempt(att)}
                      icon={Unlock}
                    >
                      Approve Resumption
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Approve Resumption Modal */}
      <Modal
        isOpen={Boolean(approvingAttempt)}
        onClose={() => setApprovingAttempt(null)}
        title="Approve Candidate Resumption"
        subtitle="Unlocks candidate access while preserving exact original deadline invariant"
        maxWidth="500px"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setApprovingAttempt(null)}
            >
              Cancel
            </Button>
            <Button
              variant="emerald"
              size="sm"
              onClick={handleApproveResumption}
              isLoading={actionLoading}
            >
              Approve &amp; Unlock Paper
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-700">
            Confirm approval of resumption for candidate{' '}
            <strong className="text-slate-900">
              {approvingAttempt?.student_email}
            </strong>
            ?
          </p>

          <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl text-xs space-y-1">
            <p className="font-bold">Timing Invariant Guarantee</p>
            <p className="text-[11px] text-indigo-800 leading-relaxed">
              The candidate's original examination deadline (
              <strong>{formatDateTime(approvingAttempt?.deadline)}</strong>)
              remains unaltered. Resumption restores active paper access without
              granting unearned extra time.
            </p>
          </div>

          {approvingAttempt?.pending_resume_reason && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500">
                Reason given by student:
              </span>
              <p className="text-slate-800 italic">
                "{approvingAttempt.pending_resume_reason}"
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Attempts;
