import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Upload,
  Download,
  History,
  Edit2,
  Archive,
  FileSpreadsheet,
  Check,
  AlertCircle,
  HelpCircle,
  Info,
  Copy,
  CheckCheck,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Layers,
  Search,
  BookOpen,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const Questions = () => {
  const { toast, confirm } = useToast();
  const [questions, setQuestions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [streams, setStreams] = useState([]);
  const [streamStats, setStreamStats] = useState([]);
  const [selectedStream, setSelectedStream] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Filters for questions inside a stream
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination for questions inside a stream
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Search filter for stream cards
  const [streamSearchQuery, setStreamSearchQuery] = useState('');

  // Create / Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formData, setFormData] = useState({
    stream_id: '',
    difficulty: 'easy',
    status: 'active',
    question_text: '',
    explanation: '',
    tags: '',
    options: [
      { option_label: 'A', option_text: '', is_correct: true },
      { option_label: 'B', option_text: '', is_correct: false },
      { option_label: 'C', option_text: '', is_correct: false },
      { option_label: 'D', option_text: '', is_correct: false },
    ],
  });
  const [correctOptionLabel, setCorrectOptionLabel] = useState('A');
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Version History Modal State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyQuestion, setHistoryQuestion] = useState(null);
  const [historyVersions, setHistoryVersions] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Bulk Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  // CSV Guide Modal State
  const [isCsvGuideOpen, setIsCsvGuideOpen] = useState(false);
  const [isSampleCopied, setIsSampleCopied] = useState(false);

  // Load stream statistics for cards
  const loadStreamStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const stats = await api.getStreamQuestionStats();
      const list = Array.isArray(stats) ? stats : [];
      setStreamStats(list);
    } catch (err) {
      console.error('Failed to load stream stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Load streams for dropdown
  useEffect(() => {
    const loadStreams = async () => {
      try {
        const data = await api.getStreams({ active_only: true });
        const list = Array.isArray(data) ? data : data.items || [];
        setStreams(list);
        if (list.length > 0 && !formData.stream_id) {
          setFormData((prev) => ({ ...prev, stream_id: list[0].id }));
        }
      } catch (err) {
        console.error('Failed to load streams:', err);
      }
    };
    loadStreams();
    loadStreamStats();
  }, [loadStreamStats]);

  // Fetch Questions for the selected stream with pagination
  const fetchQuestions = useCallback(async () => {
    if (!selectedStream) return;
    setIsLoading(true);
    try {
      const params = {
        stream_id: selectedStream.stream_id,
        skip: (currentPage - 1) * pageSize,
        limit: pageSize,
      };
      if (difficultyFilter) params.difficulty = difficultyFilter;
      if (statusFilter) params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.getQuestions(params);
      setQuestions(res.items || []);
      setTotalCount(res.total || 0);
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedStream, currentPage, pageSize, difficultyFilter, statusFilter, searchQuery]);

  useEffect(() => {
    if (selectedStream) {
      fetchQuestions();
    }
  }, [fetchQuestions, selectedStream]);

  // Navigation handlers
  const handleSelectStream = (stream) => {
    setSelectedStream(stream);
    setCurrentPage(1);
    setSearchQuery('');
    setDifficultyFilter('');
    setStatusFilter('');
  };

  const handleBackToStreams = () => {
    setSelectedStream(null);
    setCurrentPage(1);
    setSearchQuery('');
    loadStreamStats();
  };

  // Modal Handlers
  const handleOpenCreate = () => {
    setEditingQuestion(null);
    const initialStreamId = selectedStream
      ? selectedStream.stream_id
      : streams.length > 0
      ? streams[0].id
      : '';
    setFormData({
      stream_id: initialStreamId,
      difficulty: 'easy',
      status: 'active',
      question_text: '',
      explanation: '',
      tags: '',
      options: [
        { option_label: 'A', option_text: '', is_correct: true },
        { option_label: 'B', option_text: '', is_correct: false },
        { option_label: 'C', option_text: '', is_correct: false },
        { option_label: 'D', option_text: '', is_correct: false },
      ],
    });
    setCorrectOptionLabel('A');
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (q) => {
    setEditingQuestion(q);
    const ver = q.current_version;
    const existingOptions = ver?.options || [];

    const mappedOptions = ['A', 'B', 'C', 'D'].map((lbl) => {
      const found = existingOptions.find(
        (o) => o.option_label.toUpperCase() === lbl
      );
      return {
        option_label: lbl,
        option_text: found ? found.option_text : '',
        is_correct: found ? found.is_correct : false,
      };
    });

    const correct =
      mappedOptions.find((o) => o.is_correct)?.option_label || 'A';
    setCorrectOptionLabel(correct);

    setFormData({
      stream_id: q.stream_id,
      difficulty: q.difficulty,
      status: q.status,
      question_text: ver ? ver.question_text : '',
      explanation: ver?.explanation || '',
      tags: (q.tags || []).join(', '),
      options: mappedOptions,
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingQuestion(null);
    setFormError(null);
  };

  const handleOptionTextChange = (label, text) => {
    setFormData((prev) => ({
      ...prev,
      options: prev.options.map((opt) =>
        opt.option_label === label ? { ...opt, option_text: text } : opt
      ),
    }));
  };

  const handleSelectCorrect = (label) => {
    setCorrectOptionLabel(label);
    setFormData((prev) => ({
      ...prev,
      options: prev.options.map((opt) => ({
        ...opt,
        is_correct: opt.option_label === label,
      })),
    }));
  };

  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.question_text.trim()) {
      setFormError('Question text cannot be empty');
      return;
    }

    const emptyOpt = formData.options.find((o) => !o.option_text.trim());
    if (emptyOpt) {
      setFormError(`Option ${emptyOpt.option_label} text cannot be empty`);
      return;
    }

    setIsSubmitting(true);
    try {
      const tagList = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        stream_id: formData.stream_id,
        difficulty: formData.difficulty,
        status: formData.status,
        question_text: formData.question_text,
        explanation: formData.explanation || null,
        tags: tagList,
        options: formData.options.map((opt) => ({
          option_label: opt.option_label,
          option_text: opt.option_text,
          is_correct: opt.option_label === correctOptionLabel,
        })),
      };

      if (editingQuestion) {
        await api.updateQuestion(editingQuestion.id, payload);
        toast.success('Question updated successfully');
      } else {
        await api.createQuestion(payload);
        toast.success('Question created successfully');
      }

      handleCloseEditModal();
      if (selectedStream) fetchQuestions();
      loadStreamStats();
    } catch (err) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Version History Modal
  const handleOpenHistory = async (q) => {
    setHistoryQuestion(q);
    setIsHistoryModalOpen(true);
    setIsLoadingHistory(true);
    try {
      const versions = await api.getQuestionVersions(q.id);
      setHistoryVersions(versions || []);
    } catch (err) {
      console.error('Failed to load version history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Delete / Archive Question
  const handleDeleteQuestion = async (q) => {
    const ok = await confirm({
      title: 'Archive Question',
      message: 'Are you sure you want to archive this question? It will be removed from future paper generation.',
      confirmText: 'Archive',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await api.deleteQuestion(q.id);
      if (selectedStream) fetchQuestions();
      loadStreamStats();
      toast.success('Question archived successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to archive question');
    }
  };

  // Bulk Import
  const handleOpenImport = () => {
    setSelectedFile(null);
    setImportResult(null);
    setIsImportModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleUploadImport = async () => {
    if (!selectedFile) return;
    setIsImporting(true);
    try {
      const res = await api.importQuestions(selectedFile);
      setImportResult(res);
      if (res.success) {
        if (selectedStream) fetchQuestions();
        loadStreamStats();
        toast.success(`Successfully imported ${res.imported_count} questions`);
      }
    } catch (err) {
      setImportResult({
        success: false,
        total_rows: 0,
        imported_count: 0,
        error_count: 1,
        errors: [
          {
            row_number: 1,
            field: 'file',
            message: err.message || 'Import failed',
          },
        ],
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await api.downloadQuestionTemplate();
      toast.success('Question import template downloaded');
    } catch (err) {
      toast.error('Failed to download template: ' + err.message);
    }
  };

  const handleCopySampleCsv = () => {
    const sample = `stream_code,difficulty,question_text,option_a,option_b,option_c,option_d,correct_option,explanation,tags
CS,easy,"Which data structure uses LIFO (Last In First Out)?",Queue,Stack,Array,Linked List,B,"Stack follows Last In First Out order","data-structures,stack"
CS,medium,"What is the worst-case time complexity of QuickSort?",O(n),O(n log n),O(n^2),O(log n),C,"Worst-case occurs when the pivot divides poorly leading to O(n^2)","algorithms,sorting"
MATH,hard,"What is the derivative of sin(x) with respect to x?",cos(x),-cos(x),tan(x),sec^2(x),A,"Standard trigonometric derivative rule","calculus,trigonometry"`;
    navigator.clipboard.writeText(sample);
    setIsSampleCopied(true);
    setTimeout(() => setIsSampleCopied(false), 2000);
  };

  // Difficulty badge pill
  const getDifficultyBadge = (diff) => {
    const d = (diff || '').toLowerCase();
    if (d === 'easy') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Easy
        </span>
      );
    }
    if (d === 'medium') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          Medium
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        Hard
      </span>
    );
  };

  const columns = [
    {
      key: 'stream_code',
      header: 'Stream',
      width: '100px',
      render: (code) => (
        <span className="inline-block px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-slate-100 text-[#1f3b45] border border-slate-200">
          {code || '—'}
        </span>
      ),
    },
    {
      key: 'question_text',
      header: 'Question Content',
      render: (_, row) => {
        const text = row.current_version?.question_text || 'No content';
        return (
          <div className="space-y-1">
            <p className="font-medium text-slate-800 text-xs line-clamp-2">
              {text}
            </p>
            {row.tags && row.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {row.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'difficulty',
      header: 'Difficulty',
      width: '100px',
      render: (diff) => getDifficultyBadge(diff),
    },
    {
      key: 'version',
      header: 'Version',
      width: '85px',
      render: (_, row) => (
        <button
          type="button"
          onClick={() => handleOpenHistory(row)}
          className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition cursor-pointer"
          title="Click to view version history"
        >
          v{row.current_version?.version_number || 1}
        </button>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      render: (status) => <StatusBadge status={status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '160px',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => handleOpenEdit(row)}
            icon={Edit2}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => handleOpenHistory(row)}
            icon={History}
          >
            History
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => handleDeleteQuestion(row)}
            className="text-rose-600 hover:text-rose-700"
          >
            Archive
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Question Bank"
        subtitle="Stream-organized MCQs with immutable versioning, option randomization &amp; quota rules"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              icon={Download}
            >
              CSV Template
            </Button>
            <div className="inline-flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleOpenImport}
                icon={Upload}
              >
                Bulk Import
              </Button>
              <button
                type="button"
                onClick={() => setIsCsvGuideOpen(true)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-[#1f3b45] transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
                title="How to create CSV for Bulk Upload (Column Guidelines & Rules)"
                aria-label="Bulk Upload CSV Guide"
              >
                <Info size={16} className="text-[#1f3b45]" />
              </button>
            </div>
            <Button
              variant="emerald"
              size="sm"
              onClick={handleOpenCreate}
              icon={Plus}
            >
              New Question
            </Button>
          </>
        }
      />

      {selectedStream ? (
        /* Stream Questions View (When a stream card is clicked) */
        <div className="space-y-4">
          {/* Stream Top Navigation & Action Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBackToStreams}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
              >
                <ArrowLeft size={14} />
                <span>All Streams</span>
              </button>

              <div className="h-5 w-px bg-slate-200 hidden sm:block" />

              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#1f3b45]/10 text-[#1f3b45] font-black text-xs border border-[#1f3b45]/20">
                    {selectedStream.stream_code}
                  </span>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">
                    {selectedStream.stream_name}
                  </h2>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {totalCount} Total Questions in this stream
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Quick Stream Switcher */}
              <select
                className="bg-white border border-slate-200 text-xs text-slate-700 rounded-lg py-1.5 px-3 focus:outline-none focus:border-[#1f3b45] font-semibold"
                value={selectedStream.stream_id}
                onChange={(e) => {
                  const found = streamStats.find((s) => s.stream_id === e.target.value);
                  if (found) handleSelectStream(found);
                }}
              >
                {streamStats.map((s) => (
                  <option key={s.stream_id} value={s.stream_id}>
                    {s.stream_code} — {s.stream_name} ({s.total} questions)
                  </option>
                ))}
              </select>

              <Button
                variant="emerald"
                size="sm"
                onClick={handleOpenCreate}
                icon={Plus}
              >
                Add Question
              </Button>
            </div>
          </div>

          {/* Stream Stats Counter Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="px-3 py-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Stream Total
              </p>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                {totalCount}
              </p>
            </div>
            <div className="px-3 py-1 border-l border-slate-100">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                Easy Tier
              </p>
              <p className="text-xl font-extrabold text-emerald-700 mt-0.5">
                {selectedStream.easy || 0}
              </p>
            </div>
            <div className="px-3 py-1 border-l border-slate-100">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                Medium Tier
              </p>
              <p className="text-xl font-extrabold text-amber-700 mt-0.5">
                {selectedStream.medium || 0}
              </p>
            </div>
            <div className="px-3 py-1 border-l border-slate-100">
              <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                Hard Tier
              </p>
              <p className="text-xl font-extrabold text-rose-700 mt-0.5">
                {selectedStream.hard || 0}
              </p>
            </div>
          </div>

          {/* Filters & Search Toolbar inside Stream */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="w-full md:w-80">
              <SearchBar
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={`Search ${selectedStream.stream_code} questions or tags...`}
                size="sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Difficulty Filter */}
              <select
                className="bg-white border border-slate-200 text-xs text-slate-700 rounded-lg py-1.5 px-3 focus:outline-none focus:border-[#1f3b45]"
                value={difficultyFilter}
                onChange={(e) => {
                  setDifficultyFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              {/* Status Filter */}
              <select
                className="bg-white border border-slate-200 text-xs text-slate-700 rounded-lg py-1.5 px-3 focus:outline-none focus:border-[#1f3b45]"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Questions Table */}
          <Table
            columns={columns}
            data={questions}
            isLoading={isLoading}
            emptyMessage={
              searchQuery || difficultyFilter || statusFilter
                ? 'No questions found matching your filter criteria in this stream.'
                : `No questions created for ${selectedStream.stream_name} yet. Click "Add Question" to begin.`
            }
          />

          {/* Pagination Controls */}
          {totalCount > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>
                  Showing <strong className="text-slate-800">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
                  <strong className="text-slate-800">{Math.min(currentPage * pageSize, totalCount)}</strong> of{' '}
                  <strong className="text-slate-800">{totalCount}</strong> questions
                </span>
                <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                  <span className="text-[11px] text-slate-400">Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-slate-200 text-xs text-slate-700 rounded-md py-1 px-2 focus:outline-none focus:border-[#1f3b45] font-semibold"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage <= 1 || isLoading}
                  icon={ChevronLeft}
                >
                  Previous
                </Button>

                <div className="flex items-center gap-1 px-1">
                  {(() => {
                    const totalPages = Math.ceil(totalCount / pageSize) || 1;
                    const pages = [];
                    const maxButtons = 5;
                    let start = Math.max(1, currentPage - 2);
                    let end = Math.min(totalPages, start + maxButtons - 1);
                    if (end - start + 1 < maxButtons) {
                      start = Math.max(1, end - maxButtons + 1);
                    }
                    for (let p = start; p <= end; p++) {
                      pages.push(
                        <button
                          key={p}
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            p === currentPage
                              ? 'bg-[#1f3b45] text-white shadow-2xs'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    }
                    return pages;
                  })()}
                </div>

                <Button
                  variant="outline"
                  size="xs"
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(p + 1, Math.ceil(totalCount / pageSize))
                    )
                  }
                  disabled={
                    currentPage >= Math.ceil(totalCount / pageSize) || isLoading
                  }
                >
                  Next <ChevronRight size={13} className="ml-1 inline" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Streams Cards View (Default) */
        <div className="space-y-4">
          {/* Stats Counter Bar matching LMS aesthetic */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="px-3 py-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total Questions
              </p>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                {streamStats.reduce((acc, s) => acc + (Number(s.total) || 0), 0)}
              </p>
            </div>
            <div className="px-3 py-1 border-l border-slate-100">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                Subject Streams
              </p>
              <p className="text-xl font-extrabold text-emerald-700 mt-0.5">
                {streamStats.length}
              </p>
            </div>
            <div className="px-3 py-1 border-l border-slate-100">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                Easy / Med / Hard
              </p>
              <p className="text-sm font-extrabold text-slate-700 mt-1 flex items-center gap-1.5">
                <span className="text-emerald-700">
                  {streamStats.reduce((acc, s) => acc + (Number(s.easy) || 0), 0)}E
                </span>
                <span>/</span>
                <span className="text-amber-700">
                  {streamStats.reduce((acc, s) => acc + (Number(s.medium) || 0), 0)}M
                </span>
                <span>/</span>
                <span className="text-rose-700">
                  {streamStats.reduce((acc, s) => acc + (Number(s.hard) || 0), 0)}H
                </span>
              </p>
            </div>
            <div className="px-3 py-1 border-l border-slate-100">
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                Avg per Stream
              </p>
              <p className="text-xl font-extrabold text-indigo-700 mt-0.5">
                {streamStats.length > 0
                  ? Math.round(
                      streamStats.reduce(
                        (acc, s) => acc + (Number(s.total) || 0),
                        0
                      ) / streamStats.length
                    )
                  : 0}
              </p>
            </div>
          </div>

          {/* Search Streams Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="w-full sm:w-80">
              <SearchBar
                value={streamSearchQuery}
                onChange={(e) => setStreamSearchQuery(e.target.value)}
                placeholder="Search streams by code or subject name..."
                size="sm"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <Layers size={14} className="text-[#1f3b45]" />
              <span>Click any stream card below to view its questions with pagination</span>
            </div>
          </div>

          {/* Stream Cards Grid */}
          {isLoadingStats ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs animate-pulse h-48"
                />
              ))}
            </div>
          ) : streamStats.filter((st) => {
              if (!streamSearchQuery.trim()) return true;
              const q = streamSearchQuery.toLowerCase();
              return (
                (st.stream_name || '').toLowerCase().includes(q) ||
                (st.stream_code || '').toLowerCase().includes(q) ||
                (st.description || '').toLowerCase().includes(q)
              );
            }).length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
              <p className="text-sm font-bold text-slate-700">No subject streams match your search.</p>
              <p className="text-xs text-slate-400 mt-1">Try searching with a different stream code or name.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {streamStats
                .filter((st) => {
                  if (!streamSearchQuery.trim()) return true;
                  const q = streamSearchQuery.toLowerCase();
                  return (
                    (st.stream_name || '').toLowerCase().includes(q) ||
                    (st.stream_code || '').toLowerCase().includes(q) ||
                    (st.description || '').toLowerCase().includes(q)
                  );
                })
                .map((st) => (
                  <div
                    key={st.stream_id}
                    onClick={() => handleSelectStream(st)}
                    className="group bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-[#1f3b45] hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Header Row */}
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-lg bg-[#1f3b45]/10 text-[#1f3b45] font-black text-xs border border-[#1f3b45]/20 group-hover:bg-[#1f3b45] group-hover:text-white transition-colors">
                          {st.stream_code}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            st.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              st.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {st.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {/* Stream Name */}
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm group-hover:text-[#1f3b45] transition-colors line-clamp-1">
                          {st.stream_name}
                        </h3>
                        {st.description && (
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                            {st.description}
                          </p>
                        )}
                      </div>

                      {/* Bank Size KPI */}
                      <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex items-baseline justify-between">
                        <span className="text-xs text-slate-500 font-medium">Bank Size:</span>
                        <div className="text-right">
                          <span className="text-lg font-black text-slate-900">{st.total}</span>{' '}
                          <span className="text-[11px] text-slate-400 font-medium">Questions</span>
                        </div>
                      </div>

                      {/* Difficulty Tier Distribution */}
                      <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-semibold pt-0.5">
                        <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/50">
                          <span className="text-slate-400 font-normal block text-[9px]">Easy</span>
                          <span className="font-bold">{st.easy || 0}</span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/50">
                          <span className="text-slate-400 font-normal block text-[9px]">Medium</span>
                          <span className="font-bold">{st.medium || 0}</span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-200/50">
                          <span className="text-slate-400 font-normal block text-[9px]">Hard</span>
                          <span className="font-bold">{st.hard || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Action Footer */}
                    <div className="pt-3.5 mt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#1f3b45] group-hover:text-emerald-700 transition-colors">
                      <span>Manage Questions</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Question Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        title={
          editingQuestion
            ? `Edit Question (Creates v${(editingQuestion.total_versions || 1) + 1})`
            : 'Create New Question'
        }
        subtitle={
          editingQuestion
            ? 'Editing question text, options, or explanation will create a new immutable version without altering historical papers.'
            : 'Author an assessment question with 4 options and mark 1 correct answer.'
        }
        maxWidth="640px"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCloseEditModal}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmitQuestion}
              isLoading={isSubmitting}
            >
              {editingQuestion ? 'Save New Version' : 'Create Question'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmitQuestion} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subject Stream *
              </label>
              <select
                className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-lg py-2 px-3 focus:outline-none focus:border-[#1f3b45]"
                value={formData.stream_id}
                onChange={(e) =>
                  setFormData({ ...formData, stream_id: e.target.value })
                }
                required
              >
                {streams.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Difficulty Tier *
              </label>
              <select
                className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-lg py-2 px-3 focus:outline-none focus:border-[#1f3b45]"
                value={formData.difficulty}
                onChange={(e) =>
                  setFormData({ ...formData, difficulty: e.target.value })
                }
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Question Statement *
            </label>
            <textarea
              rows={3}
              className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-lg p-2.5 placeholder-slate-400 focus:outline-none focus:border-[#1f3b45] focus:ring-1 focus:ring-[#1f3b45]"
              placeholder="Enter the question statement clearly..."
              value={formData.question_text}
              onChange={(e) =>
                setFormData({ ...formData, question_text: e.target.value })
              }
              required
            />
          </div>

          {/* Options Editor matching LMS Card Style */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                MCQ Options (4 choices, mark 1 correct)
              </span>
              <span className="text-[11px] font-semibold text-emerald-700">
                Correct: Option {correctOptionLabel}
              </span>
            </div>

            <div className="space-y-2">
              {formData.options.map((opt) => {
                const isSelected = correctOptionLabel === opt.option_label;
                return (
                  <div
                    key={opt.option_label}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-emerald-300 bg-emerald-50/50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {opt.option_label}
                    </span>

                    <input
                      type="text"
                      className="flex-1 bg-transparent text-xs text-slate-900 focus:outline-none placeholder-slate-400"
                      placeholder={`Option ${opt.option_label} text...`}
                      value={opt.option_text}
                      onChange={(e) =>
                        handleOptionTextChange(opt.option_label, e.target.value)
                      }
                      required
                    />

                    <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer flex-shrink-0">
                      <input
                        type="radio"
                        name="correct_option"
                        checked={isSelected}
                        onChange={() => handleSelectCorrect(opt.option_label)}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Correct</span>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Explanation / Solution Notes (Optional)
            </label>
            <textarea
              rows={2}
              className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-lg p-2.5 placeholder-slate-400 focus:outline-none focus:border-[#1f3b45]"
              placeholder="Displayed in published candidate answer review keys..."
              value={formData.explanation}
              onChange={(e) =>
                setFormData({ ...formData, explanation: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="q-tags"
              label="Tags (Comma separated)"
              placeholder="e.g. algorithms, gate2025"
              value={formData.tags}
              onChange={(e) =>
                setFormData({ ...formData, tags: e.target.value })
              }
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status
              </label>
              <select
                className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-lg py-2 px-3 focus:outline-none focus:border-[#1f3b45]"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* Version History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={`Version History: Question #${historyQuestion?.id?.slice(0, 8)}`}
        subtitle="Immutable snapshots of this question over time. Historical candidate papers lock to specific versions."
        maxWidth="600px"
        footer={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsHistoryModalOpen(false)}
          >
            Close
          </Button>
        }
      >
        {isLoadingHistory ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Loading version history...
          </div>
        ) : (
          <div className="space-y-3">
            {historyVersions.map((v) => (
              <div
                key={v.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Version {v.version_number}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(v.created_at).toLocaleString()}
                  </span>
                </div>

                <p className="font-semibold text-slate-900 text-xs">
                  {v.question_text}
                </p>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {v.options?.map((opt) => (
                    <div
                      key={opt.id}
                      className={`px-2 py-1 rounded text-[11px] flex items-center justify-between ${
                        opt.is_correct
                          ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200'
                          : 'bg-slate-50 text-slate-600'
                      }`}
                    >
                      <span>
                        [{opt.option_label}] {opt.option_text}
                      </span>
                      {opt.is_correct && <span>✓</span>}
                    </div>
                  ))}
                </div>

                {v.explanation && (
                  <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <strong>Explanation:</strong> {v.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Bulk Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Bulk Import Questions (CSV / XLSX)"
        subtitle="Strict pre-flight validation guarantees that invalid files do not corrupt the question bank."
        maxWidth="540px"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsImportModalOpen(false)}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleUploadImport}
              isLoading={isImporting}
              disabled={!selectedFile || isImporting}
            >
              Upload &amp; Import
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <Info size={16} className="text-blue-600 flex-shrink-0" />
              <span className="font-medium">Unsure about required columns and accepted values?</span>
            </div>
            <button
              type="button"
              onClick={() => setIsCsvGuideOpen(true)}
              className="text-xs font-bold text-blue-700 hover:text-blue-900 underline ml-2 flex-shrink-0 cursor-pointer"
            >
              View CSV Guide
            </button>
          </div>

          <div
            className="border-2 border-dashed border-slate-200 hover:border-[#1f3b45] rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
            />
            <FileSpreadsheet
              size={32}
              className="text-[#1f3b45] mx-auto mb-2 opacity-80"
            />
            <p className="text-xs font-bold text-slate-800">
              Click to select or drop CSV / XLSX file
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Columns: stream_code, difficulty, question_text, option_a..d,
              correct_option
            </p>
          </div>

          {selectedFile && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">
                  {selectedFile.name}
                </p>
                <p className="text-[10px] text-slate-400">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setSelectedFile(null)}
              >
                Remove
              </Button>
            </div>
          )}

          {importResult && (
            <div>
              {importResult.success ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                  <Check size={16} className="text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold">Import Successful!</p>
                    <p className="text-[11px]">
                      {importResult.imported_count} questions imported cleanly.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle
                      size={16}
                      className="text-rose-600 flex-shrink-0"
                    />
                    <div>
                      <p className="font-bold">Import Rejected (0 Committed)</p>
                      <p className="text-[11px]">
                        {importResult.error_count} validation errors found.
                      </p>
                    </div>
                  </div>

                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                        <tr>
                          <th className="p-2">Row</th>
                          <th className="p-2">Field</th>
                          <th className="p-2">Issue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importResult.errors?.map((err, idx) => (
                          <tr key={idx}>
                            <td className="p-2 text-slate-500">
                              Row {err.row_number}
                            </td>
                            <td className="p-2 font-mono">{err.field}</td>
                            <td className="p-2 text-rose-600">{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* CSV Bulk Upload Guide Modal */}
      <Modal
        isOpen={isCsvGuideOpen}
        onClose={() => setIsCsvGuideOpen(false)}
        title="CSV Bulk Upload Guide & Column Specifications"
        subtitle="Learn how to format your CSV / Excel file, required columns, allowed values, and data rules."
        maxWidth="820px"
        footer={
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              icon={Download}
            >
              Download CSV Template
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsCsvGuideOpen(false);
                  setIsImportModalOpen(true);
                }}
                icon={Upload}
              >
                Proceed to Bulk Import
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCsvGuideOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Quick Steps Banner */}
          <div className="bg-gradient-to-r from-slate-50 to-blue-50/40 border border-slate-200 rounded-xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
              🚀 Quick Start Workflow
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white/90 p-3 rounded-lg border border-slate-100 shadow-2xs">
                <span className="inline-block w-5 h-5 rounded-full bg-[#1f3b45] text-white text-[11px] font-bold text-center leading-5 mb-1.5">
                  1
                </span>
                <p className="font-bold text-slate-800 text-xs">Get Template</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Download the template or copy the sample columns below.
                </p>
              </div>
              <div className="bg-white/90 p-3 rounded-lg border border-slate-100 shadow-2xs">
                <span className="inline-block w-5 h-5 rounded-full bg-[#1f3b45] text-white text-[11px] font-bold text-center leading-5 mb-1.5">
                  2
                </span>
                <p className="font-bold text-slate-800 text-xs">Fill Questions</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  1 row = 1 question with 4 options and the correct answer letter.
                </p>
              </div>
              <div className="bg-white/90 p-3 rounded-lg border border-slate-100 shadow-2xs">
                <span className="inline-block w-5 h-5 rounded-full bg-[#1f3b45] text-white text-[11px] font-bold text-center leading-5 mb-1.5">
                  3
                </span>
                <p className="font-bold text-slate-800 text-xs">Upload &amp; Validate</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Export as CSV or XLSX and upload. Zero corruption guaranteed.
                </p>
              </div>
            </div>
          </div>

          {/* Active Streams in System */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-800 text-xs">
                Active Stream Codes in this Portal:
              </span>
              <span className="text-[10px] text-slate-500">
                (Must be used in <code className="font-mono bg-slate-200/80 px-1 py-0.5 rounded text-slate-800">stream_code</code> column)
              </span>
            </div>
            {streams.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {streams.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono bg-white border border-slate-200 text-slate-800 shadow-2xs"
                  >
                    <span className="font-bold text-[#1f3b45]">{s.code}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600 font-sans">{s.name}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200/70 p-2 rounded-lg mt-1">
                ⚠️ No active streams currently found in the database. Please create your academic streams first under the <strong>Streams</strong> section before bulk importing.
              </p>
            )}
          </div>

          {/* Column Reference Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                📋 Column Reference &amp; Specifications
              </h4>
              <span className="text-[11px] text-slate-400">
                10 total columns (8 required, 2 optional)
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Column Name</th>
                      <th className="py-2.5 px-3">Requirement</th>
                      <th className="py-2.5 px-3">Accepted Values / Format</th>
                      <th className="py-2.5 px-3">Description &amp; Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#1f3b45]">stream_code</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Required
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        Active stream code (e.g. <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">CS</code>, <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">MATH</code>)
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        Links the question to an existing academic stream/department. Case-insensitive.
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#1f3b45]">difficulty</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Required
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">easy</span>,{' '}
                        <span className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">medium</span>, or{' '}
                        <span className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">hard</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        Question difficulty tier used for exam quota balancing and paper generation.
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#1f3b45]">question_text</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Required
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-800">
                        Non-empty text / Markdown
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        The full MCQ question prompt. Supports markdown text, code blocks, and math formulas.
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#1f3b45]">option_a</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Required
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-800">Non-empty text</td>
                      <td className="py-2.5 px-3 text-slate-600">Content for choice Option A.</td>
                    </tr>

                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#1f3b45]">option_b</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Required
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-800">Non-empty text</td>
                      <td className="py-2.5 px-3 text-slate-600">Content for choice Option B.</td>
                    </tr>

                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#1f3b45]">option_c</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Required
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-800">Non-empty text</td>
                      <td className="py-2.5 px-3 text-slate-600">Content for choice Option C.</td>
                    </tr>

                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#1f3b45]">option_d</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Required
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-800">Non-empty text</td>
                      <td className="py-2.5 px-3 text-slate-600">Content for choice Option D.</td>
                    </tr>

                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#1f3b45]">correct_option</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Required
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-[#1f3b45] bg-slate-100 px-1.5 py-0.5 rounded">A</span>,{' '}
                        <span className="font-mono font-bold text-[#1f3b45] bg-slate-100 px-1.5 py-0.5 rounded">B</span>,{' '}
                        <span className="font-mono font-bold text-[#1f3b45] bg-slate-100 px-1.5 py-0.5 rounded">C</span>, or{' '}
                        <span className="font-mono font-bold text-[#1f3b45] bg-slate-100 px-1.5 py-0.5 rounded">D</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        The letter indicating which of the four options is the correct answer. Case-insensitive.
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">explanation</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          Optional
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">Any text or blank</td>
                      <td className="py-2.5 px-3 text-slate-600">
                        Explanation or step-by-step solution shown during student review when results are published.
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">tags</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          Optional
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        Comma-separated (e.g. <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">math, algebra</code>)
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        Categorization keywords for quick filtering, search, and syllabus tagging.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sample CSV Preview & Copy Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-800 text-xs">
                📄 Example CSV Structure
              </span>
              <button
                type="button"
                onClick={handleCopySampleCsv}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#1f3b45] hover:text-[#152930] bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
              >
                {isSampleCopied ? (
                  <>
                    <CheckCheck size={14} className="text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy Sample Data</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative bg-slate-900 text-slate-100 rounded-xl p-3.5 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800 shadow-inner">
              <div className="text-slate-400 select-none pb-1 border-b border-slate-800 mb-1.5">
                # stream_code,difficulty,question_text,option_a,option_b,option_c,option_d,correct_option,explanation,tags
              </div>
              <div className="whitespace-pre">
                <span className="text-emerald-400">CS</span>,<span className="text-amber-300">easy</span>,&quot;Which data structure uses LIFO (Last In First Out)?&quot;,Queue,Stack,Array,Linked List,<span className="text-cyan-300 font-bold">B</span>,&quot;Stack follows Last In First Out order&quot;,&quot;data-structures,stack&quot;
              </div>
              <div className="whitespace-pre mt-1">
                <span className="text-emerald-400">CS</span>,<span className="text-amber-300">medium</span>,&quot;What is the worst-case time complexity of QuickSort?&quot;,O(n),O(n log n),O(n^2),O(log n),<span className="text-cyan-300 font-bold">C</span>,&quot;Worst-case occurs when pivot divides poorly&quot;,&quot;algorithms,sorting&quot;
              </div>
              <div className="whitespace-pre mt-1">
                <span className="text-emerald-400">MATH</span>,<span className="text-amber-300">hard</span>,&quot;What is the derivative of sin(x) with respect to x?&quot;,cos(x),-cos(x),tan(x),sec^2(x),<span className="text-cyan-300 font-bold">A</span>,&quot;Standard trigonometric derivative rule&quot;,&quot;calculus,trigonometry&quot;
              </div>
            </div>
          </div>

          {/* Validation & Pro Tips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800 mb-1">
                <Check size={15} className="text-emerald-600" />
                <span>Zero Corruption (Atomic Validation)</span>
              </div>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                If even a single row has an error (e.g. unknown stream or missing option), <strong>0 questions are imported</strong>. The system outputs exact row numbers and field issues for easy correction.
              </p>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl">
              <div className="flex items-center gap-1.5 font-bold text-amber-800 mb-1">
                <AlertCircle size={15} className="text-amber-600" />
                <span>Handling Commas &amp; Quotes</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                If your question text or options contain commas, wrap them in double quotes <code className="bg-amber-100/80 px-1 py-0.2 rounded">&quot;...&quot;</code>. Excel and Google Sheets do this automatically when saving as CSV.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Questions;
