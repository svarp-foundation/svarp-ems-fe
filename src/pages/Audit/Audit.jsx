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
  Shield,
  Activity,
  Lock,
  Users,
  Eye,
  RefreshCw,
  FileCode,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const Audit = () => {
  const [activeTab, setActiveTab] = useState('trail');
  const [logs, setLogs] = useState([]);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [searchActor, setSearchActor] = useState('');
  const [eventFilter, setEventFilter] = useState('');

  // JSON Details Modal
  const [inspectedPayload, setInspectedPayload] = useState(null);

  // Load audit data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [logsData, eventsData, statsData] = await Promise.all([
        api
          .getAuditLogs({
            action: actionFilter || undefined,
            actor_email: searchActor.trim() || undefined,
            limit: 100,
          })
          .catch(() => []),
        api
          .getExamEvents({
            event_type: eventFilter || undefined,
            limit: 100,
          })
          .catch(() => []),
        api.getAuditStats().catch(() => null),
      ]);

      setLogs(Array.isArray(logsData) ? logsData : []);
      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load audit data:', err);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, searchActor, eventFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatTime = (ts) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleString([], {
      dateStyle: 'short',
      timeStyle: 'medium',
    });
  };

  const getActionBadge = (action) => {
    const act = (action || '').toUpperCase();
    if (act.includes('LOGIN') || act.includes('SESSION')) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          {action}
        </span>
      );
    }
    if (
      act.includes('EXAM') ||
      act.includes('STREAM') ||
      act.includes('QUESTION')
    ) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
          {action}
        </span>
      );
    }
    if (act.includes('ATTEMPT') || act.includes('SAVE')) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
          {action}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
        {action}
      </span>
    );
  };

  // Audit Logs Table Columns
  const logColumns = [
    {
      key: 'created_at',
      header: 'Timestamp',
      width: '180px',
      render: (ts) => (
        <span className="font-mono text-xs text-slate-500">
          {formatTime(ts)}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (action) => getActionBadge(action),
    },
    {
      key: 'actor_email',
      header: 'Actor',
      render: (email, row) => (
        <div>
          <p className="font-bold text-xs text-slate-900">
            {email || 'System'}
          </p>
          {row.actor_id && (
            <p className="font-mono text-[10px] text-slate-400">
              {row.actor_id.slice(0, 8)}...
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'target_type',
      header: 'Target',
      render: (type, row) => (
        <span className="text-xs text-slate-700">
          {type || '—'}{' '}
          {row.target_id ? `(${row.target_id.slice(0, 8)}...)` : ''}
        </span>
      ),
    },
    {
      key: 'ip_address',
      header: 'IP Address',
      render: (ip) => (
        <span className="font-mono text-xs text-slate-500">{ip || '—'}</span>
      ),
    },
    {
      key: 'details',
      header: 'Details',
      align: 'right',
      render: (details) =>
        details ? (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setInspectedPayload(details)}
            icon={Eye}
          >
            JSON
          </Button>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        ),
    },
  ];

  // Proctoring Events Table Columns
  const eventColumns = [
    {
      key: 'created_at',
      header: 'Timestamp',
      width: '180px',
      render: (ts) => (
        <span className="font-mono text-xs text-slate-500">
          {formatTime(ts)}
        </span>
      ),
    },
    {
      key: 'event_type',
      header: 'Violation Event',
      render: (type) => {
        const isFullscreen = type === 'fullscreen_exit';
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
              isFullscreen
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            <span>{isFullscreen ? '🖥️' : '⚠️'}</span>
            <span>{type}</span>
          </span>
        );
      },
    },
    {
      key: 'attempt_id',
      header: 'Attempt ID',
      render: (id) => (
        <span className="font-mono text-xs text-slate-600">
          {id ? id.slice(0, 8) + '...' : '—'}
        </span>
      ),
    },
    {
      key: 'student_id',
      header: 'Student ID',
      render: (id) => (
        <span className="font-mono text-xs text-slate-600">
          {id ? id.slice(0, 8) + '...' : '—'}
        </span>
      ),
    },
    {
      key: 'ip_address',
      header: 'Client IP',
      render: (ip) => (
        <span className="font-mono text-xs text-slate-500">{ip || '—'}</span>
      ),
    },
    {
      key: 'details',
      header: 'Payload',
      align: 'right',
      render: (details) =>
        details ? (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setInspectedPayload(details)}
            icon={Eye}
          >
            JSON
          </Button>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security &amp; Audit Hub"
        subtitle="Immutable append-only trails of administrative operations, candidate proctoring events, and single-session locks"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            isLoading={loading}
            icon={RefreshCw}
          >
            Refresh Telemetry
          </Button>
        }
      />

      {/* KPI Cards using LMS StatCard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Audit Log Records"
          value={stats?.total_audit_logs || logs.length}
          sub="Immutable admin action trails"
          icon={Shield}
        />
        <StatCard
          label="Proctoring Events"
          value={stats?.total_proctoring_events || events.length}
          sub="Focus loss &amp; fullscreen exits"
          icon={Activity}
          valueColor="text-amber-700"
        />
        <StatCard
          label="Single Session Lock"
          value="Active"
          sub="PostgreSQL Partial Unique Index"
          icon={Lock}
          valueColor="text-emerald-700"
        />
        <StatCard
          label="Active Sessions"
          value={stats?.active_sessions_count || 1}
          sub="Unique active logins"
          icon={Users}
        />
      </div>

      {/* Tab Navigation matching LMS style */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs max-w-fit">
        {[
          { id: 'trail', label: `Administrative Audit Trail (${logs.length})` },
          { id: 'events', label: `Proctoring Events (${events.length})` },
          { id: 'architecture', label: 'Security Architecture' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Administrative Audit Trail */}
      {activeTab === 'trail' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">
                Action:
              </span>
              <select
                className="bg-white border border-slate-200 text-xs text-slate-800 rounded-lg py-1.5 px-3 focus:outline-none focus:border-[#1f3b45]"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <option value="">All Actions</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
                <option value="CREATE_EXAM">CREATE_EXAM</option>
                <option value="PUBLISH_EXAM">PUBLISH_EXAM</option>
                <option value="START_OR_RESUME_ATTEMPT">
                  START_OR_RESUME_ATTEMPT
                </option>
                <option value="SUBMIT_ATTEMPT">SUBMIT_ATTEMPT</option>
                <option value="APPROVE_RESUMPTION">APPROVE_RESUMPTION</option>
                <option value="SCORE_EXAM">SCORE_EXAM</option>
                <option value="UPDATE_RESULT_PUBLICATION">
                  UPDATE_RESULT_PUBLICATION
                </option>
              </select>
            </div>

            <div className="w-full sm:w-64">
              <SearchBar
                value={searchActor}
                onChange={(e) => setSearchActor(e.target.value)}
                placeholder="Search actor email..."
                size="sm"
              />
            </div>
          </div>

          <Table
            columns={logColumns}
            data={logs}
            loading={loading}
            emptyMessage="No administrative audit logs found for the selected criteria."
          />
        </div>
      )}

      {/* Tab 2: Proctoring Security Events */}
      {activeTab === 'events' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">
              Event Type:
            </span>
            <select
              className="bg-white border border-slate-200 text-xs text-slate-800 rounded-lg py-1.5 px-3 focus:outline-none focus:border-[#1f3b45]"
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
            >
              <option value="">All Security Events</option>
              <option value="tab_switch">tab_switch</option>
              <option value="fullscreen_exit">fullscreen_exit</option>
              <option value="focus_loss">focus_loss</option>
            </select>
          </div>

          <Table
            columns={eventColumns}
            data={events}
            loading={loading}
            emptyMessage="No candidate proctoring events recorded."
          />
        </div>
      )}

      {/* Tab 3: Security Invariants */}
      {activeTab === 'architecture' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <Shield size={22} className="text-[#1f3b45]" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Exam Portal Concurrency &amp; Integrity Invariants
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Core architectural guarantees built throughout Phase 01 to Phase 06
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Lock size={15} className="text-emerald-600" />
                <span>1. Single Session Lock</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enforced in PostgreSQL via a partial unique index on{' '}
                <code className="bg-slate-200/80 px-1 rounded text-[11px]">
                  exam_sessions(user_id) WHERE is_active = true
                </code>
                . Concurrent logins are blocked with HTTP 409 Conflict.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <CheckCircle2 size={15} className="text-indigo-600" />
                <span>2. Immutable Question Versioning</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Questions are never overwritten in place. Each modification
                creates an immutable version snapshot. Historical papers stay
                locked permanently to the allocated version.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Activity size={15} className="text-amber-600" />
                <span>3. Timing Invariant on Resumption</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Invigilator resumption approval unlocks the attempt but strictly
                preserves the original examination deadline. Resumption never
                silently grants extra unmonitored time.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Shield size={15} className="text-emerald-700" />
                <span>4. Publication Gatekeeper</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Scores, correct option keys, and explanations are withheld at the
                API level until explicitly released by the administrator.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* JSON Payload Inspector Modal */}
      <Modal
        isOpen={Boolean(inspectedPayload)}
        onClose={() => setInspectedPayload(null)}
        title="Event Payload Inspector"
        subtitle="Raw JSON attributes logged in append-only telemetry stream"
        maxWidth="540px"
        footer={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setInspectedPayload(null)}
          >
            Close
          </Button>
        }
      >
        <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto max-h-72">
          {JSON.stringify(inspectedPayload, null, 2)}
        </pre>
      </Modal>
    </div>
  );
};

export default Audit;
