import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/client';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Table } from '../../components/common/Table';
import { SearchBar } from '../../components/common/SearchBar';
import { StatCard } from '../../components/common/StatCard';
import {
  Download,
  Zap,
  CheckCircle,
  Eye,
  Percent,
  Trophy,
  Users,
  Award,
  BookOpen,
  BarChart2,
  Layers,
  Filter,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const Results = () => {
  const { toast } = useToast();
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [results, setResults] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [publication, setPublication] = useState({
    is_published: false,
    show_answers: false,
    show_explanations: false,
  });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [savingPublication, setSavingPublication] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchStudent, setSearchStudent] = useState('');

  // Candidate Inspection Modal
  const [inspectCandidate, setInspectCandidate] = useState(null);
  const [candidateDetail, setCandidateDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [inspectStreamFilter, setInspectStreamFilter] = useState('ALL');
  const [inspectStatusFilter, setInspectStatusFilter] = useState('ALL');

  // Dedicated Student Stream Breakdown Modal
  const [streamCandidate, setStreamCandidate] = useState(null);

  // Load available exams
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const list = await api.getExams();
        const validExams = Array.isArray(list) ? list : [];
        setExams(validExams);
        if (validExams.length > 0 && !selectedExamId) {
          setSelectedExamId(validExams[0].id);
        }
      } catch (err) {
        console.warn('Failed to load exams list:', err);
      }
    };
    fetchExams();
  }, [selectedExamId]);

  // Load results, publication, and analytics for selected exam
  const loadExamData = useCallback(async () => {
    if (!selectedExamId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [resList, anaData, pubData] = await Promise.all([
        api.getExamResults(selectedExamId).catch(() => []),
        api.getExamAnalytics(selectedExamId).catch(() => null),
        api.getPublicationStatus(selectedExamId).catch(() => ({
          is_published: false,
          show_answers: false,
          show_explanations: false,
        })),
      ]);

      setResults(Array.isArray(resList) ? resList : []);
      setAnalytics(anaData);
      setPublication(pubData);
    } catch (err) {
      console.error('Failed to load exam results data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedExamId]);

  useEffect(() => {
    loadExamData();
  }, [loadExamData]);

  const handleRecalculate = async () => {
    if (!selectedExamId) return;
    try {
      setActionLoading(true);
      const res = await api.triggerScoring(selectedExamId);
      toast.success(`Scoring complete: Evaluated ${res.scored_attempts} attempts.`);
      await loadExamData();
    } catch (err) {
      toast.error(err.message || 'Scoring calculation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSavePublication = async () => {
    if (!selectedExamId) return;
    try {
      setSavingPublication(true);
      const updated = await api.updatePublicationStatus(selectedExamId, {
        is_published: publication.is_published,
        show_answers: publication.show_answers,
        show_explanations: publication.show_explanations,
      });
      setPublication(updated);
      toast.success('Result publication settings updated successfully.');
    } catch (err) {
      toast.error(err.message || 'Failed to update publication settings');
    } finally {
      setSavingPublication(false);
    }
  };

  const handleExportCSV = async () => {
    if (!selectedExamId) return;
    try {
      setExporting(true);
      const currentExam = exams.find((e) => e.id === selectedExamId);
      await api.downloadExamResultsCSV(
        selectedExamId,
        currentExam?.title || 'exam'
      );
      toast.success('Results CSV exported successfully');
    } catch (err) {
      toast.error(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleInspectCandidate = async (candidate) => {
    setInspectCandidate(candidate);
    setInspectStreamFilter('ALL');
    setInspectStatusFilter('ALL');
    try {
      setLoadingDetail(true);
      const detail = await api.getCandidateResultDetails(
        selectedExamId,
        candidate.student_id
      );
      setCandidateDetail(detail);
    } catch (err) {
      toast.error(err.message || 'Failed to load candidate response details');
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredResults = results.filter((r) =>
    searchStudent
      ? (r.student_email || '')
          .toLowerCase()
          .includes(searchStudent.toLowerCase())
      : true
  );

  const selectedExam = exams.find((e) => e.id === selectedExamId);

  const columns = [
    {
      key: 'rank',
      header: 'Rank',
      width: '80px',
      render: (rank) => (
        <span
          className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold ${
            rank === 1
              ? 'bg-amber-100 text-amber-800 border border-amber-300'
              : rank === 2
              ? 'bg-slate-200 text-slate-800'
              : rank === 3
              ? 'bg-amber-50 text-amber-700'
              : 'text-slate-500'
          }`}
        >
          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
        </span>
      ),
    },
    {
      key: 'student_email',
      header: 'Candidate Email',
      render: (email) => (
        <span className="font-semibold text-slate-900 text-xs">
          {email || 'Candidate'}
        </span>
      ),
    },
    {
      key: 'total_obtained',
      header: 'Score',
      render: (score, row) => (
        <span className="text-xs">
          <strong className="text-slate-900 font-bold">{score}</strong> /{' '}
          <span className="text-slate-500">{row.total_marks}</span>
        </span>
      ),
    },
    {
      key: 'percentage',
      header: 'Percentage',
      render: (pct) => {
        const p = Number(pct) || 0;
        let color = 'text-rose-600';
        if (p >= 75) color = 'text-emerald-700 font-bold';
        else if (p >= 50) color = 'text-[#1f3b45] font-bold';
        else if (p >= 40) color = 'text-amber-700 font-bold';
        return <span className={`text-xs ${color}`}>{pct}%</span>;
      },
    },
    {
      key: 'passed',
      header: 'Status',
      width: '110px',
      render: (passed) => (
        <StatusBadge
          status={
            passed === true
              ? 'Active'
              : passed === false
              ? 'Failed'
              : 'Completed'
          }
          customLabel={
            passed === true ? 'Passed' : passed === false ? 'Failed' : 'Completed'
          }
        />
      ),
    },
    {
      key: 'breakdown',
      header: 'Breakdown & Streams',
      render: (_, row) => (
        <div className="space-y-1.5 py-1 min-w-[210px]">
          {/* Aggregate counts */}
          <div className="flex items-center gap-2 text-xs">
            <span
              className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60"
              title="Correct Questions"
            >
              <span>✓</span>
              <span>{row.correct_count}</span>
            </span>
            <span
              className="inline-flex items-center gap-1 font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/60"
              title="Incorrect Questions"
            >
              <span>✗</span>
              <span>{row.incorrect_count}</span>
            </span>
            <span
              className="inline-flex items-center gap-1 font-semibold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60"
              title="Unanswered Questions"
            >
              <span>—</span>
              <span>{row.unanswered_count}</span>
            </span>
          </div>

          {/* Stream-wise performance badges */}
          {row.stream_details && row.stream_details.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 max-w-sm pt-0.5">
              {row.stream_details.map((sd) => {
                const score = Number(sd.obtained_marks) || 0;
                const isPositive = score > 0;
                const isNegative = score < 0;
                return (
                  <button
                    key={sd.stream_id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStreamCandidate(row);
                    }}
                    title={`${sd.stream_name}: ${sd.obtained_marks}/${sd.total_marks} marks (✓${sd.correct_count} ✗${sd.incorrect_count} —${sd.unanswered_count}) • Click for subject breakdown`}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer hover:shadow-2xs ${
                      isPositive
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        : isNegative
                        ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-bold">{sd.stream_code || sd.stream_name}:</span>
                    <span>{isPositive ? `+${score}` : score}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="xs"
            onClick={() => setStreamCandidate(row)}
            icon={BarChart2}
          >
            Streams
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => handleInspectCandidate(row)}
            icon={Eye}
          >
            Inspect Paper
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scoring, Results &amp; Analytics"
        subtitle="Automated evaluation, score release gatekeeper, performance distribution, and CSV export"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalculate}
              isLoading={actionLoading}
              icon={Zap}
            >
              Recalculate Scores
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleExportCSV}
              isLoading={exporting}
              icon={Download}
            >
              Export CSV
            </Button>
          </>
        }
      />

      {/* Select Examination Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-slate-700">
            Active Assessment:
          </span>
          <select
            className="bg-white border border-slate-200 text-xs text-slate-800 rounded-lg py-1.5 px-3 focus:outline-none focus:border-[#1f3b45] font-semibold"
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
          >
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title} ({ex.status})
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-slate-500 font-medium self-end sm:self-auto">
          Pass Threshold:{' '}
          <strong className="text-slate-800">
            {selectedExam?.pass_percentage
              ? `${selectedExam.pass_percentage}%`
              : '40%'}
          </strong>
        </span>
      </div>

      {/* Gatekeeper Card matching LMS style */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-900">
                Score Release Gatekeeper
              </h4>
              <StatusBadge
                status={publication.is_published ? 'Published' : 'Draft'}
                customLabel={
                  publication.is_published
                    ? 'Released to Candidates'
                    : 'Confidential / Unreleased'
                }
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Candidates cannot view evaluation rankings or answer solutions until
              you authorize publication.
            </p>
          </div>

          <Button
            variant="emerald"
            size="xs"
            onClick={handleSavePublication}
            isLoading={savingPublication}
          >
            Save Gatekeeper Settings
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-1">
          <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={publication.is_published}
              onChange={(e) =>
                setPublication((prev) => ({
                  ...prev,
                  is_published: e.target.checked,
                }))
              }
              className="text-emerald-600 rounded"
            />
            <span>Publish Marks to Candidates</span>
          </label>

          <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={publication.show_answers}
              onChange={(e) =>
                setPublication((prev) => ({
                  ...prev,
                  show_answers: e.target.checked,
                }))
              }
              className="text-emerald-600 rounded"
            />
            <span>Release Correct Key Options</span>
          </label>

          <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={publication.show_explanations}
              onChange={(e) =>
                setPublication((prev) => ({
                  ...prev,
                  show_explanations: e.target.checked,
                }))
              }
              className="text-emerald-600 rounded"
            />
            <span>Release Solution Explanations</span>
          </label>
        </div>
      </div>

      {/* Analytics KPI Row using LMS StatCard */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Candidates Assessed"
            value={analytics.total_candidates}
            sub="Submitted answer papers"
            icon={Users}
          />
          <StatCard
            label="Class Average"
            value={analytics.average_score}
            sub={`Average: ${analytics.average_percentage}%`}
            icon={Percent}
          />
          <StatCard
            label="Highest Score"
            value={analytics.highest_score}
            sub={`Lowest: ${analytics.lowest_score}`}
            icon={Trophy}
            valueColor="text-emerald-700"
          />
          <StatCard
            label="Pass Rate"
            value={`${analytics.pass_rate}%`}
            sub={`Threshold: ${analytics.pass_percentage || 40}%`}
            icon={Award}
            valueColor="text-emerald-700"
          />
        </div>
      )}

      {/* Stream Performance Breakdown */}
      {analytics &&
        analytics.stream_averages &&
        analytics.stream_averages.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Subject Stream Performance
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {analytics.stream_averages.map((sa) => (
                <div
                  key={sa.stream_id}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">
                      {sa.stream_name}
                    </span>
                    <span className="font-extrabold text-emerald-700">
                      {sa.average_percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, sa.average_percentage)}%`,
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Average: {sa.average_score} / {sa.max_marks} marks
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Candidate Ranking Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Ranked Candidate Performance ({results.length})
          </h3>
          <div className="w-full sm:w-64">
            <SearchBar
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              placeholder="Search candidate email..."
              size="sm"
            />
          </div>
        </div>

        <Table
          columns={columns}
          data={filteredResults}
          loading={loading}
          emptyMessage="No submitted candidate results found for this examination."
        />
      </div>

      {/* Dedicated Candidate Stream Breakdown Modal */}
      <Modal
        isOpen={Boolean(streamCandidate)}
        onClose={() => setStreamCandidate(null)}
        title={`Stream Breakdown: ${streamCandidate?.student_email || 'Candidate'}`}
        subtitle="Subject-by-subject score breakdown, question accuracy, and negative marking impact"
        maxWidth="820px"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              icon={Eye}
              onClick={() => {
                const target = streamCandidate;
                setStreamCandidate(null);
                handleInspectCandidate(target);
              }}
            >
              Inspect Candidate Paper
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setStreamCandidate(null)}
            >
              Close Breakdown
            </Button>
          </div>
        }
      >
        {streamCandidate && (
          <div className="space-y-4">
            {/* Candidate Overview Header */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-center sm:text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Rank &amp; Candidate
                </p>
                <p className="text-sm font-black text-indigo-700 flex items-center justify-center sm:justify-start gap-1">
                  <span>#{streamCandidate.rank}</span>
                  <span className="text-xs font-semibold text-slate-700 truncate max-w-[120px]">
                    {streamCandidate.student_email}
                  </span>
                </p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Overall Score
                </p>
                <p className="text-base font-black text-slate-900">
                  {streamCandidate.total_obtained}{' '}
                  <span className="text-xs font-medium text-slate-400">
                    / {streamCandidate.total_marks}
                  </span>
                </p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Percentage &amp; Result
                </p>
                <p className="text-base font-black text-emerald-700 flex items-center justify-center sm:justify-start gap-1.5">
                  <span>{streamCandidate.percentage}%</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      streamCandidate.passed
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {streamCandidate.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Question Breakdown
                </p>
                <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-bold pt-0.5">
                  <span className="text-emerald-700" title="Correct">
                    ✓{streamCandidate.correct_count}
                  </span>
                  <span className="text-rose-600" title="Incorrect">
                    ✗{streamCandidate.incorrect_count}
                  </span>
                  <span className="text-slate-400" title="Unanswered">
                    —{streamCandidate.unanswered_count}
                  </span>
                </div>
              </div>
            </div>

            {/* Stream Performance Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Subject / Stream</th>
                      <th className="py-2.5 px-3 text-center">Marks Obtained</th>
                      <th className="py-2.5 px-3 text-center">Correct (✓)</th>
                      <th className="py-2.5 px-3 text-center">Incorrect (✗)</th>
                      <th className="py-2.5 px-3 text-center">Unanswered (—)</th>
                      <th className="py-2.5 px-3 text-right">Accuracy Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {streamCandidate.stream_details?.map((sd) => {
                      const totalQ =
                        sd.correct_count +
                        sd.incorrect_count +
                        sd.unanswered_count;
                      const attempted = sd.correct_count + sd.incorrect_count;
                      const accuracy =
                        attempted > 0
                          ? ((sd.correct_count / attempted) * 100).toFixed(1)
                          : null;
                      const streamPct =
                        sd.total_marks > 0
                          ? ((sd.obtained_marks / sd.total_marks) * 100).toFixed(1)
                          : '0.0';
                      const isPositive = sd.obtained_marks > 0;
                      const isNegative = sd.obtained_marks < 0;

                      return (
                        <tr
                          key={sd.stream_id}
                          className="hover:bg-slate-50/60 transition-colors"
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-[#1f3b45]/10 text-[#1f3b45] font-black text-[11px] border border-[#1f3b45]/20">
                                {sd.stream_code}
                              </span>
                              <div>
                                <p className="font-bold text-slate-800 text-xs">
                                  {sd.stream_name}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {totalQ} Questions ({sd.total_marks} Marks total)
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span
                                className={`font-black text-sm ${
                                  isPositive
                                    ? 'text-emerald-700'
                                    : isNegative
                                    ? 'text-rose-600'
                                    : 'text-slate-600'
                                }`}
                              >
                                {isPositive
                                  ? `+${sd.obtained_marks}`
                                  : sd.obtained_marks}{' '}
                                <span className="text-[11px] font-normal text-slate-400">
                                  / {sd.total_marks}
                                </span>
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                ({streamPct}%)
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {sd.correct_count}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              {sd.incorrect_count}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              {sd.unanswered_count}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            {accuracy !== null ? (
                              <div className="inline-flex flex-col items-end">
                                <span className="font-bold text-slate-800">
                                  {accuracy}%
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {sd.correct_count} of {attempted} attempted
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">
                                Unattempted
                              </span>
                            )}
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
      </Modal>

      {/* Candidate Paper Inspection Modal */}
      <Modal
        isOpen={Boolean(inspectCandidate)}
        onClose={() => {
          setInspectCandidate(null);
          setCandidateDetail(null);
        }}
        title={`Candidate Paper: ${inspectCandidate?.student_email || 'Student'}`}
        subtitle="Question-by-question response breakdown, subject performance, and scoring delta"
        maxWidth="780px"
        footer={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setInspectCandidate(null);
              setCandidateDetail(null);
            }}
          >
            Close Paper
          </Button>
        }
      >
        {loadingDetail ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Loading candidate response breakdown...
          </div>
        ) : candidateDetail ? (
          <div className="space-y-4">
            {/* Summary KPI header */}
            <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Rank
                </p>
                <p className="text-lg font-black text-indigo-700">
                  #{candidateDetail.rank}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Score
                </p>
                <p className="text-lg font-black text-slate-900">
                  {candidateDetail.total_obtained} /{' '}
                  {candidateDetail.total_marks}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Percentage
                </p>
                <p className="text-lg font-black text-emerald-700">
                  {candidateDetail.percentage}%
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Result
                </p>
                <p
                  className={`text-lg font-black ${
                    candidateDetail.passed ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {candidateDetail.passed ? 'PASSED' : 'FAILED'}
                </p>
              </div>
            </div>

            {/* Stream Performance Breakdown Grid inside Inspect Paper */}
            {candidateDetail.stream_details &&
              candidateDetail.stream_details.length > 0 && (
                <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers size={13} className="text-[#1f3b45]" />
                      <span>Stream-Wise Breakdown</span>
                    </p>
                    <span className="text-[10px] text-slate-400">
                      Click a stream to filter questions below
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {candidateDetail.stream_details.map((sd) => {
                      const score = Number(sd.obtained_marks) || 0;
                      const isPositive = score > 0;
                      const isNegative = score < 0;
                      const isSelected = inspectStreamFilter === sd.stream_name;

                      return (
                        <button
                          key={sd.stream_id}
                          type="button"
                          onClick={() =>
                            setInspectStreamFilter(
                              isSelected ? 'ALL' : sd.stream_name
                            )
                          }
                          className={`p-2 rounded-lg border text-left text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-white border-[#1f3b45] shadow-xs ring-2 ring-[#1f3b45]/20'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span
                              className="font-bold text-[11px] text-slate-800 truncate"
                              title={sd.stream_name}
                            >
                              {sd.stream_code || sd.stream_name}
                            </span>
                            <span
                              className={`font-black text-[11px] shrink-0 ${
                                isPositive
                                  ? 'text-emerald-700'
                                  : isNegative
                                  ? 'text-rose-600'
                                  : 'text-slate-600'
                              }`}
                            >
                              {isPositive ? `+${score}` : score}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                            <span className="text-emerald-700">✓{sd.correct_count}</span>
                            <span className="text-rose-600">✗{sd.incorrect_count}</span>
                            <span className="text-slate-400">—{sd.unanswered_count}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Filter Bar for Questions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                  Subject:
                </span>
                <button
                  type="button"
                  onClick={() => setInspectStreamFilter('ALL')}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                    inspectStreamFilter === 'ALL'
                      ? 'bg-[#1f3b45] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({candidateDetail.questions?.length || 0})
                </button>
                {candidateDetail.stream_details?.map((sd) => (
                  <button
                    key={sd.stream_id}
                    type="button"
                    onClick={() => setInspectStreamFilter(sd.stream_name)}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      inspectStreamFilter === sd.stream_name
                        ? 'bg-[#1f3b45] text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {sd.stream_code || sd.stream_name}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setInspectStatusFilter('ALL')}
                  className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                    inspectStatusFilter === 'ALL'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setInspectStatusFilter('CORRECT')}
                  className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                    inspectStatusFilter === 'CORRECT'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  ✓ Correct ({candidateDetail.correct_count})
                </button>
                <button
                  type="button"
                  onClick={() => setInspectStatusFilter('INCORRECT')}
                  className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                    inspectStatusFilter === 'INCORRECT'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                  }`}
                >
                  ✗ Wrong ({candidateDetail.incorrect_count})
                </button>
                <button
                  type="button"
                  onClick={() => setInspectStatusFilter('UNANSWERED')}
                  className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                    inspectStatusFilter === 'UNANSWERED'
                      ? 'bg-slate-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  — Skipped ({candidateDetail.unanswered_count})
                </button>
              </div>
            </div>

            {/* Questions review */}
            {(() => {
              const filteredQuestions = (
                candidateDetail.questions || []
              ).filter((q) => {
                if (
                  inspectStreamFilter !== 'ALL' &&
                  q.stream_name !== inspectStreamFilter
                ) {
                  return false;
                }
                if (inspectStatusFilter === 'CORRECT' && !q.is_correct) {
                  return false;
                }
                if (
                  inspectStatusFilter === 'INCORRECT' &&
                  (!q.selected_option_label || q.is_correct)
                ) {
                  return false;
                }
                if (
                  inspectStatusFilter === 'UNANSWERED' &&
                  q.selected_option_label
                ) {
                  return false;
                }
                return true;
              });

              if (filteredQuestions.length === 0) {
                return (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    No questions match the current filter selection ({inspectStreamFilter !== 'ALL' ? inspectStreamFilter : 'All Streams'}{inspectStatusFilter !== 'ALL' ? ` · ${inspectStatusFilter}` : ''}).
                  </div>
                );
              }

              return (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {filteredQuestions.map((q) => {
                    const isCorrect = q.is_correct;
                    const isUnanswered = !q.selected_option_label;

                    return (
                      <div
                        key={q.sequence_number}
                        className={`p-3.5 rounded-xl border space-y-2 text-xs ${
                          isCorrect
                            ? 'bg-emerald-50/30 border-emerald-200'
                            : isUnanswered
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-rose-50/30 border-rose-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">
                            Q{q.sequence_number}. [{q.stream_name}]
                          </span>
                          <span
                            className={`font-bold ${
                              isCorrect
                                ? 'text-emerald-700'
                                : isUnanswered
                                ? 'text-slate-500'
                                : 'text-rose-600'
                            }`}
                          >
                            {isCorrect
                              ? `+${q.marks} Marks`
                              : isUnanswered
                              ? '0 Marks'
                              : `-${q.negative_marks} Neg`}
                          </span>
                        </div>

                        <p className="font-medium text-slate-800">
                          {q.question_text}
                        </p>

                        <div className="space-y-1 pt-1 text-[11px]">
                          <div
                            className={`p-2 rounded-lg font-medium ${
                              isCorrect
                                ? 'bg-emerald-100/70 text-emerald-900'
                                : isUnanswered
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-rose-100/70 text-rose-900'
                            }`}
                          >
                            <strong>Candidate Choice:</strong>{' '}
                            {q.selected_option_label
                              ? `Option ${q.selected_option_label}: ${q.selected_option_text}`
                              : 'None (Unanswered)'}
                          </div>

                          {q.correct_option_label && (
                            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-900 font-medium border border-emerald-200">
                              <strong>Correct Key:</strong> Option{' '}
                              {q.correct_option_label}: {q.correct_option_text}
                            </div>
                          )}
                        </div>

                        {q.explanation && (
                          <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                            <strong>Explanation:</strong> {q.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default Results;
