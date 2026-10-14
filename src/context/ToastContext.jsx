import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X, Trash2, HelpCircle } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const addToast = useCallback((message, type = 'info', title = null, duration = 4500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const newToast = { id, message, type, title };
    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useRef({
    success: (msg, title) => addToast(msg, 'success', title),
    error: (msg, title) => addToast(msg, 'error', title),
    warning: (msg, title) => addToast(msg, 'warning', title),
    info: (msg, title) => addToast(msg, 'info', title),
  }).current;

  // App-based Confirmation Dialog
  const confirm = useCallback(({
    title = 'Please Confirm',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
  }) => {
    return new Promise((resolve) => {
      setConfirmDialog({
        title,
        message,
        confirmText,
        cancelText,
        variant,
        onConfirm: () => {
          setConfirmDialog(null);
          resolve(true);
        },
        onCancel: () => {
          setConfirmDialog(null);
          resolve(false);
        },
      });
    });
  }, []);

  // Intercept native browser alert and confirm so no native popup ever shows
  useEffect(() => {
    const originalAlert = window.alert;
    const originalConfirm = window.confirm;

    window.alert = (msg) => {
      addToast(String(msg), 'info', 'Notice');
    };

    return () => {
      window.alert = originalAlert;
      window.confirm = originalConfirm;
    };
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toast, addToast, removeToast, confirm }}>
      {children}

      {/* App-based Floating Toast Container */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-2"
      >
        {toasts.map((t) => {
          let borderCls = 'border-slate-200 bg-white text-slate-800';
          let icon = <Info size={18} className="text-blue-600 flex-shrink-0" />;

          if (t.type === 'success') {
            borderCls = 'border-emerald-200 bg-white text-emerald-950 shadow-emerald-500/5';
            icon = <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />;
          } else if (t.type === 'error') {
            borderCls = 'border-rose-200 bg-white text-rose-950 shadow-rose-500/5';
            icon = <AlertCircle size={18} className="text-rose-600 flex-shrink-0" />;
          } else if (t.type === 'warning') {
            borderCls = 'border-amber-200 bg-white text-amber-950 shadow-amber-500/5';
            icon = <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />;
          }

          return (
            <div
              key={t.id}
              role="alert"
              className={`pointer-events-auto rounded-xl p-3.5 shadow-xl border flex items-start gap-3 transition-all transform animate-slideInRight ${borderCls}`}
            >
              <div className="mt-0.5">{icon}</div>
              <div className="flex-1 text-xs leading-relaxed">
                {t.title && <div className="font-bold mb-0.5 text-slate-900">{t.title}</div>}
                <div className="font-medium text-slate-700">{t.message}</div>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-100 transition-colors ml-1 -mr-1 cursor-pointer"
                aria-label="Close notification"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>

      {/* App-based Confirmation Dialog Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div
            className="w-full max-w-md bg-white rounded-2xl md:rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden relative animate-scaleUp"
            role="dialog"
            aria-modal="true"
          >
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-2xs ${
                    confirmDialog.variant === 'danger'
                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                      : 'bg-amber-50 border-amber-200 text-amber-600'
                  }`}
                >
                  {confirmDialog.variant === 'danger' ? (
                    <Trash2 size={22} />
                  ) : (
                    <HelpCircle size={22} />
                  )}
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {confirmDialog.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {confirmDialog.message}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={confirmDialog.onCancel}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 font-semibold text-xs transition-all cursor-pointer"
                >
                  {confirmDialog.cancelText}
                </button>
                <button
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  autoFocus
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs text-white transition-all shadow-sm active:scale-95 cursor-pointer ${
                    confirmDialog.variant === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                      : 'bg-[#1f3b45] hover:bg-[#152930]'
                  }`}
                >
                  {confirmDialog.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
