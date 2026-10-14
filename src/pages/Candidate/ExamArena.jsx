import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { isAdminUser } from '../../components/ProtectedRoute';
import { useToast } from '../../context/ToastContext';
import './ExamArena.css';

export const ExamArena = () => {
  const { toast } = useToast();
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Arena & Attempt state
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Autosave status: 'saved' | 'saving' | 'error'
  const [saveStatus, setSaveStatus] = useState('saved');

  // Proctoring & Lock state
  const [isLocked, setIsLocked] = useState(false);
  const [lockReason, setLockReason] = useState(null);
  const [resumeReason, setResumeReason] = useState('');
  const [resumeRequested, setResumeRequested] = useState(false);
  const [resumeSubmitting, setResumeSubmitting] = useState(false);

  // Modals & Final state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filter palette by subject stream
  const [selectedStream, setSelectedStream] = useState('ALL');

  // Ref for heartbeat interval & timer
  const heartbeatTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);

  // Initialize or resume attempt
  const loadAttempt = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.startAttempt(examId);
      setAttempt(data);
      setQuestions(data.questions || []);
      setRemainingSeconds(data.remaining_seconds || 0);
      setIsLocked(Boolean(data.is_locked));
      const stateLower = String(data.state || '').toLowerCase();
      if (stateLower === 'submitted' || stateLower === 'auto_submitted') {
        setIsSubmitted(true);
      }
    } catch (err) {
      setError(err.message || 'Failed to initialize exam paper');
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    loadAttempt();
  }, [loadAttempt]);

  // Handle Fullscreen & Proctoring Event Listeners
  useEffect(() => {
    if (!attempt || isSubmitted) return;

    const handleVisibilityChange = async () => {
      if (document.hidden && !isLocked) {
        try {
          const res = await api.logExamEvent(attempt.attempt_id, {
            event_type: 'tab_switch',
            details: { timestamp: new Date().toISOString() },
          });
          if (res.is_locked) {
            setIsLocked(true);
            setLockReason(res.lock_reason);
          }
        } catch (err) {
          console.warn('Failed to log tab switch event:', err);
        }
      }
    };

    const handleFullscreenChange = async () => {
      if (!document.fullscreenElement && !isLocked && !isSubmitted) {
        try {
          const res = await api.logExamEvent(attempt.attempt_id, {
            event_type: 'fullscreen_exit',
            details: { timestamp: new Date().toISOString() },
          });
          if (res.is_locked) {
            setIsLocked(true);
            setLockReason(res.lock_reason);
          }
        } catch (err) {
          console.warn('Failed to log fullscreen exit:', err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [attempt, isLocked, isSubmitted]);

  // Request fullscreen mode helper
  const enterFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  // Auto submit when time expires
  const handleAutoSubmit = useCallback(async () => {
    if (!attempt || isSubmitted) return;
    try {
      await api.submitAttempt(attempt.attempt_id);
    } catch (e) {
      console.warn('Submit on deadline caught:', e);
    } finally {
      setIsSubmitted(true);
    }
  }, [attempt, isSubmitted]);

  const handleAutoSubmitRef = useRef(handleAutoSubmit);
  useEffect(() => {
    handleAutoSubmitRef.current = handleAutoSubmit;
  }, [handleAutoSubmit]);

  // Timer Tick (every second, drift-free timestamp anchor)
  useEffect(() => {
    if (!attempt || isSubmitted || isLocked) return;

    const getRemaining = () => {
      if (attempt.deadline) {
        return Math.max(0, Math.floor((new Date(attempt.deadline).getTime() - Date.now()) / 1000));
      }
      return null;
    };

    countdownTimerRef.current = setInterval(() => {
      const serverBased = getRemaining();
      setRemainingSeconds((prev) => {
        const nextSec = serverBased !== null ? serverBased : Math.max(0, prev - 1);
        if (nextSec <= 0) {
          clearInterval(countdownTimerRef.current);
          handleAutoSubmitRef.current();
          return 0;
        }
        return nextSec;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [attempt, isSubmitted, isLocked]);

  // Heartbeat & Lock sync
  useEffect(() => {
    if (!attempt || isSubmitted) return;

    const intervalMs = isLocked ? 5000 : 25000;
    heartbeatTimerRef.current = setInterval(async () => {
      try {
        const hb = await api.sendAttemptHeartbeat(attempt.attempt_id);
        setRemainingSeconds(hb.remaining_seconds);
        if (hb.is_locked !== isLocked) {
          setIsLocked(hb.is_locked);
          setLockReason(hb.lock_reason);
          if (!hb.is_locked) {
            setResumeRequested(false);
          }
        }
        if (hb.state === 'SUBMITTED' || hb.state === 'AUTO_SUBMITTED') {
          setIsSubmitted(true);
        }
      } catch (err) {
        console.warn('Heartbeat tick error:', err);
      }
    }, intervalMs);

    return () => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    };
  }, [attempt, isLocked, isSubmitted]);

  // Refs for debouncing, queueing, and flushing answers
  const saveTimersRef = useRef({});
  const pendingSavesRef = useRef({});
  const inFlightRef = useRef({});

  // Flush a specific pending save to the backend
  const flushPendingSave = useCallback(async (qId) => {
    if (!attempt || !qId) return;

    if (saveTimersRef.current[qId]) {
      clearTimeout(saveTimersRef.current[qId]);
      delete saveTimersRef.current[qId];
    }

    const payload = pendingSavesRef.current[qId];
    if (!payload) return;

    // If an API call for this question is already running, wait for it to complete
    if (inFlightRef.current[qId]) return;

    inFlightRef.current[qId] = true;
    setSaveStatus('saving');

    try {
      await api.saveAnswer(attempt.attempt_id, payload);
      // Clean up if no newer selection arrived while in-flight
      if (pendingSavesRef.current[qId] === payload) {
        delete pendingSavesRef.current[qId];
      }
      if (Object.keys(pendingSavesRef.current).length === 0) {
        setSaveStatus('saved');
      }
    } catch (err) {
      console.error('Answer save failed:', err);
      setSaveStatus('error');
    } finally {
      inFlightRef.current[qId] = false;
      // If a newer payload was registered while in flight, flush it now
      if (pendingSavesRef.current[qId] && pendingSavesRef.current[qId] !== payload) {
        flushPendingSave(qId);
      }
    }
  }, [attempt]);

  // Flush all pending saves (used before final submission)
  const flushAllPendingSaves = useCallback(async () => {
    const qIds = Object.keys(pendingSavesRef.current);
    if (qIds.length === 0) return;
    await Promise.all(qIds.map((qId) => flushPendingSave(qId)));
  }, [flushPendingSave]);

  // Clean up debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(saveTimersRef.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  // Save current answer with INSTANT OPTIMISTIC UI update & debounced network sync
  const persistAnswer = (qIndex, selectedOptId, isMarked, immediate = false) => {
    const q = questions[qIndex];
    if (!q || !attempt || isLocked || isSubmitted) return;

    const qId = q.attempt_question_id;

    // 1. INSTANT OPTIMISTIC UI UPDATE (0ms perceived latency)
    setQuestions((prev) => {
      const next = [...prev];
      if (!next[qIndex]) return prev;
      next[qIndex] = {
        ...next[qIndex],
        selected_option_id: selectedOptId,
        is_marked_for_review: isMarked,
        is_answered: Boolean(selectedOptId),
      };
      return next;
    });

    // 2. Queue latest payload
    pendingSavesRef.current[qId] = {
      attempt_question_id: qId,
      selected_option_id: selectedOptId,
      is_marked_for_review: isMarked,
    };

    setSaveStatus('saving');

    // 3. Clear existing debounce timer for this question
    if (saveTimersRef.current[qId]) {
      clearTimeout(saveTimersRef.current[qId]);
      delete saveTimersRef.current[qId];
    }

    if (immediate) {
      flushPendingSave(qId);
    } else {
      // 300ms debounce: coalesces rapid clicks into a single backend call
      saveTimersRef.current[qId] = setTimeout(() => {
        flushPendingSave(qId);
      }, 300);
    }
  };

  // Option selection handler - Instant 0ms response
  const handleOptionSelect = (optionId) => {
    const curQ = questions[currentIndex];
    if (!curQ || isLocked || isSubmitted) return;
    persistAnswer(currentIndex, optionId, curQ.is_marked_for_review, false);
  };

  // Clear current response - Immediate
  const handleClearResponse = () => {
    const curQ = questions[currentIndex];
    if (!curQ || isLocked || isSubmitted) return;
    persistAnswer(currentIndex, null, curQ.is_marked_for_review, true);
  };

  // Mark for review & next - Immediate
  const handleMarkForReview = () => {
    const curQ = questions[currentIndex];
    if (!curQ || isLocked || isSubmitted) return;
    const newMarked = !curQ.is_marked_for_review;
    persistAnswer(currentIndex, curQ.selected_option_id, newMarked, true);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  // Navigation handlers (flush pending save of current question when moving away)
  const handleNext = () => {
    const curQ = questions[currentIndex];
    if (curQ) flushPendingSave(curQ.attempt_question_id);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    const curQ = questions[currentIndex];
    if (curQ) flushPendingSave(curQ.attempt_question_id);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handlePaletteSelect = (idx) => {
    const curQ = questions[currentIndex];
    if (curQ) flushPendingSave(curQ.attempt_question_id);
    setCurrentIndex(idx);
  };

  // Submit Exam
  const handleConfirmSubmit = async () => {
    if (!attempt) return;
    try {
      setSubmitting(true);
      // Ensure all queued/debounced answers are committed to backend before submit
      await flushAllPendingSaves();
      await api.submitAttempt(attempt.attempt_id);
      setIsSubmitted(true);
      setShowSubmitModal(false);
      toast.success('Exam successfully submitted!');
    } catch (err) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Request resumption
  const handleRequestResume = async (e) => {
    e.preventDefault();
    if (!resumeReason.trim() || !attempt) return;
    try {
      setResumeSubmitting(true);
      await api.requestResume(attempt.attempt_id, resumeReason.trim());
      setResumeRequested(true);
      toast.info('Resumption request submitted. Waiting for proctor approval.');
    } catch (err) {
      toast.error(err.message || 'Resumption request failed');
    } finally {
      setResumeSubmitting(false);
    }
  };

  // Helper formatting for time
  const formatTimer = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
  };

  // Current Question
  const currentQ = questions[currentIndex];

  // Palette streams
  const streams = Array.from(new Set(questions.map((q) => q.stream_name || 'Subject')));

  const filteredQuestions =
    selectedStream === 'ALL'
      ? questions
      : questions.filter((q) => q.stream_name === selectedStream);

  // Statistics
  const answeredCount = questions.filter((q) => q.selected_option_id).length;
  const markedCount = questions.filter((q) => q.is_marked_for_review).length;
  const unansweredCount = questions.length - answeredCount;

  if (loading) {
    return (
      <div className="arena-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="pulse-dot" style={{ width: '20px', height: '20px', margin: '0 auto 1rem' }} />
          <h3>Preparing Candidate Examination Paper...</h3>
          <p style={{ color: 'var(--color-text-muted)' }}>Configuring question options and security sandbox</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="arena-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '480px', textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ marginBottom: '1rem' }}>Cannot Start Examination</h2>
          <p style={{ color: 'var(--color-danger)', marginBottom: '1.5rem' }}>{error}</p>
          <Button
            variant="primary"
            onClick={() => navigate(isAdminUser(user) ? '/exams' : '/candidate')}
          >
            Back to Examinations
          </Button>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="arena-completion-screen">
        <div className="completion-card">
          <div className="completion-icon-wrapper">
            <span>🎉</span>
          </div>
          <h2 className="completion-title">Exam Submitted!</h2>
          <p className="completion-subtitle">
            Your responses have been recorded and securely verified in the SVARP Assessment Engine.
          </p>

          <div className="completion-exam-info">
            <div className="info-row">
              <span className="info-label">Assessment</span>
              <span className="info-value">{attempt?.exam_title || 'Examination'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Candidate</span>
              <span className="info-value">{user?.full_name || 'Candidate'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Email ID</span>
              <span className="info-value">{user?.email || '—'}</span>
            </div>
          </div>

          <div className="completion-stats">
            <div className="stat-item total">
              <span className="val">{questions.length}</span>
              <span className="lbl">Total Questions</span>
            </div>
            <div className="stat-item answered">
              <span className="val">{answeredCount}</span>
              <span className="lbl">Answered</span>
            </div>
            <div className="stat-item unanswered">
              <span className="val">{unansweredCount}</span>
              <span className="lbl">Unanswered</span>
            </div>
          </div>

          <div className="completion-actions">
            <Button
              variant="primary"
              style={{ width: '100%', padding: '0.75rem', fontWeight: 700 }}
              onClick={() => navigate(isAdminUser(user) ? '/exams' : '/candidate')}
            >
              Return to Examinations
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="arena-container" onClick={enterFullscreen}>
      {/* Top Header */}
      <header className="arena-header">
        <div className="arena-header-left">
          <div className="flex items-center gap-2">
            <img
              src="/company/svarp-logo.webp"
              alt="SVARP"
              className="h-6 w-auto object-contain"
              onError={(e) => {
                if (e.currentTarget.src.includes('svarp-logo.webp')) {
                  e.currentTarget.src = '/svarp-logo.png';
                }
              }}
            />
            <span className="font-black text-[#1f3b45] text-xs">SVARP</span>
            <span className="text-slate-300">|</span>
            <span className="font-bold text-slate-800 text-xs truncate max-w-[180px] sm:max-w-md">
              {attempt?.exam_title || 'Examination'}
            </span>
          </div>

          <div className={`arena-autosave-status ${saveStatus}`}>
            <span className="pulse-dot" />
            <span>
              {saveStatus === 'saving'
                ? 'Saving answer...'
                : saveStatus === 'error'
                ? 'Autosave error (retrying)'
                : 'All responses saved'}
            </span>
          </div>
        </div>

        <div className="arena-header-center">
          <div
            className={`arena-timer-badge ${
              remainingSeconds < 60
                ? 'critical'
                : remainingSeconds < 300
                ? 'warning'
                : ''
            }`}
          >
            <span>⏱️</span>
            <span>{formatTimer(remainingSeconds)}</span>
          </div>
        </div>

        <div className="arena-header-right">
          <div className="arena-candidate-badge">
            <span className="candidate-name">{user?.full_name || 'Candidate'}</span>
            <span className="candidate-email">{user?.email}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInstructionsModal(true)}
            title="Read examination rules & symbols"
          >
            Instructions
          </Button>
          <Button variant="danger" size="sm" onClick={() => setShowSubmitModal(true)}>
            Submit Exam
          </Button>
        </div>
      </header>

      {/* Main Examination Workspace */}
      <div className="arena-workspace">
        {/* Left / Center: Question & Options */}
        <main className="arena-question-area">
          {currentQ ? (
            <>
              <div className="question-meta-row">
                <div className="meta-left">
                  <span className="question-number-pill">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <StatusBadge status="ACTIVE" label={currentQ.stream_name} />
                </div>
                <div className="meta-right">
                  <span className="marks-tag">+{currentQ.marks} Marks</span>
                  {currentQ.negative_marks > 0 && (
                    <span className="marks-tag negative">-{currentQ.negative_marks} Neg</span>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <div className="question-text-box">{currentQ.question_text}</div>

              {/* Options */}
              <div className="options-list">
                {currentQ.options.map((opt) => {
                  const isSelected = currentQ.selected_option_id === opt.id;
                  return (
                    <div
                      key={opt.id}
                      className={`option-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleOptionSelect(opt.id)}
                    >
                      <div className="option-label">{opt.display_label}</div>
                      <div className="option-content">{opt.option_text}</div>
                    </div>
                  );
                })}
              </div>

              {/* Action Controls */}
              <div className="arena-controls-bar">
                <div className="controls-left">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearResponse}
                    disabled={!currentQ.selected_option_id}
                  >
                    Clear Response
                  </Button>
                  <Button
                    variant={currentQ.is_marked_for_review ? 'primary' : 'outline'}
                    size="sm"
                    onClick={handleMarkForReview}
                  >
                    {currentQ.is_marked_for_review ? 'Marked for Review' : 'Mark for Review'}
                  </Button>
                </div>

                <div className="controls-right">
                  <Button
                    variant="ghost"
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                  >
                    ← Previous
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleNext}
                    disabled={currentIndex === questions.length - 1}
                  >
                    Next →
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div>No questions available in this attempt paper.</div>
          )}
        </main>

        {/* Right: Question Palette */}
        <aside className="arena-palette-sidebar">
          <div className="palette-header">
            <h4 className="palette-title">Question Palette</h4>
            <div className="palette-legend">
              <div className="legend-item">
                <span className="legend-chip answered" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="legend-item">
                <span className="legend-chip marked" />
                <span>Marked ({markedCount})</span>
              </div>
              <div className="legend-item">
                <span className="legend-chip unanswered" />
                <span>Unanswered ({unansweredCount})</span>
              </div>
              <div className="legend-item">
                <span className="legend-chip active" />
                <span>Current</span>
              </div>
            </div>
          </div>

          {/* Stream Filter */}
          {streams.length > 1 && (
            <div className="palette-stream-filter">
              <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Filter:
              </label>
              <select
                value={selectedStream}
                onChange={(e) => setSelectedStream(e.target.value)}
                style={{
                  flex: 1,
                  background: 'var(--color-bg-tertiary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.8rem',
                }}
              >
                <option value="ALL">All Streams ({questions.length})</option>
                {streams.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Palette Grid */}
          <div className="palette-grid-wrapper">
            <div className="palette-grid">
              {filteredQuestions.map((q) => {
                const idx = questions.findIndex((orig) => orig.attempt_question_id === q.attempt_question_id);
                const isCurrent = idx === currentIndex;
                const isAns = Boolean(q.selected_option_id);
                const isMrk = q.is_marked_for_review;

                let cls = 'palette-btn';
                if (isAns && isMrk) cls += ' marked-answered';
                else if (isMrk) cls += ' marked';
                else if (isAns) cls += ' answered';

                if (isCurrent) cls += ' current';

                return (
                  <button
                    key={q.attempt_question_id}
                    className={cls}
                    onClick={() => handlePaletteSelect(idx)}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="palette-footer">
            <div className="palette-stats">
              <span>{answeredCount} Answered</span>
              <span>{questions.length - answeredCount} Left</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Interruption / Security Lock Fullscreen Overlay */}
      {isLocked && (
        <div className="arena-lock-overlay">
          <div className="arena-lock-card">
            <div className="lock-icon">🔒</div>
            <h3 className="lock-title">Exam Interrupted &amp; Locked</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              Your examination session has been suspended by the proctoring engine.
            </p>

            <div className="lock-reason-box">
              <strong>Reason: </strong>
              {lockReason || 'Security violation: window focus loss or network interruption.'}
            </div>

            {resumeRequested ? (
              <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
                <p style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>
                  Resumption Request Submitted!
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                  Please inform the examination invigilator/proctor to approve your request.
                </p>
                <div className="lock-status-pulse">
                  <span className="pulse-dot" />
                  <span>Checking for invigilator approval every 5 seconds...</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRequestResume} className="lock-form">
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Explain Reason for Interruption:
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g., Accidental tab switch, electrical surge, or network reconnect..."
                  value={resumeReason}
                  onChange={(e) => setResumeReason(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text-primary)',
                    padding: '0.75rem',
                    fontSize: '0.9rem',
                    resize: 'none',
                  }}
                />
                <Button variant="primary" type="submit" loading={resumeSubmitting} style={{ width: '100%' }}>
                  Submit Resumption Request
                </Button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Confirm Examination Submission"
      >
        <div style={{ padding: '0.5rem 0' }}>
          <p style={{ marginBottom: '1.25rem', color: 'var(--color-text-secondary)' }}>
            Are you sure you want to finish and submit your exam? Once submitted, your responses are finalized
            and you cannot re-enter.
          </p>

          <div
            style={{
              background: 'var(--color-bg-tertiary)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1rem',
              textAlign: 'center',
              marginBottom: '1.5rem',
            }}
          >
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-success)' }}>
                {answeredCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Answered</div>
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#8b5cf6' }}>
                {markedCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Marked</div>
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-danger)' }}>
                {unansweredCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Unanswered</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button variant="ghost" onClick={() => setShowSubmitModal(false)}>
              Continue Answering
            </Button>
            <Button variant="danger" onClick={handleConfirmSubmit} loading={submitting}>
              Yes, Submit Exam
            </Button>
          </div>
        </div>
      </Modal>

      {/* Examination Instructions & Symbol Reference Modal */}
      <Modal
        isOpen={showInstructionsModal}
        onClose={() => setShowInstructionsModal(false)}
        title="Examination Instructions & Reference Guide"
        size="lg"
      >
        <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {attempt?.instructions && (
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.85rem', borderRadius: 'var(--radius-md)', color: '#d97706', fontSize: '0.85rem' }}>
              <strong>Notice: </strong> {attempt.instructions}
            </div>
          )}

          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
              1. Question Palette Symbols
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ width: '1.25rem', height: '1.25rem', borderRadius: '4px', background: '#10b981', display: 'inline-block' }} />
                <span><strong>Answered:</strong> Evaluated for score</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ width: '1.25rem', height: '1.25rem', borderRadius: '4px', background: '#ef4444', display: 'inline-block' }} />
                <span><strong>Not Answered:</strong> Visited, unselected</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ width: '1.25rem', height: '1.25rem', borderRadius: '4px', background: '#8b5cf6', display: 'inline-block' }} />
                <span><strong>Marked for Review:</strong> Flagged</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ width: '1.25rem', height: '1.25rem', borderRadius: '4px', background: '#94a3b8', display: 'inline-block' }} />
                <span><strong>Not Visited:</strong> Not opened yet</span>
              </div>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
              2. Navigation &amp; Answering
            </h4>
            <ul style={{ fontSize: '0.825rem', color: 'var(--color-text-secondary)', lineHeight: '1.6', paddingLeft: '1.2rem', margin: 0 }}>
              <li>Click on any option to choose your answer. Responses are saved automatically to the cloud server in real time.</li>
              <li>Use <strong>Clear Response</strong> to remove an option choice if you do not want to answer.</li>
              <li>Click <strong>Next →</strong> or <strong>← Previous</strong> or click question numbers in the palette on the right to navigate.</li>
              <li>Use stream tabs on the palette to filter questions by subject section.</li>
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', color: '#ef4444' }}>
              3. Proctoring &amp; Security
            </h4>
            <ul style={{ fontSize: '0.825rem', color: 'var(--color-text-secondary)', lineHeight: '1.6', paddingLeft: '1.2rem', margin: 0 }}>
              <li><strong>Do not exit fullscreen:</strong> Doing so records a security event.</li>
              <li><strong>Do not switch tabs or windows:</strong> Tab switches trigger an automated lockout.</li>
              <li><strong>Automatic submission:</strong> The exam submits automatically once the countdown reaches 00:00:00.</li>
            </ul>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
            <Button variant="primary" size="sm" onClick={() => setShowInstructionsModal(false)}>
              Back to Test
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
