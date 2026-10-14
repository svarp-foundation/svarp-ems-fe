import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Table } from '../../components/common/Table';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { SearchBar } from '../../components/common/SearchBar';
import {
  Plus,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  Play,
  Eye,
  Trash2,
  Clock,
  Shuffle,
  Percent,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const Exams = () => {
  const { toast, confirm } = useToast();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [streams, setStreams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Create Exam Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    entry_cutoff_minutes: 15,
    duration_minutes: 60,
    default_marks_per_question: 1.0,
    default_negative_marks: 0.25,
    shuffle_questions: true,
    shuffle_options: true,
    pass_percentage: 40.0,
    instructions: '',
    exam_streams: [],
  });

  // Quota Validation Modal
  const [isValidatingModalOpen, setIsValidatingModalOpen] = useState(false);
  const [validatingExam, setValidatingExam] = useState(null);
  const [validationReport, setValidationReport] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  // Candidate Enrollment Modal
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollingExam, setEnrollingExam] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [studentEmail, setStudentEmail] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Simulated Paper Preview Modal
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Load streams
  useEffect(() => {
    const loadStreams = async () => {
      try {
        const data = await api.getStreams({ active_only: true });
        setStreams(Array.isArray(data) ? data : data.items || []);
      } catch (err) {
        console.error('Failed to load streams:', err);
      }
    };
    loadStreams();
  }, []);

  // Fetch Exams
  const fetchExams = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const list = await api.getExams(params);
      setExams(list || []);
    } catch (err) {
      console.error('Failed to load exams:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const formatLocalDateTime = (date) => {
    const pad = (n) => String(n).padStart(2, '0');
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    return `${y}-${m}-${d}T${hh}:${mm}`;
  };

  // Calculate difficulty quota breakdown (Easy, Medium, Hard counts) from a question count and % split
  const calculateDifficultyQuotas = (count, easyPct = 40, medPct = 40, hardPct = 20) => {
    const total = Math.max(0, Number(count) || 0);
    if (total === 0) {
      return [
        { difficulty: 'easy', quota_count: 0 },
        { difficulty: 'medium', quota_count: 0 },
        { difficulty: 'hard', quota_count: 0 },
      ];
    }
    const sumPct = (Number(easyPct) || 0) + (Number(medPct) || 0) + (Number(hardPct) || 0) || 100;
    const easy = Math.round(((Number(easyPct) || 0) / sumPct) * total);
    const med = Math.round(((Number(medPct) || 0) / sumPct) * total);
    const hard = Math.max(0, total - easy - med);
    return [
      { difficulty: 'easy', quota_count: easy },
      { difficulty: 'medium', quota_count: med },
      { difficulty: 'hard', quota_count: hard },
    ];
  };

  // Rebalance streams across total_questions and percentages
  const rebalanceStreamsAcrossTotal = (streamsList, totalQuestions, easyPct = 40, medPct = 40, hardPct = 20) => {
    const numStreams = streamsList.length;
    if (numStreams === 0) return [];
    const total = Math.max(numStreams, Number(totalQuestions) || numStreams);
    const basePerStream = Math.floor(total / numStreams);
    const remainder = total % numStreams;

    return streamsList.map((es, idx) => {
      const streamCount = basePerStream + (idx < remainder ? 1 : 0);
      return {
        ...es,
        question_count: streamCount,
        difficulty_quotas: calculateDifficultyQuotas(streamCount, easyPct, medPct, hardPct),
      };
    });
  };

  const handleOpenCreate = () => {
    const now = new Date();
    const defaultStart = formatLocalDateTime(new Date(now.getTime() + 60 * 60 * 1000));
    const defaultEnd = formatLocalDateTime(new Date(now.getTime() + 4 * 60 * 60 * 1000));

    const defaultTotalQuestions = 20;
    const defaultEasyPct = 40;
    const defaultMedPct = 40;
    const defaultHardPct = 20;

    const initialStreams = streams.slice(0, 1).map((s) => ({
      stream_id: s.id,
      stream_code: s.code,
      stream_name: s.name,
      question_count: defaultTotalQuestions,
      marks_per_question: null,
      negative_marks: null,
      difficulty_quotas: calculateDifficultyQuotas(
        defaultTotalQuestions,
        defaultEasyPct,
        defaultMedPct,
        defaultHardPct
      ),
    }));

    setFormData({
      title: '',
      description: '',
      start_time: defaultStart,
      end_time: defaultEnd,
      entry_cutoff_minutes: 15,
      duration_minutes: 60,
      total_questions: defaultTotalQuestions,
      easy_percentage: defaultEasyPct,
      medium_percentage: defaultMedPct,
      hard_percentage: defaultHardPct,
      default_marks_per_question: 1.0,
      default_negative_marks: 0.25,
      shuffle_questions: true,
      shuffle_options: true,
      pass_percentage: 40.0,
      instructions: 'Review instructions carefully before starting.',
      exam_streams: initialStreams,
    });
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleTotalQuestionsChange = (val) => {
    const newTotal = Math.max(1, Number(val) || 1);
    setFormData((prev) => {
      const rebalanced = rebalanceStreamsAcrossTotal(
        prev.exam_streams,
        newTotal,
        prev.easy_percentage,
        prev.medium_percentage,
        prev.hard_percentage
      );
      return {
        ...prev,
        total_questions: newTotal,
        exam_streams: rebalanced,
      };
    });
  };

  const handleDifficultyPercentageChange = (difficulty, val) => {
    const numVal = Math.max(0, Math.min(100, Number(val) || 0));
    setFormData((prev) => {
      const next = {
        ...prev,
        [`${difficulty}_percentage`]: numVal,
      };
      const rebalanced = rebalanceStreamsAcrossTotal(
        next.exam_streams,
        next.total_questions || 20,
        next.easy_percentage,
        next.medium_percentage,
        next.hard_percentage
      );
      return {
        ...next,
        exam_streams: rebalanced,
      };
    });
  };

  const handleApplyPreset = (easy, med, hard) => {
    setFormData((prev) => {
      const rebalanced = rebalanceStreamsAcrossTotal(
        prev.exam_streams,
        prev.total_questions || 20,
        easy,
        med,
        hard
      );
      return {
        ...prev,
        easy_percentage: easy,
        medium_percentage: med,
        hard_percentage: hard,
        exam_streams: rebalanced,
      };
    });
  };

  const handleAddStreamToExam = (streamId) => {
    const s = streams.find((item) => item.id === streamId);
    if (!s || formData.exam_streams.some((es) => es.stream_id === streamId))
      return;

    const newStreamList = [
      ...formData.exam_streams,
      {
        stream_id: s.id,
        stream_code: s.code,
        stream_name: s.name,
        question_count: 0,
        marks_per_question: null,
        negative_marks: null,
        difficulty_quotas: [],
      },
    ];

    const rebalanced = rebalanceStreamsAcrossTotal(
      newStreamList,
      formData.total_questions || 20,
      formData.easy_percentage,
      formData.medium_percentage,
      formData.hard_percentage
    );

    setFormData((prev) => ({
      ...prev,
      exam_streams: rebalanced,
    }));
  };

  const handleRemoveStreamFromExam = (streamId) => {
    const remaining = formData.exam_streams.filter((es) => es.stream_id !== streamId);
    const rebalanced = rebalanceStreamsAcrossTotal(
      remaining,
      formData.total_questions || 20,
      formData.easy_percentage,
      formData.medium_percentage,
      formData.hard_percentage
    );

    setFormData((prev) => ({
      ...prev,
      exam_streams: rebalanced,
    }));
  };

  const handleStreamCountChange = (streamId, newCount) => {
    const count = Math.max(1, Number(newCount) || 1);
    setFormData((prev) => {
      const updatedStreams = prev.exam_streams.map((es) => {
        if (es.stream_id !== streamId) return es;
        return {
          ...es,
          question_count: count,
          difficulty_quotas: calculateDifficultyQuotas(
            count,
            prev.easy_percentage,
            prev.medium_percentage,
            prev.hard_percentage
          ),
        };
      });
      const newTotal = updatedStreams.reduce((acc, es) => acc + (es.question_count || 0), 0);
      return {
        ...prev,
        total_questions: newTotal,
        exam_streams: updatedStreams,
      };
    });
  };

  const handleQuotaCountChange = (streamId, difficulty, count) => {
    const val = Math.max(0, Number(count) || 0);
    setFormData((prev) => ({
      ...prev,
      exam_streams: prev.exam_streams.map((es) => {
        if (es.stream_id !== streamId) return es;
        return {
          ...es,
          difficulty_quotas: es.difficulty_quotas.map((dq) =>
            dq.difficulty === difficulty ? { ...dq, quota_count: val } : dq
          ),
        };
      }),
    }));
  };

  const handleSubmitCreateExam = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.title.trim()) {
      setFormError('Exam title is required');
      return;
    }
    if (!formData.start_time || !formData.end_time) {
      setFormError('Both start and end window times are required');
      return;
    }
    const startDate = new Date(formData.start_time);
    const endDate = new Date(formData.end_time);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setFormError('Please enter valid dates for the exam window');
      return;
    }
    if (endDate <= startDate) {
      setFormError('Exam End Window must be scheduled AFTER the Start Window');
      return;
    }
    if (formData.exam_streams.length === 0) {
      setFormError('Add at least one subject stream allocation');
      return;
    }

    const sumPct =
      (Number(formData.easy_percentage) || 0) +
      (Number(formData.medium_percentage) || 0) +
      (Number(formData.hard_percentage) || 0);
    if (sumPct !== 100) {
      setFormError(`Difficulty percentages must equal 100% (currently ${sumPct}%)`);
      return;
    }

    const totalQ =
      formData.total_questions ||
      formData.exam_streams.reduce(
        (acc, es) => acc + (es.question_count || 0),
        0
      );
    if (totalQ <= 0) {
      setFormError('Total questions configured must be greater than 0');
      return;
    }

    for (const es of formData.exam_streams) {
      const quotaSum = es.difficulty_quotas.reduce(
        (acc, dq) => acc + (dq.quota_count || 0),
        0
      );
      if (quotaSum !== es.question_count) {
        setFormError(
          `Stream ${es.stream_code}: sum of Easy + Medium + Hard is ${quotaSum}, which must match stream total (${es.question_count}).`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        entry_cutoff_minutes: Number(formData.entry_cutoff_minutes),
        duration_minutes: Number(formData.duration_minutes),
        total_questions: totalQ,
        easy_percentage: Number(formData.easy_percentage),
        medium_percentage: Number(formData.medium_percentage),
        hard_percentage: Number(formData.hard_percentage),
        default_marks_per_question: Number(formData.default_marks_per_question),
        default_negative_marks: Number(formData.default_negative_marks),
        shuffle_questions: formData.shuffle_questions,
        shuffle_options: formData.shuffle_options,
        pass_percentage: Number(formData.pass_percentage),
        instructions: formData.instructions,
        exam_streams: formData.exam_streams.map((es) => ({
          stream_id: es.stream_id,
          allocation_mode: 'count',
          question_count: es.question_count,
          marks_per_question: es.marks_per_question,
          negative_marks: es.negative_marks,
          difficulty_quotas: es.difficulty_quotas.map((dq) => ({
            difficulty: dq.difficulty,
            quota_mode: 'count',
            quota_count: dq.quota_count,
          })),
        })),
      };

      await api.createExam(payload);
      setIsCreateModalOpen(false);
      fetchExams();
    } catch (err) {
      setFormError(err.message || 'Failed to create exam');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenValidate = async (exam) => {
    setValidatingExam(exam);
    setValidationReport(null);
    setIsValidatingModalOpen(true);
    setIsValidating(true);
    try {
      const report = await api.validateExamQuotas(exam.id);
      setValidationReport(report);
      fetchExams();
    } catch (err) {
      toast.error(err.message || 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const handlePublishNow = async (examId) => {
    try {
      await api.publishExam(examId);
      setIsValidatingModalOpen(false);
      fetchExams();
      toast.success('Exam published successfully!');
    } catch (err) {
      toast.error(err.message || 'Publication blocked');
    }
  };

  const handleOpenEnrollments = async (exam) => {
    setEnrollingExam(exam);
    setIsEnrollModalOpen(true);
    try {
      const list = await api.getExamEnrollments(exam.id);
      setEnrollments(list || []);
    } catch (err) {
      console.error('Failed to load enrollments:', err);
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    const clean = studentEmail.trim();
    if (!clean || !enrollingExam) return;

    setIsEnrolling(true);
    try {
      await api.enrollStudents(enrollingExam.id, [
        { student_email: clean },
      ]);
      setStudentEmail('');
      const list = await api.getExamEnrollments(enrollingExam.id);
      setEnrollments(list || []);
      fetchExams();
      toast.success(`Successfully enrolled candidate ${clean}`);
    } catch (err) {
      toast.error(err.message || 'Enrollment failed');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleWithdrawCandidate = async (studentId) => {
    if (!enrollingExam) return;
    const ok = await confirm({
      title: 'Withdraw Candidate',
      message: 'Are you sure you want to withdraw this candidate from the examination?',
      confirmText: 'Withdraw',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await api.withdrawStudent(enrollingExam.id, studentId);
      const list = await api.getExamEnrollments(enrollingExam.id);
      setEnrollments(list || []);
      fetchExams();
      toast.info('Candidate enrollment withdrawn');
    } catch (err) {
      toast.error(err.message || 'Withdrawal failed');
    }
  };

  const handleOpenPreviewPaper = async (exam) => {
    setPreviewData(null);
    setIsPreviewModalOpen(true);
    setIsLoadingPreview(true);
    try {
      const data = await api.previewPaper(exam.id);
      setPreviewData(data);
    } catch (err) {
      toast.error(err.message || 'Failed to simulate paper');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleDeleteExam = async (examId) => {
    const ok = await confirm({
      title: 'Delete Draft Exam',
      message: 'Are you sure you want to delete this draft examination? This action cannot be undone.',
      confirmText: 'Delete Exam',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await api.deleteExam(examId);
      fetchExams();
      toast.success('Draft exam deleted successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to delete exam');
    }
  };

  const columns = [
    {
      key: 'title',
      header: 'Exam Title & Timing',
      render: (_, row) => (
        <div className="space-y-1">
          <p className="font-bold text-slate-900 text-xs">{row.title}</p>
          <p className="text-[11px] text-slate-500">
            {new Date(row.start_time).toLocaleString()} →{' '}
            {new Date(row.end_time).toLocaleTimeString()}
          </p>
          <div className="flex items-center gap-2 pt-0.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <Clock size={11} /> {row.duration_minutes} min
            </span>
            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              {row.total_questions} Questions
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'exam_streams',
      header: 'Stream Allocations',
      render: (streamsAlloc) => (
        <div className="space-y-1">
          {streamsAlloc && streamsAlloc.length > 0 ? (
            streamsAlloc.map((es, idx) => (
              <div key={idx} className="text-[11px] text-slate-600">
                <span className="font-bold text-slate-800">
                  {es.stream_code}:
                </span>{' '}
                {es.question_count} Qs
              </div>
            ))
          ) : (
            <span className="text-slate-400 text-[11px]">No allocations</span>
          )}
        </div>
      ),
    },
    {
      key: 'enrolled_count',
      header: 'Candidates',
      width: '130px',
      render: (count, row) => (
        <Button
          variant="outline"
          size="xs"
          onClick={() => handleOpenEnrollments(row)}
          icon={Users}
        >
          {count} Enrolled
        </Button>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '110px',
      render: (status) => <StatusBadge status={status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '260px',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5 flex-wrap">
          {row.status === 'draft' && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => handleOpenValidate(row)}
              icon={CheckCircle2}
            >
              Validate
            </Button>
          )}
          {row.status === 'validated' && (
            <Button
              variant="emerald"
              size="xs"
              onClick={() => handlePublishNow(row.id)}
            >
              Publish
            </Button>
          )}
          {(row.status === 'published' || row.status === 'in_progress') && (
            <Button
              variant="primary"
              size="xs"
              onClick={() => navigate(`/arena/${row.id}`)}
              icon={Play}
            >
              Enter Arena
            </Button>
          )}
          <Button
            variant="ghost"
            size="xs"
            onClick={() => handleOpenPreviewPaper(row)}
            icon={Eye}
          >
            Preview
          </Button>
          {row.status !== 'in_progress' && row.status !== 'completed' && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleDeleteExam(row.id)}
              className="text-rose-600"
            >
              <Trash2 size={13} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exams &amp; Schedules"
        subtitle="Schedule assessment papers, configure difficulty allocations, and enforce quota gatekeeper rules"
        actions={
          <Button
            variant="emerald"
            size="sm"
            onClick={handleOpenCreate}
            icon={Plus}
          >
            Schedule Exam
          </Button>
        }
      />

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="px-3 py-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Total Scheduled
          </p>
          <p className="text-xl font-extrabold text-slate-900 mt-0.5">
            {exams.length}
          </p>
        </div>
        <div className="px-3 py-1 border-l border-slate-100">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
            Published
          </p>
          <p className="text-xl font-extrabold text-emerald-700 mt-0.5">
            {exams.filter((e) => e.status === 'published').length}
          </p>
        </div>
        <div className="px-3 py-1 border-l border-slate-100">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
            Draft / Validated
          </p>
          <p className="text-xl font-extrabold text-amber-700 mt-0.5">
            {
              exams.filter(
                (e) => e.status === 'draft' || e.status === 'validated'
              ).length
            }
          </p>
        </div>
        <div className="px-3 py-1 border-l border-slate-100">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            Total Enrolled
          </p>
          <p className="text-xl font-extrabold text-[#1f3b45] mt-0.5">
            {exams.reduce((acc, e) => acc + (e.enrolled_count || 0), 0)}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <SearchBar
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exam title..."
            size="sm"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          {[
            { id: '', label: 'All Exams' },
            { id: 'published', label: 'Published' },
            { id: 'validated', label: 'Validated' },
            { id: 'draft', label: 'Draft' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Exams Table */}
      <Table
        columns={columns}
        data={exams}
        isLoading={isLoading}
        emptyMessage={
          searchQuery || statusFilter
            ? 'No exams match your search filters.'
            : 'No scheduled exams found. Click "Schedule Exam" to create one.'
        }
      />

      {/* Create Exam Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Schedule New Examination"
        subtitle="Configure timing windows, entry cutoff, pass marks, and stream difficulty quotas"
        maxWidth="720px"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmitCreateExam}
              isLoading={isSubmitting}
            >
              Save Examination Paper
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmitCreateExam} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-medium">
              {formError}
            </div>
          )}

          <Input
            id="exam-title"
            label="Exam Title *"
            placeholder="e.g. Midterm Mechanics Assessment 2026"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                id="start-time"
                type="datetime-local"
                label="Start Window *"
                value={formData.start_time}
                onChange={(e) =>
                  setFormData({ ...formData, start_time: e.target.value })
                }
                required
              />
              {formData.start_time && (
                <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between px-0.5">
                  <span>
                    Starts:{' '}
                    <strong>
                      {new Date(formData.start_time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </strong>{' '}
                    ({new Date(formData.start_time).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })})
                  </span>
                  {new Date(formData.start_time).getTime() < Date.now() && (
                    <span className="text-amber-600 font-bold bg-amber-50 px-1 rounded">
                      ⚠️ In past
                    </span>
                  )}
                </div>
              )}
            </div>

            <div>
              <Input
                id="end-time"
                type="datetime-local"
                label="End Window *"
                value={formData.end_time}
                onChange={(e) =>
                  setFormData({ ...formData, end_time: e.target.value })
                }
                required
              />
              {formData.end_time && (
                <div className="mt-1 text-[11px] text-slate-500 px-0.5">
                  <span>
                    Closes:{' '}
                    <strong>
                      {new Date(formData.end_time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </strong>{' '}
                    ({new Date(formData.end_time).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })})
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <Input
              id="total-questions"
              type="number"
              label="Total Questions *"
              value={formData.total_questions}
              onChange={(e) => handleTotalQuestionsChange(e.target.value)}
              min={1}
              required
            />
            <Input
              id="duration"
              type="number"
              label="Duration (Mins) *"
              value={formData.duration_minutes}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  duration_minutes: Number(e.target.value),
                })
              }
              required
            />
            <Input
              id="cutoff"
              type="number"
              label="Entry Cutoff (Mins)"
              value={formData.entry_cutoff_minutes}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  entry_cutoff_minutes: Number(e.target.value),
                })
              }
            />
            <Input
              id="pass-pct"
              type="number"
              label="Pass Percentage (%)"
              value={formData.pass_percentage}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  pass_percentage: Number(e.target.value),
                })
              }
            />
          </div>

          {/* Automated Difficulty Distribution Section */}
          <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-indigo-600" />
                  Difficulty Distribution Strategy
                </span>
                <p className="text-[11px] text-indigo-700/80">
                  Default: 40% Easy / 40% Medium / 20% Hard. Auto-divides questions across streams.
                </p>
              </div>

              {/* Preset buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyPreset(40, 40, 20)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-md cursor-pointer transition ${
                    formData.easy_percentage === 40 &&
                    formData.medium_percentage === 40 &&
                    formData.hard_percentage === 20
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                  }`}
                >
                  40 / 40 / 20 (Default)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(50, 30, 20)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-md cursor-pointer transition ${
                    formData.easy_percentage === 50 &&
                    formData.medium_percentage === 30 &&
                    formData.hard_percentage === 20
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                  }`}
                >
                  50 / 30 / 20
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(30, 40, 30)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-md cursor-pointer transition ${
                    formData.easy_percentage === 30 &&
                    formData.medium_percentage === 40 &&
                    formData.hard_percentage === 30
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                  }`}
                >
                  30 / 40 / 30
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(20, 40, 40)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-md cursor-pointer transition ${
                    formData.easy_percentage === 20 &&
                    formData.medium_percentage === 40 &&
                    formData.hard_percentage === 40
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                  }`}
                >
                  20 / 40 / 40
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-800">
                  <span>🟢 Easy (%)</span>
                  <span className="font-bold">{formData.easy_percentage}%</span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.easy_percentage}
                  onChange={(e) => handleDifficultyPercentageChange('easy', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-emerald-200 rounded-lg bg-white text-slate-800 font-semibold focus:outline-emerald-500 shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-amber-800">
                  <span>🟡 Medium (%)</span>
                  <span className="font-bold">{formData.medium_percentage}%</span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.medium_percentage}
                  onChange={(e) => handleDifficultyPercentageChange('medium', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-amber-200 rounded-lg bg-white text-slate-800 font-semibold focus:outline-amber-500 shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-rose-800">
                  <span>🔴 Hard (%)</span>
                  <span className="font-bold">{formData.hard_percentage}%</span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.hard_percentage}
                  onChange={(e) => handleDifficultyPercentageChange('hard', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-rose-200 rounded-lg bg-white text-slate-800 font-semibold focus:outline-rose-500 shadow-2xs"
                />
              </div>
            </div>

            {/* Calculated Breakdown Summary */}
            {(() => {
              const sumPct =
                (Number(formData.easy_percentage) || 0) +
                (Number(formData.medium_percentage) || 0) +
                (Number(formData.hard_percentage) || 0);
              const totalQ = formData.total_questions || 0;
              const overall = calculateDifficultyQuotas(
                totalQ,
                formData.easy_percentage,
                formData.medium_percentage,
                formData.hard_percentage
              );
              const easyCount = overall.find((q) => q.difficulty === 'easy')?.quota_count || 0;
              const medCount = overall.find((q) => q.difficulty === 'medium')?.quota_count || 0;
              const hardCount = overall.find((q) => q.difficulty === 'hard')?.quota_count || 0;

              return (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-indigo-100 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-600">Calculated Breakdown:</span>
                    <span className="font-bold text-slate-900">
                      {easyCount} Easy ({formData.easy_percentage}%) • {medCount} Medium ({formData.medium_percentage}%) • {hardCount} Hard ({formData.hard_percentage}%) = {totalQ} Questions
                    </span>
                  </div>
                  <div>
                    {sumPct === 100 ? (
                      <span className="text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 100% Total
                      </span>
                    ) : (
                      <span className="text-rose-700 font-bold bg-rose-100/80 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" /> Total is {sumPct}% (must equal 100%)
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Stream Allocations Section */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Subject Stream Quota Rules
              </span>
              <div className="flex items-center gap-2">
                {formData.exam_streams.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleTotalQuestionsChange(formData.total_questions)}
                    className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-200 hover:bg-indigo-50 px-2.5 py-1 rounded-lg cursor-pointer transition"
                    title="Evenly divide the total questions and difficulty quotas across all added streams"
                  >
                    ⚡ Auto-Balance Across Streams
                  </button>
                )}
                <select
                  className="bg-white border border-slate-200 text-xs text-slate-700 rounded-lg py-1 px-2.5 cursor-pointer"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddStreamToExam(e.target.value);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="">+ Add Stream</option>
                  {streams.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {formData.exam_streams.map((es) => (
              <div
                key={es.stream_id}
                className="p-3 bg-white rounded-xl border border-slate-200 space-y-2.5 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">
                    {es.stream_code} ({es.stream_name})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveStreamFromExam(es.stream_id)}
                    className="text-rose-500 hover:text-rose-700 text-xs font-semibold cursor-pointer"
                  >
                    Remove
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Total Questions:
                  </label>
                  <input
                    type="number"
                    value={es.question_count}
                    onChange={(e) =>
                      handleStreamCountChange(es.stream_id, e.target.value)
                    }
                    className="w-16 px-2 py-1 text-xs border border-slate-200 rounded-md font-bold text-slate-900"
                    min={1}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
                  {es.difficulty_quotas.map((dq) => (
                    <div key={dq.difficulty} className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">
                        {dq.difficulty}
                      </label>
                      <input
                        type="number"
                        value={dq.quota_count}
                        onChange={(e) =>
                          handleQuotaCountChange(
                            es.stream_id,
                            dq.difficulty,
                            e.target.value
                          )
                        }
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md font-semibold text-slate-800"
                        min={0}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={formData.shuffle_questions}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    shuffle_questions: e.target.checked,
                  })
                }
                className="text-emerald-600 rounded"
              />
              <span>Shuffle Questions per Candidate</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={formData.shuffle_options}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    shuffle_options: e.target.checked,
                  })
                }
                className="text-emerald-600 rounded"
              />
              <span>Shuffle MCQ Options</span>
            </label>
          </div>
        </form>
      </Modal>

      {/* Validation Gatekeeper Modal */}
      <Modal
        isOpen={isValidatingModalOpen}
        onClose={() => setIsValidatingModalOpen(false)}
        title={`Quota Gatekeeper: ${validatingExam?.title}`}
        subtitle="Verifies question inventory sufficiency in question bank before permitting publication"
        maxWidth="560px"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsValidatingModalOpen(false)}
            >
              Close
            </Button>
            {validationReport?.is_valid && (
              <Button
                variant="emerald"
                size="sm"
                onClick={() => handlePublishNow(validatingExam.id)}
              >
                Publish Exam Now
              </Button>
            )}
          </div>
        }
      >
        {isValidating ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Validating quota allocations...
          </div>
        ) : validationReport ? (
          <div className="space-y-3">
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-2.5 ${
                validationReport.is_valid
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {validationReport.is_valid ? (
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle size={18} className="text-rose-600 shrink-0" />
              )}
              <div>
                <p className="font-bold text-xs">
                  {validationReport.is_valid
                    ? 'All Quota Requirements Met'
                    : 'Insufficient Questions in Bank'}
                </p>
                <p className="text-[11px] mt-0.5">
                  {validationReport.is_valid
                    ? 'Question bank contains sufficient inventory to generate randomized candidate papers.'
                    : 'Please author or import more questions in the required difficulty tiers.'}
                </p>
              </div>
            </div>

            {validationReport.errors && validationReport.errors.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
                <p className="font-bold mb-1 text-rose-800">Allocation Issues:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-rose-700">
                  {validationReport.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                  <tr>
                    <th className="p-2.5">Stream</th>
                    <th className="p-2.5">Difficulty</th>
                    <th className="p-2.5">Required</th>
                    <th className="p-2.5">Available</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const quotaList =
                      validationReport.quotas || validationReport.details || [];
                    if (quotaList.length === 0) {
                      return (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-4 text-center text-slate-400 italic"
                          >
                            No quota rules configured for this exam.
                          </td>
                        </tr>
                      );
                    }
                    return quotaList.map((d, idx) => {
                      const req = d.required_count ?? d.required ?? 0;
                      const avail = d.available_count ?? d.available ?? 0;
                      const satisfied = d.is_satisfied ?? d.satisfied ?? false;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2.5 font-bold text-slate-800">
                            {d.stream_code || '-'}
                          </td>
                          <td className="p-2.5 capitalize">{d.difficulty}</td>
                          <td className="p-2.5 font-medium">{req}</td>
                          <td className="p-2.5 font-medium">{avail}</td>
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                satisfied
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {satisfied ? 'OK' : 'Deficit'}
                            </span>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Candidate Enrollment Modal */}
      <Modal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        title={`Candidate Registry: ${enrollingExam?.title}`}
        subtitle="Manage enrolled students authorized to take this assessment"
        maxWidth="540px"
        footer={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsEnrollModalOpen(false)}
          >
            Done
          </Button>
        }
      >
        <div className="space-y-4">
          <form onSubmit={handleAddCandidate} className="flex gap-2">
            <input
              type="email"
              placeholder="candidate@svarp.org"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#1f3b45]"
              required
            />
            <Button
              variant="emerald"
              size="sm"
              type="submit"
              isLoading={isEnrolling}
            >
              Enroll Candidate
            </Button>
          </form>

          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                <tr>
                  <th className="p-2.5">Student Email</th>
                  <th className="p-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enrollments.map((en) => (
                  <tr key={en.student_id}>
                    <td className="p-2.5 text-slate-800 font-medium">
                      {en.student_email || en.student_id}
                    </td>
                    <td className="p-2.5 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          handleWithdrawCandidate(en.student_id)
                        }
                        className="text-rose-600 hover:text-rose-800 text-[11px] font-semibold cursor-pointer"
                      >
                        Withdraw
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Paper Simulation Preview Modal */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title="Simulated Examination Paper"
        subtitle="Sample randomized candidate paper allocated by deterministic shuffle seed"
        maxWidth="680px"
        footer={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsPreviewModalOpen(false)}
          >
            Close Preview
          </Button>
        }
      >
        {isLoadingPreview ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Allocating paper preview...
          </div>
        ) : previewData ? (
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                Total Allocated Questions: {previewData.items?.length || 0}
              </span>
              <span className="font-mono text-slate-500 text-[11px]">
                Seed: {previewData.seed || 'random'}
              </span>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {previewData.items?.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-900">
                      Q{idx + 1}. [{item.stream_code}]
                    </span>
                    <span className="capitalize font-semibold text-slate-500">
                      {item.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 font-medium">
                    {item.question_text}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {item.options?.map((opt) => (
                      <div
                        key={opt.option_label}
                        className="px-2 py-1 rounded text-[11px] bg-slate-50 text-slate-700 border border-slate-100"
                      >
                        [{opt.option_label}] {opt.option_text}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default Exams;
