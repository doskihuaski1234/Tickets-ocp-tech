import React, { useState } from 'react';
import { authService } from '../services/api';

interface MiPerfilProps {
  user: { email: string; role: string; name: string } | null;
  onProfileUpdated: (token: string, user: { email: string; role: string; name: string }) => void;
}

export const MiPerfil: React.FC<MiPerfilProps> = ({ user, onProfileUpdated }) => {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    if (!token) {
      setError('No hay sesión activa');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const payload: Record<string, string> = { name, email };

      if (currentPassword) {
        payload.currentPassword = currentPassword;
      }

      if (newPassword) {
        payload.password = newPassword;
      }

      const data = await authService.updateProfile(token, payload);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setMessage(data.message || 'Perfil actualizado correctamente');
      onProfileUpdated(data.token, data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_15px_35px_rgba(15,23,42,0.06)] sm:p-6">
      <div className="mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Cuenta</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-800">Mi perfil</h2>
        <p className="mt-2 text-sm text-slate-500">Puedes cambiar tu nombre, correo y contraseña desde aquí.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Nombre</label>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Correo electrónico</label>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Contraseña actual</label>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Solo si deseas cambiar la contraseña"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Nueva contraseña</label>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Deja vacío si no quieres cambiarla"
          />
        </div>

        {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        {message && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-600">{message}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-gradient-to-r from-slate-900 to-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-[0_15px_30px_rgba(15,23,42,0.18)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
};

export default MiPerfil;
