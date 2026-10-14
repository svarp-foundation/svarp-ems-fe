import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/client';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Table } from '../../components/common/Table';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { SearchBar } from '../../components/common/SearchBar';
import { Plus, Edit2, Check, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const Streams = () => {
  const { toast } = useToast();
  const [streams, setStreams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStream, setEditingStream] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    is_active: true,
  });
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStreams = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (statusFilter === 'active') params.active_only = true;
      if (statusFilter === 'all' || statusFilter === 'inactive') params.active_only = false;
      const data = await api.getStreams(params);
      let list = Array.isArray(data) ? data : data.items || [];
      if (statusFilter === 'inactive') {
        list = list.filter((s) => !s.is_active);
      }
      setStreams(list);
    } catch (err) {
      console.error('Failed to load streams:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchStreams();
  }, [fetchStreams]);

  const handleOpenCreate = () => {
    setEditingStream(null);
    setFormData({ name: '', code: '', description: '', is_active: true });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (stream) => {
    setEditingStream(stream);
    setFormData({
      name: stream.name,
      code: stream.code,
      description: stream.description || '',
      is_active: stream.is_active,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStream(null);
    setFormError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (editingStream) {
        await api.updateStream(editingStream.id, {
          name: formData.name,
          code: formData.code.toUpperCase(),
          description: formData.description,
          is_active: formData.is_active,
        });
      } else {
        await api.createStream({
          name: formData.name,
          code: formData.code.toUpperCase(),
          description: formData.description,
        });
      }
      handleCloseModal();
      fetchStreams();
    } catch (err) {
      setFormError(err.message || 'Operation failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (stream) => {
    try {
      await api.updateStream(stream.id, {
        is_active: !stream.is_active,
      });
      fetchStreams();
      toast.success(`Stream ${stream.name} is now ${!stream.is_active ? 'Active' : 'Inactive'}`);
    } catch (err) {
      toast.error(err.message || 'Failed to update stream status');
    }
  };

  const filteredStreams = streams.filter((s) => {
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
  });

  const columns = [
    {
      key: 'code',
      header: 'Stream Code',
      width: '130px',
      render: (code) => (
        <span className="inline-block px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-100 text-[#1f3b45] border border-slate-200">
          {code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Subject Stream Name',
      render: (name, row) => (
        <div>
          <div className="font-bold text-slate-900 text-xs">{name}</div>
          {row.description && (
            <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
              {row.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      width: '120px',
      render: (isActive) => (
        <StatusBadge status={isActive ? 'Active' : 'Inactive'} />
      ),
    },
    {
      key: 'created_at',
      header: 'Created On',
      width: '140px',
      render: (date) => (
        <span className="text-slate-500 text-xs">
          {date ? new Date(date).toLocaleDateString() : '—'}
        </span>
      ),
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
            variant={row.is_active ? 'ghost' : 'outline'}
            size="xs"
            onClick={() => handleToggleStatus(row)}
            className={row.is_active ? 'text-amber-700 hover:text-amber-800' : 'text-emerald-700'}
          >
            {row.is_active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subject Streams"
        subtitle="Organize exams, question categories, and difficulty allocation quotas"
        actions={
          <Button
            variant="emerald"
            size="sm"
            onClick={handleOpenCreate}
            icon={Plus}
          >
            Create Stream
          </Button>
        }
      />

      {/* Search & Filter Toolbar matching LMS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <SearchBar
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stream name or code..."
            size="sm"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          {[
            { id: 'all', label: 'All Streams' },
            { id: 'active', label: 'Active' },
            { id: 'inactive', label: 'Inactive' },
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

      {/* Streams Table */}
      <Table
        columns={columns}
        data={filteredStreams}
        isLoading={isLoading}
        emptyMessage={
          searchQuery
            ? 'No streams match your search query.'
            : 'No subject streams created yet. Click "+ Create Stream" to begin.'
        }
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingStream ? 'Edit Subject Stream' : 'Create New Subject Stream'}
        subtitle={
          editingStream
            ? 'Update the details for this subject category.'
            : 'Add a new subject stream for organizing questions and papers.'
        }
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCloseModal}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              isLoading={isSubmitting}
            >
              {editingStream ? 'Save Changes' : 'Create Stream'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-medium">
              {formError}
            </div>
          )}

          <Input
            id="stream-name"
            label="Subject Stream Name"
            placeholder="e.g. Physics & Mechanics"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            id="stream-code"
            label="Stream Code"
            placeholder="e.g. PHY-01"
            value={formData.code}
            onChange={(e) =>
              setFormData({ ...formData, code: e.target.value.toUpperCase() })
            }
            required
            helperText="Short uppercase alphanumeric code used in assessment papers"
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              id="stream-desc"
              rows={3}
              placeholder="Outline subject domains, topics, or eligibility criteria..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-lg p-2.5 placeholder-slate-400 focus:outline-none focus:border-[#1f3b45] focus:ring-1 focus:ring-[#1f3b45] transition-all"
            />
          </div>

          {editingStream && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="is-active"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <label
                htmlFor="is-active"
                className="text-xs font-medium text-slate-700 cursor-pointer"
              >
                Stream is Active &amp; available for new questions
              </label>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
};

export default Streams;
