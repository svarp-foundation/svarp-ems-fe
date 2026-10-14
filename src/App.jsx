import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute, ADMIN_ROLES } from './components/ProtectedRoute';
import { AdminLayout } from './components/Layout/AdminLayout';
import { Login } from './pages/Login/Login';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { Streams } from './pages/Streams/Streams';
import { Questions } from './pages/Questions/Questions';
import { Exams } from './pages/Exams/Exams';
import { Attempts } from './pages/Attempts/Attempts';
import { ExamArena } from './pages/Candidate/ExamArena';
import { ExamInstructions } from './pages/Candidate/ExamInstructions';
import { CandidatePortal } from './pages/Candidate/CandidatePortal';
import { Results } from './pages/Results/Results';
import { Audit } from './pages/Audit/Audit';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ErrorBoundary>
          <BrowserRouter>
          <Routes>
            {/* Public Authentication Route */}
            <Route path="/login" element={<Login />} />

            {/* Candidate Portal: Dashboard for enrolled students */}
            <Route
              path="/candidate"
              element={
                <ProtectedRoute>
                  <CandidatePortal />
                </ProtectedRoute>
              }
            />

            {/* Candidate Pre-Examination Instructions & Readiness Gatekeeper */}
            <Route
              path="/instructions/:examId"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <ExamInstructions />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />

            {/* Candidate Fullscreen Examination Arena */}
            <Route
              path="/arena/:examId"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <ExamArena />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />

            {/* Protected Administration Routes (Admin, Staff, Proctor, Evaluator only) */}
            <Route
              path="/"
              element={
                <ProtectedRoute allowedRoles={ADMIN_ROLES} redirectTo="/candidate">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="streams" element={<Streams />} />

              {/* Questions, Exams, Attempts, Results, Audit */}
              <Route path="questions" element={<Questions />} />
              <Route path="exams" element={<Exams />} />
              <Route path="attempts" element={<Attempts />} />
              <Route path="results" element={<Results />} />
              <Route path="audit" element={<Audit />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
      </ToastProvider>
    </AuthProvider>
  );
}
