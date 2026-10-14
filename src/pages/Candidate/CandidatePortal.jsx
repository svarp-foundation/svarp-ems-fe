import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Shield,
  Timer,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  LogOut,
  User,
  AlertTriangle,
  Play,
  RotateCw,
  Award,
  Layers,
  Eye,
  FileText,
  BookOpen,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';

export const CandidatePortal = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Candidate Scorecard & Stream Breakdown State
  const [selectedResultExam, setSelectedResultExam] = useState(null);
  const [candidateResult, setCandidateResult] = useState(null);
  const [loadingResult, setLoadingResult] = useState(false);

  const fetchExams = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAvailableExams();
      // Strictly show only exams that this candidate is actively enrolled in
      const enrolledOnly = (Array.isArray(data) ? data : []).filter(
        (e) => e.is_enrolled !== false
      );
      setExams(enrolledOnly);
    } catch (err) {
      setError(err.message || 'Failed to load available examinations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleViewResult = async (exam) => {
    try {
      setSelectedResultExam(exam);
      setCandidateResult(null);
      setLoadingResult(true);
      const res = await api.getMyResult(exam.id);
      setCandidateResult(res);
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('not been published')) {
        toast.info(
          'Results for this examination have not been published by the administration yet. Please check back later.'
        );
      } else {
        toast.error(err.message || 'Failed to fetch examination results');
      }
      setSelectedResultExam(null);
    } finally {
      setLoadingResult(false);
    }
  };

  const getExamTimingStatus = (exam) => {
    if (exam.is_enrolled === false) {
      return {
        label: 'Not Assigned',
        color: 'bg-rose-50 text-rose-700 border-rose-200',
        canEnter: false,
        actionText: 'Not Enrolled',
        isResume: false,
      };
    }

    const attemptState = String(exam.attempt_state || '').toLowerCase();
    if (attemptState === 'submitted' || attemptState === 'auto_submitted' || attemptState === 'evaluated') {
      const isPublished = Boolean(exam.is_result_published);
      return {
        label: isPublished ? 'Result Published' : 'Exam Submitted',
        color: isPublished ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-300',
        canEnter: false,
        actionText: isPublished ? 'View Result' : 'Results Pending',
        isResume: false,
        isSubmitted: true,
        isResultPublished: isPublished,
      };
    }

    const now = new Date().getTime();
    const start = exam.start_time ? new Date(exam.start_time).getTime() : 0;
    const end = exam.end_time ? new Date(exam.end_time).getTime() : Infinity;

    if (exam.has_active_attempt) {
      return {
        label: 'In Progress',
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        canEnter: true,
        actionText: 'Resume Exam',
        isResume: true,
      };
    }

    if (now < start) {
      return {
        label: 'Scheduled',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        canEnter: false,
        actionText: 'Opens Soon',
        isResume: false,
      };
    }

    if (now > end) {
      return {
        label: 'Closed',
        color: 'bg-slate-100 text-slate-600 border-slate-200',
        canEnter: false,
        actionText: 'Window Ended',
        isResume: false,
      };
    }

    // Check entry cutoff threshold for fresh attempts
    const cutoffMinutes = Number(exam.entry_cutoff_minutes) || 0;
    if (cutoffMinutes > 0) {
      const cutoffTime = start + cutoffMinutes * 60 * 1000;
      if (now > cutoffTime) {
        return {
          label: `Late Entry Locked (+${cutoffMinutes}m cutoff)`,
          color: 'bg-rose-50 text-rose-700 border-rose-200',
          canEnter: false,
          actionText: 'Entry Window Expired',
          isResume: false,
        };
      }
    }

    return {
      label: 'Active & Ready',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      canEnter: true,
      actionText: 'View Instructions & Start',
      isResume: false,
    };
  };

  const activeCount = exams.filter((e) => {
    const status = getExamTimingStatus(e);
    return status.canEnter;
  }).length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/company/svarp-logo.webp"
              alt="SVARP"
              className="h-8 w-auto object-contain"
              onError={(e) => {
                if (e.currentTarget.src.includes('svarp-logo.webp')) {
                  e.currentTarget.src = '/svarp-logo.png';
                }
              }}
            />
            <div className="flex flex-col">
              <span className="text-base font-black text-[#1f3b45] leading-none">
                SVARP
              </span>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mt-0.5">
                Candidate Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200">
              <Shield size={12} className="text-emerald-600" />
              <span>Session Secured</span>
            </div>

            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-[#1f3b45] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {user?.full_name ? user.full_name[0].toUpperCase() : 'C'}
              </div>
              <div className="hidden md:block leading-tight text-left">
                <p className="text-xs font-bold text-slate-800 truncate max-w-[150px]">
                  {user?.full_name || user?.email}
                </p>
                <p className="text-[10px] font-semibold text-emerald-600">Candidate</p>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Welcome & Overview Banner */}
        <div className="bg-gradient-to-r from-[#1f3b45] to-[#2a4e5b] rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="relative z-10 max-w-2xl space-y-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
              <Award size={12} />
              Enrolled Assessments
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Welcome, {user?.full_name || 'Candidate'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              Your registered examinations and evaluations are listed below. Ensure you are in a quiet environment before starting your paper.
            </p>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Enrolled Papers
            </p>
            <p className="text-2xl font-black text-slate-800 mt-1">{exams.length}</p>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Ready to Take
            </p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{activeCount}</p>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs col-span-2 sm:col-span-1">
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Integrity System
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-700">
              <Shield size={14} className="text-emerald-600" />
              <span>Full-screen &amp; Autosave</span>
            </div>
          </div>
        </div>

        {/* Examinations List Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">Your Examinations</h2>
            <p className="text-xs text-slate-500">
              Authorized papers available under candidate email: {user?.email}
            </p>
          </div>
          <button
            onClick={fetchExams}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RotateCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-xs">
            <AlertTriangle size={18} className="text-rose-600 shrink-0" />
            <div className="flex-1">
              <p className="font-bold">Error loading examinations</p>
              <p className="mt-0.5">{error}</p>
            </div>
            <button
              onClick={fetchExams}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold"
            >
              Retry
            </button>
          </div>
        )}

        {/* Exam Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 animate-pulse"
              >
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-6 bg-slate-200 rounded w-2/3" />
                <div className="h-10 bg-slate-100 rounded w-full" />
              </div>
            ))}
          </div>
        ) : exams.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Calendar size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              No Examinations Assigned Yet
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Your registered examinations will appear here once you are enrolled by an administrator. Please check back later or contact your assessment coordinator.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map((exam) => {
              const status = getExamTimingStatus(exam);
              return (
                <div
                  key={exam.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${status.color}`}
                      >
                        {status.label}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                        <Timer size={12} />
                        {exam.duration_minutes} Mins
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700">
                        {exam.title}
                      </h3>
                      {exam.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {exam.description}
                        </p>
                      )}
                    </div>

                    {/* Metadata Badges */}
                    <div className="p-3 bg-slate-50/80 border border-slate-100 rounded-xl space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Total Questions:</span>
                        <strong className="text-slate-800">
                          {exam.total_questions} Questions
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Marking Scheme:</span>
                        <strong className="text-slate-800">
                          +{exam.default_marks_per_question ?? 1} / -{exam.default_negative_marks ?? 0}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Window Closes:</span>
                        <strong className="text-slate-800">
                          {new Date(exam.end_time).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </strong>
                      </div>
                    </div>

                    {exam.instructions && (
                      <p className="text-[11px] text-slate-500 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                        Notice: {exam.instructions}
                      </p>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="pt-4 mt-4 border-t border-slate-100">
                    {status.isSubmitted ? (
                      status.isResultPublished ? (
                        <button
                          type="button"
                          onClick={() => handleViewResult(exam)}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-[#1f3b45] hover:bg-[#162a32] text-white shadow-xs cursor-pointer transition-all"
                        >
                          <Award size={14} />
                          <span>View Result &amp; Stream Breakdown</span>
                        </button>
                      ) : (
                        <div
                          className="w-full py-2.5 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-2 bg-slate-50 text-slate-500 border border-slate-200"
                          title="Results for this examination have not been published by the administration yet."
                        >
                          <Clock size={13} className="text-amber-500 flex-shrink-0" />
                          <span>Results Awaiting Admin Publication</span>
                        </div>
                      )
                    ) : (
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            if (status.isResume) {
                              navigate(`/arena/${exam.id}`);
                            } else {
                              navigate(`/instructions/${exam.id}`);
                            }
                          }}
                          disabled={!status.canEnter}
                          className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            status.canEnter
                              ? status.isResume
                                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {status.isResume ? (
                            <Play size={14} className="fill-current" />
                          ) : (
                            <ArrowRight size={14} />
                          )}
                          <span>{status.actionText}</span>
                        </button>

                        {status.canEnter && (
                          <div className="flex items-center justify-center pt-0.5">
                            <button
                              type="button"
                              onClick={() => navigate(`/instructions/${exam.id}`)}
                              className="text-[11px] font-semibold text-slate-500 hover:text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <FileText size={12} />
                              <span>
                                {status.isResume
                                  ? 'Review Exam Instructions'
                                  : 'Preview Full Instructions'}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Examination Integrity Guidelines */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 text-xs text-slate-600 space-y-2">
          <p className="font-bold text-slate-800 flex items-center gap-1.5">
            <Shield size={14} className="text-emerald-600" />
            <span>Important Candidate Guidelines</span>
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-500 text-[11px]">
            <li>Examination sessions enforce single-session concurrency: signing in from another browser will revoke the active session.</li>
            <li>Once you enter the Exam Arena, full-screen mode and tab switching proctoring telemetry are active.</li>
            <li>Your answers are continuously synchronized and saved to the examination server automatically.</li>
          </ul>
        </div>
      </main>

      {/* Candidate Scorecard & Stream Breakdown Modal */}
      <Modal
        isOpen={Boolean(selectedResultExam)}
        onClose={() => {
          setSelectedResultExam(null);
          setCandidateResult(null);
        }}
        title={`Exam Scorecard: ${selectedResultExam?.title || 'Examination'}`}
        subtitle="Evaluation result, rank, and subject stream performance breakdown"
        maxWidth="760px"
        footer={
          <button
            type="button"
            onClick={() => {
              setSelectedResultExam(null);
              setCandidateResult(null);
            }}
            className="px-4 py-2 rounded-xl bg-[#1f3b45] text-white text-xs font-bold hover:bg-[#162a32] cursor-pointer transition-all"
          >
            Close Scorecard
          </button>
        }
      >
        {loadingResult ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Loading your examination scorecard and stream breakdown...
          </div>
        ) : candidateResult ? (
          <div className="space-y-4">
            {/* Header KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Rank
                </p>
                <p className="text-base font-black text-indigo-700">
                  {candidateResult.rank ? `#${candidateResult.rank}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Score
                </p>
                <p className="text-base font-black text-slate-900">
                  {candidateResult.total_obtained} / {candidateResult.total_marks}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Percentage
                </p>
                <p className="text-base font-black text-emerald-700">
                  {candidateResult.percentage}%
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Status
                </p>
                <p
                  className={`text-base font-black ${
                    candidateResult.passed ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {candidateResult.passed ? 'PASSED' : 'FAILED'}
                </p>
              </div>
            </div>

            {/* Stream Performance Breakdown */}
            {candidateResult.stream_details &&
              candidateResult.stream_details.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers size={13} className="text-[#1f3b45]" />
                    <span>Subject Stream Breakdown</span>
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Subject / Stream</th>
                            <th className="py-2.5 px-3 text-center">Score</th>
                            <th className="py-2.5 px-3 text-center">Correct (✓)</th>
                            <th className="py-2.5 px-3 text-center">Incorrect (✗)</th>
                            <th className="py-2.5 px-3 text-center">Unanswered (—)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {candidateResult.stream_details.map((sd) => {
                            const isPositive = sd.obtained_marks > 0;
                            const isNegative = sd.obtained_marks < 0;
                            return (
                              <tr key={sd.stream_id} className="hover:bg-slate-50/60">
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-[#1f3b45]/10 text-[#1f3b45] font-black text-[11px] border border-[#1f3b45]/20">
                                      {sd.stream_code}
                                    </span>
                                    <div>
                                      <p className="font-bold text-slate-800 text-xs">
                                        {sd.stream_name}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span
                                    className={`font-black text-xs ${
                                      isPositive
                                        ? 'text-emerald-700'
                                        : isNegative
                                        ? 'text-rose-600'
                                        : 'text-slate-600'
                                    }`}
                                  >
                                    {isPositive ? `+${sd.obtained_marks}` : sd.obtained_marks}{' '}
                                    <span className="text-[10px] font-normal text-slate-400">
                                      / {sd.total_marks}
                                    </span>
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {sd.correct_count}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    {sd.incorrect_count}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                    {sd.unanswered_count}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
