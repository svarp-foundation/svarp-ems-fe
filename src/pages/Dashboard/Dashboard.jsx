import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import {
  Layers,
  CircleHelp,
  ClipboardList,
  Shield,
  ArrowRight,
  Timer,
  Trophy,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const Dashboard = () => {
  const { user } = useAuth();
  const [streamCount, setStreamCount] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [examCount, setExamCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [streams, questionsRes, examsRes] = await Promise.all([
          api.getStreams({ active_only: false }),
          api.getQuestions({ limit: 1 }).catch(() => ({ total: 0 })),
          api.getExams().catch(() => []),
        ]);
        const list = Array.isArray(streams) ? streams : streams.items || [];
        setStreamCount(list.length);
        setQuestionCount(questionsRes.total || 0);
        setExamCount(Array.isArray(examsRes) ? examsRes.length : 0);
      } catch (err) {
        console.warn('Could not fetch dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessment Control Center"
        subtitle={`System overview, student session telemetry, and examination evaluation engine. Signed in as ${
          user?.full_name || user?.email || 'Administrator'
        }.`}
      />

      {/* Stats Cards Grid matching LMS StatCard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white p-4 h-24 rounded-xl border border-slate-200 shadow-xs animate-pulse"
            />
          ))
        ) : (
          <>
            <StatCard
              label="Subject Streams"
              value={streamCount}
              sub="Configured subject categories"
              icon={Layers}
              to="/streams"
            />
            <StatCard
              label="Question Bank"
              value={questionCount}
              sub="Immutable versioned MCQs"
              icon={CircleHelp}
              to="/questions"
            />
            <StatCard
              label="Scheduled Exams"
              value={examCount}
              sub="Active examination papers"
              icon={ClipboardList}
              to="/exams"
            />
            <StatCard
              label="Session Lock"
              value="Enforced"
              sub="Single-session active"
              icon={Lock}
              to="/audit"
              valueColor="text-emerald-700"
            />
          </>
        )}
      </div>

      {/* Quick Operations Navigation Cards (matching LMS Dashboard quick links) */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Quick Operations &amp; Modules
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/streams"
            className="group bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-[#1f3b45] hover:shadow-sm transition-all flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 transition">
              <Layers size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Subject Streams
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                Configure branches &amp; modules
              </p>
            </div>
            <ArrowRight
              size={14}
              className="text-slate-300 group-hover:text-[#1f3b45] group-hover:translate-x-0.5 transition-all"
            />
          </Link>

          <Link
            to="/questions"
            className="group bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-[#1f3b45] hover:shadow-sm transition-all flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 text-[#1f3b45] flex items-center justify-center flex-shrink-0 group-hover:bg-slate-100 transition">
              <CircleHelp size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Question Bank
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                MCQ authoring, bulk CSV import
              </p>
            </div>
            <ArrowRight
              size={14}
              className="text-slate-300 group-hover:text-[#1f3b45] group-hover:translate-x-0.5 transition-all"
            />
          </Link>

          <Link
            to="/exams"
            className="group bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-[#1f3b45] hover:shadow-sm transition-all flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 text-[#1f3b45] flex items-center justify-center flex-shrink-0 group-hover:bg-slate-100 transition">
              <ClipboardList size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Exams &amp; Schedules
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                Randomized papers &amp; quota rules
              </p>
            </div>
            <ArrowRight
              size={14}
              className="text-slate-300 group-hover:text-[#1f3b45] group-hover:translate-x-0.5 transition-all"
            />
          </Link>

          <Link
            to="/attempts"
            className="group bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-[#1f3b45] hover:shadow-sm transition-all flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-100 transition">
              <Timer size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                Student Attempts
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                Live sessions &amp; proctoring
              </p>
            </div>
            <ArrowRight
              size={14}
              className="text-slate-300 group-hover:text-[#1f3b45] group-hover:translate-x-0.5 transition-all"
            />
          </Link>

          <Link
            to="/results"
            className="group bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-[#1f3b45] hover:shadow-sm transition-all flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 transition">
              <Trophy size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Results &amp; Analytics
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                Scoring, stream breakdown &amp; CSV
              </p>
            </div>
            <ArrowRight
              size={14}
              className="text-slate-300 group-hover:text-[#1f3b45] group-hover:translate-x-0.5 transition-all"
            />
          </Link>

          <Link
            to="/audit"
            className="group bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-[#1f3b45] hover:shadow-sm transition-all flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 text-[#1f3b45] flex items-center justify-center flex-shrink-0 group-hover:bg-slate-100 transition">
              <Shield size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Security &amp; Audit Hub
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                Append-only logs &amp; violation stream
              </p>
            </div>
            <ArrowRight
              size={14}
              className="text-slate-300 group-hover:text-[#1f3b45] group-hover:translate-x-0.5 transition-all"
            />
          </Link>
        </div>
      </div>

      {/* System Status / Phase Roadmap Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Examination Platform Status
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              High-integrity assessment architecture with single-session enforcement
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            All Phases Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              phase: 'Phase 01',
              title: 'Foundation & Auth',
              desc: 'Single session lock & subject streams',
            },
            {
              phase: 'Phase 02',
              title: 'Question Bank',
              desc: 'MCQ authoring & versioned revisions',
            },
            {
              phase: 'Phase 03',
              title: 'Exam Builder',
              desc: 'Quota allocations & paper generator',
            },
            {
              phase: 'Phase 04',
              title: 'Candidate Arena',
              desc: 'Proctoring, countdown timer & autosave',
            },
            {
              phase: 'Phase 05',
              title: 'Scoring Engine',
              desc: 'Deterministic evaluation & score release',
            },
            {
              phase: 'Phase 06',
              title: 'Security & Audit',
              desc: 'Immutable audit trail & violation logs',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-slate-50/70 border border-slate-100 flex items-start gap-2.5"
            >
              <CheckCircle2
                size={16}
                className="text-emerald-600 flex-shrink-0 mt-0.5"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">
                    {item.phase}
                  </span>
                  <span className="text-xs font-semibold text-slate-800">
                    {item.title}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
