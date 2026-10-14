export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5008/api/v1';

export const STORAGE_KEYS = {
  TOKEN: 'exam_portal_token',
  USER: 'exam_portal_user',
};

export const ROLES = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  EXAM_ADMIN: 'Exam Admin',
  EVALUATOR: 'Evaluator',
  REVIEWER: 'Reviewer',
  STUDENT: 'Student',
};

export const STREAM_STATUS = {
  ACTIVE: 'Active',
  ARCHIVED: 'Archived',
};
