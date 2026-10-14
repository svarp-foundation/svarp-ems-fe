import { API_BASE_URL, STORAGE_KEYS } from '../utils/constants';

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  getToken() {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  }

  setToken(token) {
    if (token) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
    }
  }

  _buildQueryString(params = {}) {
    if (!params || typeof params !== 'object') return '';
    const cleaned = Object.entries(params).filter(
      ([_, v]) => v !== undefined && v !== null && v !== '' && v !== 'undefined'
    );
    return new URLSearchParams(cleaned).toString();
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutMs = options.timeout || 15000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: options.signal || controller.signal,
      });
      clearTimeout(timeoutId);

      // Parse response JSON if possible
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        if (response.status === 401 && !endpoint.includes('/auth/login')) {
          this.setToken(null);
          localStorage.removeItem(STORAGE_KEYS.USER);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
          }
        }

        let errorMsg = `Request failed with status ${response.status}`;
        if (data && data.detail) {
          if (typeof data.detail === 'string') {
            errorMsg = data.detail;
          } else if (Array.isArray(data.detail)) {
            errorMsg = data.detail
              .map((d) => d.msg || JSON.stringify(d))
              .join('; ');
          } else if (typeof data.detail === 'object') {
            errorMsg = JSON.stringify(data.detail);
          }
        }
        const error = new Error(errorMsg);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        const timeoutError = new Error('Request timed out. Please verify the backend service is running.');
        timeoutError.status = 408;
        throw timeoutError;
      }
      // Re-throw formatted error
      throw err;
    }
  }

  // Auth Endpoints
  async login(email, password, bypassKey = null) {
    const payload = { email, password };
    const headers = {};
    if (bypassKey) {
      payload.bypass_key = bypassKey;
      headers['X-Session-Bypass-Key'] = bypassKey;
    }
    const data = await this.request('/auth/login', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (data.access_token) {
      this.setToken(data.access_token);
    }
    return data;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  }

  async getSession() {
    return this.request('/auth/session', { method: 'GET' });
  }

  async heartbeat() {
    return this.request('/auth/heartbeat', { method: 'POST' });
  }

  // Stream Endpoints
  async getStreams(params = {}) {
    const query = this._buildQueryString(params);
    const endpoint = query ? `/streams?${query}` : '/streams';
    return this.request(endpoint, { method: 'GET' });
  }

  async getStream(id) {
    return this.request(`/streams/${id}`, { method: 'GET' });
  }

  async createStream(streamData) {
    return this.request('/streams', {
      method: 'POST',
      body: JSON.stringify(streamData),
    });
  }

  async updateStream(id, streamData) {
    return this.request(`/streams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(streamData),
    });
  }

  // Question Bank Endpoints
  async getQuestions(params = {}) {
    const query = this._buildQueryString(params);
    const endpoint = query ? `/questions?${query}` : '/questions';
    return this.request(endpoint, { method: 'GET' });
  }

  async getStreamQuestionStats() {
    return this.request('/questions/stream-stats', { method: 'GET' });
  }

  async getQuestion(id) {
    return this.request(`/questions/${id}`, { method: 'GET' });
  }

  async createQuestion(questionData) {
    return this.request('/questions', {
      method: 'POST',
      body: JSON.stringify(questionData),
    });
  }

  async updateQuestion(id, questionData) {
    return this.request(`/questions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(questionData),
    });
  }

  async deleteQuestion(id) {
    return this.request(`/questions/${id}`, {
      method: 'DELETE',
    });
  }

  async getQuestionVersions(id) {
    return this.request(`/questions/${id}/versions`, { method: 'GET' });
  }

  async importQuestions(file) {
    const formData = new FormData();
    formData.append('file', file);

    const token = this.getToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}/questions/import`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401) {
        this.setToken(null);
        localStorage.removeItem(STORAGE_KEYS.USER);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
      }
      const error = new Error(data.detail || 'Import failed');
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  async downloadQuestionTemplate() {
    const token = this.getToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}/questions/template`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.setToken(null);
        localStorage.removeItem(STORAGE_KEYS.USER);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
      }
      throw new Error('Failed to download template');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'question_bank_template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  // Exam Builder Endpoints
  async getExams(params = {}) {
    const query = this._buildQueryString(params);
    const endpoint = query ? `/exams?${query}` : '/exams';
    return this.request(endpoint, { method: 'GET' });
  }

  async getExam(id) {
    return this.request(`/exams/${id}`, { method: 'GET' });
  }

  async createExam(examData) {
    return this.request('/exams', {
      method: 'POST',
      body: JSON.stringify(examData),
    });
  }

  async updateExam(id, examData) {
    return this.request(`/exams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(examData),
    });
  }

  async deleteExam(id) {
    return this.request(`/exams/${id}`, { method: 'DELETE' });
  }

  async validateExamQuotas(id) {
    return this.request(`/exams/${id}/validate`, { method: 'POST' });
  }

  async publishExam(id) {
    return this.request(`/exams/${id}/publish`, { method: 'POST' });
  }

  async getExamEnrollments(id) {
    return this.request(`/exams/${id}/enrollments`, { method: 'GET' });
  }

  async enrollStudents(id, students) {
    return this.request(`/exams/${id}/enroll`, {
      method: 'POST',
      body: JSON.stringify({ students }),
    });
  }

  async withdrawStudent(id, studentId) {
    return this.request(`/exams/${id}/enroll/${studentId}`, {
      method: 'DELETE',
    });
  }

  async previewPaper(id) {
    return this.request(`/exams/${id}/preview-paper`, { method: 'POST' });
  }

  async downloadCandidateTemplate() {
    const token = this.getToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}/exams/enroll/template`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.setToken(null);
        localStorage.removeItem(STORAGE_KEYS.USER);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
      }
      throw new Error('Failed to download candidate template');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'candidate_enrollment_template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  async validateCandidateFile(examId, file) {
    const formData = new FormData();
    formData.append('file', file);

    const token = this.getToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}/exams/${examId}/enroll/validate-file`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401) {
        this.setToken(null);
        localStorage.removeItem(STORAGE_KEYS.USER);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
      }
      const error = new Error(data.detail || 'Validation failed');
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  // Attempt & Arena Endpoints
  async getAvailableExams() {
    return this.request('/attempts/available', { method: 'GET' });
  }

  async getExamInstructions(examId) {
    return this.request(`/attempts/instructions/${examId}`, { method: 'GET' });
  }

  async startAttempt(examId) {
    return this.request(`/attempts/start/${examId}`, { method: 'POST', timeout: 45000 });
  }

  async saveAnswer(attemptId, answerData) {
    return this.request(`/attempts/${attemptId}/save-answer`, {
      method: 'POST',
      body: JSON.stringify(answerData),
    });
  }

  async sendAttemptHeartbeat(attemptId) {
    return this.request(`/attempts/${attemptId}/heartbeat`, { method: 'POST' });
  }

  async logExamEvent(attemptId, eventData) {
    return this.request(`/attempts/${attemptId}/log-event`, {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }

  async submitAttempt(attemptId) {
    return this.request(`/attempts/${attemptId}/submit`, { method: 'POST' });
  }

  async requestResume(attemptId, reason) {
    return this.request(`/attempts/${attemptId}/request-resume`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async getAdminAttempts(params = {}) {
    const query = this._buildQueryString(params);
    const endpoint = query ? `/attempts/admin/all?${query}` : '/attempts/admin/all';
    return this.request(endpoint, { method: 'GET' });
  }

  async approveResumption(attemptId) {
    return this.request(`/attempts/admin/resume/${attemptId}`, { method: 'POST' });
  }

  // Scoring, Results & Publication Endpoints
  async getExamResults(examId) {
    return this.request(`/results/exam/${examId}`, { method: 'GET' });
  }

  async getExamAnalytics(examId) {
    return this.request(`/results/exam/${examId}/analytics`, { method: 'GET' });
  }

  async triggerScoring(examId) {
    return this.request(`/results/score-exam/${examId}`, { method: 'POST' });
  }

  async getPublicationStatus(examId) {
    return this.request(`/results/publication/${examId}`, { method: 'GET' });
  }

  async updatePublicationStatus(examId, config) {
    return this.request(`/results/publication/${examId}`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async getCandidateResultDetails(examId, studentId) {
    return this.request(`/results/candidate/${examId}/${studentId}`, { method: 'GET' });
  }

  async getMyResult(examId) {
    return this.request(`/results/my-result/${examId}`, { method: 'GET' });
  }

  async downloadExamResultsCSV(examId, examTitle = 'exam') {
    const token = this.getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${this.baseUrl}/results/exam/${examId}/export`, {
      method: 'GET',
      headers,
    });
    if (!res.ok) throw new Error('Failed to download CSV export');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${examTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_results.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  // Security Audit Hub Endpoints
  async getAuditLogs(params = {}) {
    const query = this._buildQueryString(params);
    const endpoint = query ? `/audit/logs?${query}` : '/audit/logs';
    return this.request(endpoint, { method: 'GET' });
  }

  async getExamEvents(params = {}) {
    const query = this._buildQueryString(params);
    const endpoint = query ? `/audit/events?${query}` : '/audit/events';
    return this.request(endpoint, { method: 'GET' });
  }

  async getAuditStats() {
    return this.request('/audit/stats', { method: 'GET' });
  }
}

export const api = new ApiClient(API_BASE_URL);

