import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Shield,
  ShieldAlert,
  Clock,
  Timer,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Award,
  Maximize,
  Monitor,
  Wifi,
  Eye,
  Layers,
  Lock,
  FileText,
  CheckSquare,
  Square,
  Info,
  Sparkles,
  HelpCircle,
  RotateCw,
  LogOut,
} from 'lucide-react';

export const ExamInstructions = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [entering, setEntering] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (totalSeconds) => {
    if (totalSeconds <= 0) return '00:00';
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const startTime = exam?.start_time ? new Date(exam.start_time).getTime() : 0;
  const isStarted = !startTime || currentTime >= startTime || Boolean(exam?.has_active_attempt);
  const secondsUntilStart = Math.max(0, Math.floor((startTime - currentTime) / 1000));

  const fetchInstructions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getExamInstructions(examId);
      setExam(data);
    } catch (err) {
      console.error('Failed to load exam instructions:', err);
      setError(err.message || 'Unable to retrieve examination instructions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (examId) {
      fetchInstructions();
    }
  }, [examId]);

  const handleStartExam = async () => {
    if (!agreed) {
      toast.warning('Please confirm the declaration checkbox before proceeding.');
      return;
    }
    if (!isStarted) {
      toast.info(`Assessment has not started yet. Starts in ${formatCountdown(secondsUntilStart)}.`);
      return;
    }

    setEntering(true);
    try {
      // Request fullscreen before entering arena
      if (!document.fullscreenElement) {
        try {
          await document.documentElement.requestFullscreen();
        } catch (fsErr) {
          console.warn('Fullscreen request bypassed or blocked by browser:', fsErr);
        }
      }
      navigate(`/arena/${examId}`);
    } catch (err) {
      toast.error('Could not launch exam arena: ' + err.message);
      setEntering(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 border-4 border-[#1f3b45] border-t-emerald-500 rounded-full animate-spin" />
        <div className="text-center space-y-1">
          <p className="text-base font-bold text-slate-800">Preparing Examination Paper...</p>
          <p className="text-xs text-slate-500">Loading instructions, marking rules, and section breakdown</p>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-lg text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Unable to Load Instructions</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {error || 'This examination could not be verified or you might not be enrolled.'}
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => navigate('/candidate')}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Back to Portal
            </button>
            <button
              onClick={fetchInstructions}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#1f3b45] text-xs font-bold text-white hover:bg-[#162a32] cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isResume = Boolean(exam.has_active_attempt);
  const streams = exam.streams || [];
  const defaultMarks = exam.default_marks_per_question ?? 1.0;
  const defaultNeg = exam.default_negative_marks ?? 0.0;
  const passPercent = exam.pass_percentage;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans pb-16">
      {/* Top Navigation Bar */}
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
                Assessment Readiness Center
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate('/candidate')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </button>

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

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Pre-Start Countdown & Readiness Banner */}
        {!isStarted && (
          <div className="p-4 sm:p-5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                <Clock size={22} className="animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-blue-900">
                  Assessment Scheduled — Advance Reading Mode
                </p>
                <p className="text-xs text-blue-700/90 leading-relaxed">
                  You are viewing pre-exam instructions in advance. The arena launch button will automatically activate once the countdown reaches zero.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-white px-3.5 py-2 rounded-xl border border-blue-200 shadow-2xs self-stretch sm:self-auto justify-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Unlocks In:</span>
              <span className="font-mono text-base font-extrabold text-blue-800">
                {formatCountdown(secondsUntilStart)}
              </span>
            </div>
          </div>
        )}

        {/* Banner with Exam Summary */}
        <div className="bg-gradient-to-r from-[#1f3b45] via-[#244652] to-[#2a4e5b] rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="relative z-10 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                <Award size={12} />
                Official Examination
              </span>
              {isResume && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/30 animate-pulse">
                  <RotateCw size={12} />
                  Attempt In Progress
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white">
              {exam.title}
            </h1>

            {exam.description && (
              <p className="text-xs sm:text-sm text-slate-200 max-w-3xl leading-relaxed">
                {exam.description}
              </p>
            )}

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-300 flex items-center gap-1">
                  <Timer size={12} className="text-emerald-300" />
                  Duration
                </p>
                <p className="text-lg font-black text-white mt-0.5">
                  {exam.duration_minutes} Mins
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-300 flex items-center gap-1">
                  <BookOpen size={12} className="text-emerald-300" />
                  Total Questions
                </p>
                <p className="text-lg font-black text-white mt-0.5">
                  {exam.total_questions} Qs
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-300 flex items-center gap-1">
                  <Award size={12} className="text-emerald-300" />
                  Maximum Marks
                </p>
                <p className="text-lg font-black text-white mt-0.5">
                  {exam.total_marks} Marks
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-300 flex items-center gap-1">
                  <Shield size={12} className="text-emerald-300" />
                  Negative Marking
                </p>
                <p className="text-lg font-black text-white mt-0.5">
                  {defaultNeg > 0 ? `-${defaultNeg} Marks` : 'No Penalty'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Administration Custom Notice (If any) */}
        {exam.instructions && (
          <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-amber-900 shadow-xs">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0 mt-0.5">
              <Info size={18} />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Special Administration Notice
              </h3>
              <p className="text-xs sm:text-sm text-amber-900 whitespace-pre-line leading-relaxed">
                {exam.instructions}
              </p>
            </div>
          </div>
        )}

        {/* Section 1: Schedule & Timing Rules */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Clock size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                1. Examination Schedule &amp; Timing Rules
              </h2>
              <p className="text-[11px] text-slate-500">
                Important constraints regarding time limits, server clock sync, and late cutoff
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Window Opens
              </span>
              <p className="text-xs font-bold text-slate-800">
                {new Date(exam.start_time).toLocaleString([], {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Window Closes
              </span>
              <p className="text-xs font-bold text-slate-800">
                {new Date(exam.end_time).toLocaleString([], {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Late Entry Window
              </span>
              <p className="text-xs font-bold text-slate-800">
                {exam.entry_cutoff_minutes > 0
                  ? `Strict +${exam.entry_cutoff_minutes} Minutes`
                  : 'Allowed within window'}
              </p>
            </div>
          </div>

          <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside bg-slate-50/50 p-4 rounded-xl border border-slate-100 leading-relaxed">
            <li>
              <strong>Server-Synchronized Timer:</strong> The countdown clock on the top right of your screen displays the remaining time. Timer ticks are continuously synchronized with the central examination server.
            </li>
            <li>
              <strong>Automatic Submission:</strong> When the countdown timer reaches <strong>00:00:00</strong>, the examination will automatically finish and submit all your saved responses. You will not receive extra time.
            </li>
            <li>
              <strong>Candidate Deadline:</strong> Your individual deadline is strictly bounded by either your allotted duration ({exam.duration_minutes} mins) or the scheduled window closing time, whichever is earlier.
            </li>
          </ul>
        </div>

        {/* Section 2: Stream / Subject Breakdown & Marking Scheme */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Layers size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                2. Subject Sections &amp; Marking Scheme
              </h2>
              <p className="text-[11px] text-slate-500">
                Review the question allocation and scoring policy for this paper
              </p>
            </div>
          </div>

          {streams.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Subject Stream / Section</th>
                    <th className="py-2.5 px-4 text-center">Questions</th>
                    <th className="py-2.5 px-4 text-center">Marks / Correct</th>
                    <th className="py-2.5 px-4 text-center">Negative Marks</th>
                    <th className="py-2.5 px-4 text-right">Total Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {streams.map((st) => (
                    <tr key={st.stream_id || st.code} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-bold text-slate-900">
                        {st.name}{' '}
                        <span className="text-[10px] font-normal text-slate-400">
                          ({st.code})
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center font-semibold">
                        {st.question_count}
                      </td>
                      <td className="py-2.5 px-4 text-center font-semibold text-emerald-700">
                        +{st.marks_per_question}
                      </td>
                      <td className="py-2.5 px-4 text-center font-semibold text-rose-600">
                        {st.negative_marks > 0 ? `-${st.negative_marks}` : '0.0'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-black text-slate-900">
                        {(st.question_count * st.marks_per_question).toFixed(1)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50/80 font-black text-slate-900">
                    <td className="py-2.5 px-4">Total Paper Weightage</td>
                    <td className="py-2.5 px-4 text-center">{exam.total_questions}</td>
                    <td className="py-2.5 px-4 text-center text-slate-400">-</td>
                    <td className="py-2.5 px-4 text-center text-slate-400">-</td>
                    <td className="py-2.5 px-4 text-right text-emerald-700">
                      {exam.total_marks} Marks
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-emerald-900">
                <p className="text-[10px] uppercase font-bold text-emerald-700">Correct Answer</p>
                <p className="text-base font-black mt-0.5">+{defaultMarks} Mark(s)</p>
              </div>
              <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/60 text-rose-900">
                <p className="text-[10px] uppercase font-bold text-rose-700">Incorrect Answer</p>
                <p className="text-base font-black mt-0.5">
                  {defaultNeg > 0 ? `-${defaultNeg} Mark(s)` : '0 Penalty'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                <p className="text-[10px] uppercase font-bold text-slate-500">Unanswered</p>
                <p className="text-base font-black mt-0.5">0 Marks</p>
              </div>
            </div>
          )}

          {passPercent !== null && passPercent !== undefined && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
              <Award size={16} className="text-emerald-600 shrink-0" />
              <span>
                Minimum Qualifying / Passing Benchmark: <strong>{passPercent}%</strong>
              </span>
            </div>
          )}
        </div>

        {/* Section 3: Question Palette Legend & Colors */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Eye size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                3. Question Palette Symbol Guide
              </h2>
              <p className="text-[11px] text-slate-500">
                The question palette on the right side of the arena indicates question statuses with the following color codes:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Green - Answered */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
              <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                01
              </span>
              <div>
                <p className="text-xs font-bold text-emerald-900">Answered</p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  You have selected an option for this question. It will be evaluated.
                </p>
              </div>
            </div>

            {/* Red - Not Answered */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-50/50 border border-rose-100">
              <span className="w-7 h-7 rounded-lg bg-rose-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                02
              </span>
              <div>
                <p className="text-xs font-bold text-rose-900">Not Answered</p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  You have viewed this question but haven&apos;t chosen an answer yet.
                </p>
              </div>
            </div>

            {/* Purple - Marked for Review */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-purple-50/50 border border-purple-100">
              <span className="w-7 h-7 rounded-lg bg-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                03
              </span>
              <div>
                <p className="text-xs font-bold text-purple-900">Marked for Review</p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  You have flagged this question to revisit later without answering.
                </p>
              </div>
            </div>

            {/* Purple with Green Dot - Answered & Marked for Review */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-purple-50/50 border border-purple-100">
              <span className="w-7 h-7 rounded-lg bg-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs relative">
                04
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
              </span>
              <div>
                <p className="text-xs font-bold text-purple-900">
                  Answered &amp; Marked for Review
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  You answered this question AND flagged it. <em>It will be evaluated for final scoring.</em>
                </p>
              </div>
            </div>

            {/* Grey - Not Visited */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 sm:col-span-2">
              <span className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                05
              </span>
              <div>
                <p className="text-xs font-bold text-slate-800">Not Visited</p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  You have not navigated to or viewed this question yet in this attempt.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Proctoring & Integrity Policies */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <ShieldAlert size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                4. Proctoring, Security &amp; Anti-Cheating Protocol
              </h2>
              <p className="text-[11px] text-slate-500">
                Strict automated monitoring is active throughout your examination attempt
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs text-slate-700">
            <div className="p-4 rounded-xl bg-rose-50/40 border border-rose-100 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-rose-900">
                <Maximize size={15} className="text-rose-600" />
                <span>Mandatory Fullscreen Enforcement</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                The exam arena operates exclusively in fullscreen mode. Any attempt to exit fullscreen, resize the browser, or minimize the window will <strong>instantly lock your exam on the 1st occurrence</strong>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-100 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <Lock size={15} className="text-amber-600" />
                <span>Strict Tab-Switch Lockout</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Switching browser tabs, opening developer console, or clicking away to other desktop applications will <strong>instantly lock your exam on the 1st violation</strong>. Unlocking requires proctor/admin review with written justification.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-100 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-blue-900">
                <Wifi size={15} className="text-blue-600" />
                <span>Real-Time Autosave Guarantee</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Every option you click is immediately queued and debounced to our cloud backend. Even in the event of an accidental page reload or temporary internet flicker, your selected responses remain safely stored.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-100 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span>Single Concurrent Session</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                You can only have one active exam session at any time. Opening the exam on a second browser or device will revoke access from the earlier session.
              </p>
            </div>
          </div>
        </div>

        {/* Section 5: System Readiness Pre-Flight Check */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <Monitor size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                5. System &amp; Hardware Readiness Check
              </h2>
              <p className="text-[11px] text-slate-500">
                Please verify that your hardware and test setup satisfy the prerequisites:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-slate-800">Browser Supported</p>
                <p className="text-[10px] text-slate-500">Chrome / Edge / Firefox</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-slate-800">Network Active</p>
                <p className="text-[10px] text-slate-500">Continuous internet</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-slate-800">Power / Battery</p>
                <p className="text-[10px] text-slate-500">Plugged into charger</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-slate-800">Environment</p>
                <p className="text-[10px] text-slate-500">Quiet &amp; well-lit space</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Candidate Declaration & Agreement */}
        <div className="bg-gradient-to-br from-slate-900 to-[#1f3b45] text-white rounded-2xl p-6 sm:p-7 shadow-md space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold border border-emerald-500/30">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Candidate Declaration &amp; Honor Code
              </h2>
              <p className="text-[11px] text-slate-300">
                You must accept the terms before entering the proctored examination arena
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200 leading-relaxed space-y-2">
            <p>
              I, <strong>{user?.full_name || user?.email}</strong>, confirm that I am the authorized candidate enrolled for this assessment. I declare that I have thoroughly read, understood, and agreed to abide by all the instructions, negative marking policies, proctoring security rules, and tab-switch integrity constraints set forth above.
            </p>
            <p className="text-[11px] text-slate-300 italic">
              I agree not to use unauthorized study materials, search engines, AI assistants, secondary screens, or communicate with any person during this examination.
            </p>
          </div>

          <label
            htmlFor="exam-agreement-check"
            className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/15 cursor-pointer transition-colors"
          >
            <input
              id="exam-agreement-check"
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
            <span className="text-xs font-semibold text-emerald-200 select-none">
              I have read and understood all instructions, timing limits, and integrity guidelines. I am ready to start my examination.
            </span>
          </label>
        </div>

        {/* Action Button Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/candidate')}
            className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowLeft size={14} />
            <span>Return to Candidate Portal</span>
          </button>

          <button
            type="button"
            onClick={handleStartExam}
            disabled={!agreed || entering || !isStarted}
            className={`w-full sm:w-auto px-8 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer ${
              agreed && !entering && isStarted
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/20 hover:scale-[1.01]'
                : !isStarted
                  ? 'bg-blue-50 text-blue-800 border border-blue-200 cursor-not-allowed shadow-none'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            {entering ? (
              <>
                <RotateCw size={15} className="animate-spin" />
                <span>Entering Arena...</span>
              </>
            ) : !isStarted ? (
              <>
                <Clock size={15} className="animate-pulse text-blue-600" />
                <span>Starts in {formatCountdown(secondsUntilStart)}</span>
              </>
            ) : (
              <>
                <span>{isResume ? 'Resume Examination Arena' : 'Enter Examination Arena'}</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
};
