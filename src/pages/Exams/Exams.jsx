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
  UploadCloud,
  Download,
  FileSpreadsheet,
  UserCheck,
  Edit3,
  Award,
  Info,
  FileText,
  Printer,
  Copy,
  Check,
  BookOpen,
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

  // Create / Edit Exam Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState(null);
  const [editingExam, setEditingExam] = useState(null);
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

  // Candidate Batch File Upload & Validation
  const [enrollTab, setEnrollTab] = useState('list'); // 'list' | 'upload'
  const [candidateFile, setCandidateFile] = useState(null);
  const [isValidatingCandidateFile, setIsValidatingCandidateFile] = useState(false);
  const [candidateValidationResult, setCandidateValidationResult] = useState(null);
  const [isBatchEnrolling, setIsBatchEnrolling] = useState(false);

  // Simulated Paper Preview Modal
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Exam Syllabus Specification Modal
  const [isSyllabusModalOpen, setIsSyllabusModalOpen] = useState(false);
  const [syllabusData, setSyllabusData] = useState(null);
  const [isLoadingSyllabus, setIsLoadingSyllabus] = useState(false);
  const [copiedSyllabus, setCopiedSyllabus] = useState(false);

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

  const calculateTotalEstimatedMarks = () => {
    const defaultM = Number(formData.default_marks_per_question) || 1.0;
    if (!formData.exam_streams || formData.exam_streams.length === 0) {
      return ((formData.total_questions || 0) * defaultM).toFixed(1);
    }
    const total = formData.exam_streams.reduce((acc, es) => {
      const qCount = Number(es.question_count) || 0;
      const m =
        es.marks_per_question !== '' &&
        es.marks_per_question !== null &&
        es.marks_per_question !== undefined
          ? Number(es.marks_per_question)
          : defaultM;
      return acc + qCount * m;
    }, 0);
    return Number(total).toFixed(1);
  };

  const handleStreamMarksChange = (streamId, field, val) => {
    setFormData((prev) => ({
      ...prev,
      exam_streams: prev.exam_streams.map((es) => {
        if (es.stream_id !== streamId) return es;
        return {
          ...es,
          [field]: val === '' ? null : val,
        };
      }),
    }));
  };

  const canEditExam = (row) => {
    if (!row) return false;
    if (['in_progress', 'completed', 'cancelled'].includes(row.status)) {
      return false;
    }
    if (row.start_time) {
      const startTime = new Date(row.start_time).getTime();
      if (!isNaN(startTime) && Date.now() >= startTime) {
        return false;
      }
    }
    return true;
  };

  const handleOpenCreate = () => {
    setEditingExamId(null);
    setEditingExam(null);
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

  const handleOpenEdit = (exam) => {
    setEditingExamId(exam.id);
    setEditingExam(exam);
    const defaultTotalQuestions = exam.total_questions || 20;

    const mappedStreams = (exam.exam_streams || []).map((es) => ({
      stream_id: es.stream_id,
      stream_code: es.stream_code || '',
      stream_name: es.stream_name || '',
      question_count: es.question_count || 0,
      marks_per_question:
        es.marks_per_question !== null && es.marks_per_question !== undefined
          ? es.marks_per_question
          : null,
      negative_marks:
        es.negative_marks !== null && es.negative_marks !== undefined
          ? es.negative_marks
          : null,
      difficulty_quotas: (es.difficulty_quotas || []).map((dq) => ({
        difficulty: dq.difficulty.toLowerCase(),
        quota_count: dq.quota_count || 0,
        quota_percentage: dq.quota_percentage || 0,
      })),
    }));

    // Derive difficulty percentage breakdown from first stream or overall
    let easyPct = 40;
    let medPct = 40;
    let hardPct = 20;
    if (mappedStreams.length > 0 && mappedStreams[0].difficulty_quotas.length > 0) {
      const eq = mappedStreams[0].difficulty_quotas.find((q) => q.difficulty === 'easy')?.quota_count || 0;
      const mq = mappedStreams[0].difficulty_quotas.find((q) => q.difficulty === 'medium')?.quota_count || 0;
      const hq = mappedStreams[0].difficulty_quotas.find((q) => q.difficulty === 'hard')?.quota_count || 0;
      const sumQ = eq + mq + hq;
      if (sumQ > 0) {
        easyPct = Math.round((eq / sumQ) * 100);
        medPct = Math.round((mq / sumQ) * 100);
        hardPct = Math.max(0, 100 - easyPct - medPct);
      }
    }

    setFormData({
      title: exam.title || '',
      description: exam.description || '',
      start_time: exam.start_time ? formatLocalDateTime(new Date(exam.start_time)) : '',
      end_time: exam.end_time ? formatLocalDateTime(new Date(exam.end_time)) : '',
      entry_cutoff_minutes: exam.entry_cutoff_minutes ?? 15,
      duration_minutes: exam.duration_minutes ?? 60,
      total_questions: defaultTotalQuestions,
      easy_percentage: easyPct,
      medium_percentage: medPct,
      hard_percentage: hardPct,
      default_marks_per_question: exam.default_marks_per_question ?? 1.0,
      default_negative_marks: exam.default_negative_marks ?? 0.25,
      shuffle_questions: exam.shuffle_questions ?? true,
      shuffle_options: exam.shuffle_options ?? true,
      pass_percentage: exam.pass_percentage ?? 40.0,
      instructions: exam.instructions || '',
      exam_streams: mappedStreams,
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

    if (Number(formData.default_marks_per_question) <= 0) {
      setFormError('Default marks per question must be greater than 0');
      return;
    }
    if (Number(formData.default_negative_marks) < 0) {
      setFormError('Default negative marks cannot be negative');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        entry_cutoff_minutes: Number(formData.entry_cutoff_minutes),
        duration_minutes: Number(formData.duration_minutes),
        total_questions: totalQ,
        easy_percentage: Number(formData.easy_percentage),
        medium_percentage: Number(formData.medium_percentage),
        hard_percentage: Number(formData.hard_percentage),
        default_marks_per_question: Number(formData.default_marks_per_question) || 1.0,
        default_negative_marks:
          formData.default_negative_marks !== '' && formData.default_negative_marks !== null
            ? Number(formData.default_negative_marks)
            : 0.0,
        shuffle_questions: Boolean(formData.shuffle_questions),
        shuffle_options: Boolean(formData.shuffle_options),
        pass_percentage: Number(formData.pass_percentage),
        instructions: formData.instructions?.trim() || null,
        exam_streams: formData.exam_streams.map((es) => ({
          stream_id: es.stream_id,
          allocation_mode: 'count',
          question_count: es.question_count,
          marks_per_question:
            es.marks_per_question !== '' &&
            es.marks_per_question !== null &&
            es.marks_per_question !== undefined
              ? Number(es.marks_per_question)
              : null,
          negative_marks:
            es.negative_marks !== '' &&
            es.negative_marks !== null &&
            es.negative_marks !== undefined
              ? Number(es.negative_marks)
              : null,
          difficulty_quotas: es.difficulty_quotas.map((dq) => ({
            difficulty: dq.difficulty,
            quota_mode: 'count',
            quota_count: dq.quota_count,
          })),
        })),
      };

      if (editingExamId) {
        await api.updateExam(editingExamId, payload);
        toast.success('Exam paper and marking scheme updated successfully');
      } else {
        await api.createExam(payload);
        toast.success('Exam paper created successfully');
      }

      setIsCreateModalOpen(false);
      setEditingExamId(null);
      fetchExams();
    } catch (err) {
      setFormError(
        err.message || (editingExamId ? 'Failed to update exam' : 'Failed to create exam')
      );
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
    setEnrollTab('list');
    setCandidateFile(null);
    setCandidateValidationResult(null);
    try {
      const list = await api.getExamEnrollments(exam.id);
      setEnrollments(list || []);
    } catch (err) {
      console.error('Failed to load enrollments:', err);
    }
  };

  const handleDownloadCandidateTemplate = async () => {
    try {
      await api.downloadCandidateTemplate();
      toast.success('Sample candidate enrollment template downloaded');
    } catch (err) {
      toast.error(err.message || 'Failed to download sample template');
    }
  };

  const handleCandidateFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCandidateFile(file);
    setCandidateValidationResult(null);
    if (!enrollingExam) return;

    setIsValidatingCandidateFile(true);
    try {
      const res = await api.validateCandidateFile(enrollingExam.id, file);
      setCandidateValidationResult(res);
      if (res.valid_count > 0) {
        toast.success(`Processed file: ${res.valid_count} valid candidate(s) ready to enroll`);
      } else if (res.already_enrolled_count > 0) {
        toast.info(`All ${res.already_enrolled_count} candidate(s) are already enrolled`);
      } else {
        toast.warning('No valid candidates found in this file');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to validate candidate file');
      setCandidateValidationResult(null);
    } finally {
      setIsValidatingCandidateFile(false);
    }
  };

  const handleBatchEnroll = async () => {
    if (!enrollingExam || !candidateValidationResult?.valid_candidates?.length) return;
    setIsBatchEnrolling(true);
    try {
      const studentsToEnroll = candidateValidationResult.valid_candidates.map((c) => ({
        student_email: c.email,
        student_id: c.user_id,
      }));
      await api.enrollStudents(enrollingExam.id, studentsToEnroll);
      toast.success(`Successfully enrolled ${studentsToEnroll.length} candidate(s)!`);
      const list = await api.getExamEnrollments(enrollingExam.id);
      setEnrollments(list || []);
      fetchExams();
      setCandidateFile(null);
      setCandidateValidationResult(null);
      setEnrollTab('list');
    } catch (err) {
      toast.error(err.message || 'Batch enrollment failed');
    } finally {
      setIsBatchEnrolling(false);
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

  const handleOpenSyllabus = async (exam) => {
    setIsSyllabusModalOpen(true);
    setIsLoadingSyllabus(true);
    setSyllabusData(null);
    setCopiedSyllabus(false);
    try {
      const data = await api.getExamSyllabus(exam.id);
      setSyllabusData(data);
    } catch (err) {
      toast.error(err.message || 'Failed to generate exam syllabus');
    } finally {
      setIsLoadingSyllabus(false);
    }
  };

  const handleCopySyllabus = () => {
    if (!syllabusData?.markdown_content) return;
    navigator.clipboard.writeText(syllabusData.markdown_content);
    setCopiedSyllabus(true);
    toast.success('Syllabus copied to clipboard in markdown format!');
    setTimeout(() => setCopiedSyllabus(false), 2500);
  };

  const handleDownloadSyllabus = () => {
    if (!syllabusData?.markdown_content) return;
    const blob = new Blob([syllabusData.markdown_content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(syllabusData.title || 'exam').toLowerCase().replace(/[^a-z0-9]/g, '_')}_syllabus.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('Syllabus downloaded (.md)');
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
          <div className="flex items-center gap-2 pt-0.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <Clock size={11} /> {row.duration_minutes} min
            </span>
            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              {row.total_questions} Questions
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              <Award size={10} className="text-amber-600" />
              +{row.default_marks_per_question ?? 1.0} / -{row.default_negative_marks ?? 0.0} M
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
              <div key={idx} className="text-[11px] text-slate-600 flex items-center gap-1">
                <span className="font-bold text-slate-800">
                  {es.stream_code}:
                </span>{' '}
                <span>{es.question_count} Qs</span>
                {es.marks_per_question !== null && es.marks_per_question !== undefined && (
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                    +{es.marks_per_question}/-{es.negative_marks ?? 0}
                  </span>
                )}
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
      width: '280px',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5 flex-wrap">
          {canEditExam(row) && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => handleOpenEdit(row)}
              icon={Edit3}
            >
              Edit
            </Button>
          )}
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
          <Button
            variant="ghost"
            size="xs"
            onClick={() => handleOpenSyllabus(row)}
            icon={FileText}
          >
            Syllabus
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

      {/* Create / Edit Exam Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingExamId(null);
          setEditingExam(null);
        }}
        title={editingExamId ? 'Edit Examination Paper' : 'Schedule New Examination'}
        subtitle="Configure timing windows, entry cutoff, scoring & marking rules, and stream difficulty quotas"
        maxWidth="720px"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsCreateModalOpen(false);
                setEditingExamId(null);
                setEditingExam(null);
              }}
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
              {editingExamId ? 'Update Examination Paper' : 'Save Examination Paper'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmitCreateExam} className="space-y-4">
          {editingExam?.status === 'published' && (
            <div className="p-3 bg-blue-50/80 border border-blue-200 text-blue-900 rounded-xl text-xs flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>
                  This exam is currently <strong>Published</strong>. You can update its parameters, marking scheme, and questions until the scheduled start window ({new Date(editingExam.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(editingExam.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).
                </span>
              </div>
            </div>
          )}

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

          {/* Marking Scheme Configuration Section */}
          <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/90 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  Examination Scoring & Marking Scheme
                </span>
                <p className="text-[11px] text-amber-800/80">
                  Configure marks awarded per correct response and negative penalty deducted for incorrect answers.
                </p>
              </div>
              <div className="text-right text-[11px] font-semibold text-amber-900 bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-200">
                Estimated Total Score:{' '}
                <strong className="text-amber-950 font-extrabold text-xs">
                  {calculateTotalEstimatedMarks()} Marks
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Default Marks per Question *
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0.1"
                  value={formData.default_marks_per_question}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      default_marks_per_question:
                        e.target.value === '' ? '' : parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-bold text-slate-900 focus:outline-indigo-500 shadow-2xs"
                  required
                />
                <span className="text-[10px] text-slate-500">
                  Points awarded for each correct answer
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Default Negative Marks *
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  value={formData.default_negative_marks}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      default_negative_marks:
                        e.target.value === '' ? '' : parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-bold text-slate-900 focus:outline-indigo-500 shadow-2xs"
                  required
                />
                <span className="text-[10px] text-slate-500">
                  Penalty deducted for each wrong answer (0 = no penalty)
                </span>
              </div>
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

                {/* Per-stream marking override */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Marks / Question (Override):
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min="0.1"
                      placeholder={`Default (${formData.default_marks_per_question || 1.0})`}
                      value={es.marks_per_question ?? ''}
                      onChange={(e) => {
                        const val =
                          e.target.value === '' ? null : parseFloat(e.target.value);
                        handleStreamMarksChange(
                          es.stream_id,
                          'marks_per_question',
                          val
                        );
                      }}
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md font-semibold text-slate-800 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Negative Marks (Override):
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      placeholder={`Default (${formData.default_negative_marks ?? 0.0})`}
                      value={es.negative_marks ?? ''}
                      onChange={(e) => {
                        const val =
                          e.target.value === '' ? null : parseFloat(e.target.value);
                        handleStreamMarksChange(
                          es.stream_id,
                          'negative_marks',
                          val
                        );
                      }}
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md font-semibold text-slate-800 bg-white"
                    />
                  </div>
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

          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-slate-700">
              Exam Instructions &amp; Candidate Guidelines
            </label>
            <textarea
              rows={2}
              value={formData.instructions || ''}
              onChange={(e) =>
                setFormData({ ...formData, instructions: e.target.value })
              }
              placeholder="Instructions presented to the candidate on the verification screen before arena launch..."
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 font-medium focus:outline-indigo-500 shadow-2xs resize-none"
            />
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
        maxWidth="680px"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-slate-500 font-medium">
              {enrollments.length} candidate(s) currently enrolled
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsEnrollModalOpen(false)}
            >
              Done
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setEnrollTab('list')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                enrollTab === 'list'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Enrolled Candidates ({enrollments.length})
            </button>
            <button
              type="button"
              onClick={() => setEnrollTab('upload')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                enrollTab === 'upload'
                  ? 'bg-[#1f3b45] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Batch Upload (CSV / Excel)
            </button>
          </div>

          {enrollTab === 'list' ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    Single Candidate Enrollment
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Add candidate by email or switch to batch upload to import a roster.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setEnrollTab('upload')}
                  icon={UploadCloud}
                >
                  Upload File Instead
                </Button>
              </div>

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

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                    <tr>
                      <th className="p-2.5">Student Email</th>
                      <th className="p-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {enrollments.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="p-4 text-center text-slate-400">
                          No candidates currently enrolled.
                        </td>
                      </tr>
                    ) : (
                      enrollments.map((en) => (
                        <tr key={en.student_id}>
                          <td className="p-2.5 text-slate-800 font-medium">
                            {en.student_email || en.student_id}
                          </td>
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleWithdrawCandidate(en.student_id)}
                              className="text-rose-600 hover:text-rose-800 text-[11px] font-semibold cursor-pointer"
                            >
                              Withdraw
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Template Download & Instructions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                    <FileSpreadsheet className="w-4 h-4 text-blue-700" />
                    CSV / Excel Batch Format
                  </div>
                  <p className="text-[11px] text-blue-700">
                    Upload a file with an <code>email</code> column containing student email addresses.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={handleDownloadCandidateTemplate}
                  icon={Download}
                >
                  Download Sample CSV
                </Button>
              </div>

              {/* Upload Drop Area */}
              <div className="border-2 border-dashed border-slate-300 hover:border-[#1f3b45] transition-colors rounded-xl p-5 text-center bg-slate-50/50">
                <input
                  type="file"
                  id="candidate-file-upload"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleCandidateFileSelect}
                  className="hidden"
                />
                <label
                  htmlFor="candidate-file-upload"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200">
                    <UploadCloud className="w-5 h-5 text-[#1f3b45]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#1f3b45] hover:underline">
                      Click to choose CSV or Excel file
                    </span>
                    <span className="text-xs text-slate-500"> or drag and drop</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Supported formats: <strong>.csv</strong>, <strong>.xlsx</strong>, <strong>.xls</strong>
                  </p>
                </label>
                {candidateFile && (
                  <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between text-xs px-2">
                    <div className="flex items-center gap-2 truncate">
                      <FileSpreadsheet className="w-4 h-4 text-[#1f3b45] shrink-0" />
                      <span className="font-semibold text-slate-800 truncate">
                        {candidateFile.name}
                      </span>
                      <span className="text-slate-400">
                        ({Math.round(candidateFile.size / 1024)} KB)
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => document.getElementById('candidate-file-upload')?.click()}
                    >
                      Change File
                    </Button>
                  </div>
                )}
              </div>

              {/* Validating Spinner */}
              {isValidatingCandidateFile && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-[#1f3b45] border-t-transparent" />
                  <p className="text-xs font-semibold text-slate-700">
                    Processing and verifying candidates against SVARP User Portal...
                  </p>
                </div>
              )}

              {/* Validation Results & Action Box */}
              {candidateValidationResult && !isValidatingCandidateFile && (
                <div className="space-y-3.5">
                  {/* Results Summary Pills */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                      <div className="text-base font-extrabold text-emerald-800">
                        {candidateValidationResult.valid_count}
                      </div>
                      <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                        Ready to Enroll
                      </div>
                    </div>
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-center">
                      <div className="text-base font-extrabold text-amber-800">
                        {candidateValidationResult.already_enrolled_count}
                      </div>
                      <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                        Already Enrolled
                      </div>
                    </div>
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-center">
                      <div className="text-base font-extrabold text-rose-800">
                        {candidateValidationResult.invalid_count}
                      </div>
                      <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                        Invalid / Not Found
                      </div>
                    </div>
                  </div>

                  {/* Candidate Verification Breakdown Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                        <tr>
                          <th className="p-2">Candidate</th>
                          <th className="p-2">Status</th>
                          <th className="p-2 text-right">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {candidateValidationResult.valid_candidates.map((c) => (
                          <tr key={c.email} className="bg-emerald-50/20">
                            <td className="p-2 font-medium text-slate-800">
                              <div>{c.email}</div>
                              {c.full_name && (
                                <div className="text-[10px] text-slate-500">{c.full_name}</div>
                              )}
                            </td>
                            <td className="p-2">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" />
                                Valid
                              </span>
                            </td>
                            <td className="p-2 text-right text-[11px] text-slate-500">
                              Verified in Portal
                            </td>
                          </tr>
                        ))}
                        {candidateValidationResult.already_enrolled.map((c) => (
                          <tr key={c.email} className="bg-amber-50/20">
                            <td className="p-2 font-medium text-slate-800">
                              <div>{c.email}</div>
                              {c.full_name && (
                                <div className="text-[10px] text-slate-500">{c.full_name}</div>
                              )}
                            </td>
                            <td className="p-2">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3" />
                                Enrolled
                              </span>
                            </td>
                            <td className="p-2 text-right text-[11px] text-amber-700">
                              Already in exam
                            </td>
                          </tr>
                        ))}
                        {candidateValidationResult.invalid_candidates.map((c) => (
                          <tr key={c.email} className="bg-rose-50/20">
                            <td className="p-2 font-medium text-slate-800 truncate max-w-[180px]">
                              {c.email}
                            </td>
                            <td className="p-2">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3" />
                                Invalid
                              </span>
                            </td>
                            <td className="p-2 text-right text-[11px] text-rose-600 font-medium">
                              {c.reason || 'Not Found'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Confirmation & Enrollment Trigger */}
                  {candidateValidationResult.valid_count > 0 ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-emerald-900">
                          {candidateValidationResult.valid_count} candidate(s) ready to be enrolled
                        </div>
                        <div className="text-[11px] text-emerald-700">
                          Click below to confirm and authorize these students to take this assessment.
                        </div>
                      </div>
                      <Button
                        variant="emerald"
                        size="sm"
                        onClick={handleBatchEnroll}
                        isLoading={isBatchEnrolling}
                        icon={UserCheck}
                      >
                        Enroll {candidateValidationResult.valid_count} Student(s)
                      </Button>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-center text-xs text-slate-600">
                      No new valid candidates available to enroll from this file.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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
          (() => {
            const questions = previewData.questions || previewData.items || [];
            return (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs flex-wrap gap-2">
                  <span className="font-bold text-slate-800">
                    Total Allocated Questions: {previewData.total_questions || questions.length}
                  </span>
                  <div className="flex items-center gap-2">
                    {previewData.total_marks !== undefined && previewData.total_marks !== null && (
                      <span className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                        <Award size={12} className="text-amber-600" />
                        Total Paper: {previewData.total_marks} Marks
                      </span>
                    )}
                    <span className="font-mono text-slate-500 text-[11px]">
                      Seed: {previewData.seed || 'random'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {questions.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs italic">
                      No questions generated for this preview.
                    </div>
                  ) : (
                    questions.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-900">
                            Q{idx + 1}. [{item.stream_code}]
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              +{item.marks ?? 1} M
                            </span>
                            {item.negative_marks > 0 && (
                              <span className="inline-flex items-center text-[10px] font-bold text-rose-800 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                -{item.negative_marks} Neg
                              </span>
                            )}
                            <span className="capitalize font-semibold text-slate-500 ml-1">
                              {item.difficulty}
                            </span>
                          </div>
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
                    ))
                  )}
                </div>
              </div>
            );
          })()
        ) : null}
      </Modal>

      {/* Examination Syllabus Specification Modal */}
      <Modal
        isOpen={isSyllabusModalOpen}
        onClose={() => setIsSyllabusModalOpen(false)}
        title="Examination Syllabus & Assessment Blueprint"
        subtitle="Official curriculum specifications, sectional allocations, scoring weights, and topics"
        maxWidth="840px"
        footer={
          <div className="flex items-center justify-between w-full flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopySyllabus}
                icon={copiedSyllabus ? Check : Copy}
              >
                {copiedSyllabus ? 'Copied to Clipboard!' : 'Copy Syllabus'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadSyllabus}
                icon={Download}
              >
                Download (.md)
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.print()}
                icon={Printer}
              >
                Print / Save PDF
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSyllabusModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        }
      >
        {isLoadingSyllabus ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">
              Generating official examination syllabus &amp; assessment blueprint...
            </p>
          </div>
        ) : syllabusData ? (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
            {/* Header Identity Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-[#1f3b45] text-white space-y-3 shadow-md">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Official Assessment Specification
                </span>
                <span className="text-[11px] text-slate-300 font-mono">
                  SVARP Assessment Engine
                </span>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  {syllabusData.title}
                </h3>
                {syllabusData.description && (
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {syllabusData.description}
                  </p>
                )}
              </div>

              {/* 5 Key Metric Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-white/10">
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 text-center">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Duration
                  </span>
                  <span className="text-xs font-black text-white mt-0.5 block">
                    {syllabusData.duration_minutes} Mins
                  </span>
                </div>
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 text-center">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Questions
                  </span>
                  <span className="text-xs font-black text-white mt-0.5 block">
                    {syllabusData.total_questions} MCQs
                  </span>
                </div>
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 text-center">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Marks
                  </span>
                  <span className="text-xs font-black text-emerald-300 mt-0.5 block">
                    {syllabusData.total_marks} Marks
                  </span>
                </div>
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 text-center">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Marking
                  </span>
                  <span className="text-xs font-black text-amber-300 mt-0.5 block">
                    +{syllabusData.default_marks_per_question} / -{syllabusData.default_negative_marks}
                  </span>
                </div>
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 text-center col-span-2 sm:col-span-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Pass Cutoff
                  </span>
                  <span className="text-xs font-black text-sky-300 mt-0.5 block">
                    {syllabusData.pass_percentage || 50.0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Sectional Distribution Table */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <Award size={15} className="text-[#1f3b45]" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Sectional Distribution &amp; Weightage
                </h4>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                      <th className="py-2.5 px-3">Section Code</th>
                      <th className="py-2.5 px-3">Subject Stream</th>
                      <th className="py-2.5 px-3 text-center">Questions</th>
                      <th className="py-2.5 px-3 text-center">Marks</th>
                      <th className="py-2.5 px-3 text-center">Weightage</th>
                      <th className="py-2.5 px-3 text-right">Difficulty (E / M / H)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {syllabusData.streams?.map((st) => (
                      <tr key={st.stream_id} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 font-mono font-bold text-slate-700">
                          {st.stream_code}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900">
                          {st.stream_name}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-slate-800">
                          {st.question_count}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-emerald-700">
                          {st.total_marks}
                        </td>
                        <td className="py-2 px-3 text-center font-semibold text-slate-600">
                          {st.weightage_pct}%
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-[11px] text-slate-600">
                          <span className="text-emerald-700 font-bold">{st.difficulty_distribution?.easy || 0}E</span>
                          <span className="text-slate-300 mx-1">/</span>
                          <span className="text-amber-700 font-bold">{st.difficulty_distribution?.medium || 0}M</span>
                          <span className="text-slate-300 mx-1">/</span>
                          <span className="text-rose-700 font-bold">{st.difficulty_distribution?.hard || 0}H</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detailed Module Curriculum & Core Topics */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen size={15} className="text-[#1f3b45]" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Detailed Curriculum &amp; Domain Topics
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {syllabusData.streams?.map((st) => (
                  <div
                    key={st.stream_id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-900 text-xs block">
                          {st.stream_name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 font-bold">
                          Code: {st.stream_code}
                        </span>
                      </div>
                      <span className="inline-flex items-center text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {st.question_count} Qs ({st.total_marks} M)
                      </span>
                    </div>

                    {st.description && (
                      <p className="text-[11px] text-slate-500 italic">
                        {st.description}
                      </p>
                    )}

                    <div className="pt-1.5 border-t border-slate-100">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Key Competencies &amp; Topics
                      </span>
                      {st.topics && st.topics.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {st.topics.map((topic, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500">
                          Core subject fundamentals, practical problem solving, and analytical principles.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Assessment Rules & Guidelines */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700">
              <span className="font-bold text-slate-900 text-[11px] uppercase tracking-wider block">
                Assessment Protocol &amp; Exam Guidelines
              </span>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600 leading-relaxed">
                <li>
                  <strong>Pattern:</strong> All questions are objective Multiple Choice Questions (Single Option Correct).
                </li>
                <li>
                  <strong>Timing:</strong> Continuous timer of {syllabusData.duration_minutes} minutes from the instant of paper commencement.
                </li>
                <li>
                  <strong>Proctoring:</strong> Fullscreen mode is enforced. Leaving the exam window or switching tabs triggers an instant interruption lock on the 1st violation.
                </li>
                <li>
                  <strong>Autosave:</strong> Responses are debounced and securely synced with the SVARP cloud infrastructure instantaneously.
                </li>
              </ul>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default Exams;
