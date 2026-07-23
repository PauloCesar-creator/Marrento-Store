import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, ShieldCheck, AlertCircle, LogIn } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    setTimeout(() => {
      if (username.trim().toLowerCase() === 'admin' && password === 'admin') {
        localStorage.setItem('marento_auth_user', 'admin');
        localStorage.setItem('marento_auth_token', 'logged_in_admin');
        onLoginSuccess();
        onClose();
        setUsername('');
        setPassword('');
      } else {
        setErrorMessage('Usuário ou senha incorretos.');
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      id="login-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-brand-secondary border border-brand-tertiary p-6 shadow-2xl overflow-hidden"
        id="login-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-brand-tertiary pb-4" id="login-modal-header">
          <div className="flex items-center gap-3" id="login-modal-title-group">
            <div className="p-2.5 rounded-xl bg-brand-primary/10 border border-brand-primary/30 text-brand-primary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg text-brand-neutral" id="login-modal-title">
                Acesso Restrito
              </h2>
              <p className="text-xs text-gray-400" id="login-modal-subtitle">
                Área de Relatórios e Gestão
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-brand-bg transition cursor-pointer"
            id="login-modal-close-btn"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="py-5 space-y-4" id="login-modal-form">
          {errorMessage && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2" id="login-modal-error">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Username Input */}
          <div className="space-y-1.5" id="login-group-username">
            <label className="block text-xs font-semibold text-gray-300" htmlFor="login-username">
              Usuário:
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                <User className="w-4 h-4 text-brand-primary" />
              </div>
              <input
                id="login-username"
                type="text"
                required
                autoFocus
                placeholder="Digite o usuário..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-brand-bg border border-brand-tertiary rounded-xl text-brand-neutral text-xs focus:outline-none focus:border-brand-primary transition"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5" id="login-group-password">
            <label className="block text-xs font-semibold text-gray-300" htmlFor="login-password">
              Senha:
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                <Lock className="w-4 h-4 text-brand-primary" />
              </div>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Digite a senha..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 bg-brand-bg border border-brand-tertiary rounded-xl text-brand-neutral text-xs focus:outline-none focus:border-brand-primary transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white cursor-pointer"
                id="login-toggle-pwd-btn"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-brand-primary text-black font-bold text-xs hover:bg-brand-primary/90 transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            id="login-submit-btn"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Autenticando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}
