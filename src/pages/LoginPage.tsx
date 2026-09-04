import React, { useState } from 'react';
import { authService } from '../services/api';

interface LoginPageProps {
  onLogin: (
    token: string,
    user: {
      email: string;
      role: string;
      name: string;
    }
  ) => void;
}

type ViewMode = 'login' | 'register' | 'recovery';

type LoginUser = {
  id?: number | string;
  email?: string;
  role?: string;
  rol?: string;
  name?: string;
  nombre?: string;
};

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('login');

  // LOGIN
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // REGISTRO
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');

  // RECUPERACIÓN
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ESTADOS
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  const clearAlerts = () => {
    setError('');
    setMessage('');
  };

  // ============================================================
  // LOGIN
  // ============================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    clearAlerts();

    if (!email.trim() || !password) {
      setError('Ingresa tu correo electrónico y contraseña');
      return;
    }

    setLoading(true);

    try {
      const data = await authService.login(
        email.trim(),
        password
      );

      console.log('Respuesta del login:', data);

      if (!data || !data.token) {
        throw new Error('El servidor no devolvió un token válido');
      }

      /*
       * El backend actualmente devuelve:
       *
       * {
       *   success: true,
       *   token: "...",
       *   user: {
       *     id: 1,
       *     name: "Administrador",
       *     email: "admin@empresa.com",
       *     role: "admin"
       *   }
       * }
       *
       * También soportamos "usuario" por compatibilidad.
       */

      const usuario: LoginUser =
        (data as { user?: LoginUser; usuario?: LoginUser }).user ||
        (data as { user?: LoginUser; usuario?: LoginUser }).usuario ||
        {};

      const role = String(
        usuario.role || usuario.rol || ''
      ).toLowerCase();

      const name =
        usuario.name ||
        usuario.nombre ||
        'Usuario';

      const userEmail =
        usuario.email ||
        email.trim().toLowerCase();

      if (!role) {
        throw new Error(
          'El servidor no devolvió el rol del usuario'
        );
      }

      /*
       * IMPORTANTE:
       * Guardamos exactamente la estructura que utiliza App.tsx.
       */

      const user = {
        email: userEmail,
        role,
        name,
      };

      localStorage.setItem(
        'token',
        data.token
      );

      localStorage.setItem(
        'user',
        JSON.stringify(user)
      );

      /*
       * Mostrar en consola qué rol recibió el frontend.
       * Esto nos sirve para comprobar que el administrador
       * realmente está llegando como "admin".
       */

      console.log(
        'Usuario autenticado:',
        user
      );

      /*
       * Enviar usuario y token a App.tsx.
       */
      onLogin(
        data.token,
        user
      );

    } catch (err) {
      console.error(
        'Error iniciando sesión:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Correo o contraseña incorrectos'
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // REGISTRO
  // ============================================================

  const handleRegister = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    clearAlerts();

    if (!registerName.trim()) {
      setError('Ingresa tu nombre completo');
      return;
    }

    if (!registerEmail.trim()) {
      setError('Ingresa tu correo electrónico');
      return;
    }

    if (registerPassword.length < 8) {
      setError(
        'La contraseña debe tener al menos 8 caracteres'
      );
      return;
    }

    if (
      registerPassword !==
      registerConfirmPassword
    ) {
      setError(
        'Las contraseñas no coinciden'
      );
      return;
    }

    setRegistering(true);

    try {
      const data = await authService.register(
        registerName.trim(),
        registerEmail.trim(),
        registerPassword,
        'tecnico'
      );

      setMessage(
        data.message ||
          'Cuenta creada correctamente. Ya puedes iniciar sesión.'
      );

      setEmail(
        registerEmail.trim()
      );

      setPassword('');

      setRegisterName('');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');

      setTimeout(() => {
        setViewMode('login');

        setMessage(
          'Cuenta creada correctamente. Ingresa con tu correo y contraseña.'
        );
      }, 1000);

    } catch (err) {
      console.error(
        'Error registrando usuario:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo crear la cuenta'
      );
    } finally {
      setRegistering(false);
    }
  };

  // ============================================================
  // RECUPERAR CONTRASEÑA
  // ============================================================

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError(
        'Ingresa tu correo para recuperar la contraseña'
      );
      return;
    }

    setRecovering(true);
    clearAlerts();

    try {
      const data =
        await authService.forgotPassword(
          email.trim()
        );

      setMessage(
        data.message ||
          'Se ha enviado la solicitud de recuperación'
      );

    } catch (err) {
      console.error(
        'Error recuperando contraseña:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo procesar la recuperación'
      );
    } finally {
      setRecovering(false);
    }
  };

  // ============================================================
  // RESTABLECER CONTRASEÑA
  // ============================================================

  const handleResetPassword = async () => {
    clearAlerts();

    if (
      !resetToken ||
      !newPassword ||
      !confirmPassword
    ) {
      setError(
        'Completa el token y la nueva contraseña'
      );
      return;
    }

    if (newPassword.length < 8) {
      setError(
        'La nueva contraseña debe tener al menos 8 caracteres'
      );
      return;
    }

    if (
      newPassword !== confirmPassword
    ) {
      setError(
        'Las contraseñas no coinciden'
      );
      return;
    }

    setResettingPassword(true);

    try {
      const data =
        await authService.resetPassword(
          resetToken,
          newPassword
        );

      setMessage(
        data.message ||
          'Contraseña actualizada correctamente'
      );

      setResetToken('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setViewMode('login');

        setMessage(
          'Contraseña actualizada. Ya puedes iniciar sesión.'
        );
      }, 1000);

    } catch (err) {
      console.error(
        'Error restableciendo contraseña:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo restablecer la contraseña'
      );
    } finally {
      setResettingPassword(false);
    }
  };

  // ============================================================
  // CAMBIAR VISTA
  // ============================================================

  const changeView = (
    view: ViewMode
  ) => {
    clearAlerts();
    setViewMode(view);
  };

  // ============================================================
  // INTERFAZ
  // ============================================================

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">

      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl shadow-slate-950/60 lg:grid lg:grid-cols-[1.05fr_0.95fr]">

        {/* PANEL IZQUIERDO */}

        <div className="relative hidden bg-gradient-to-br from-slate-800 via-slate-900 to-blue-700 p-8 text-white lg:flex lg:flex-col lg:justify-center">

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.35),transparent_35%)]" />

          <div className="relative z-10">

            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-2 backdrop-blur-sm">

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/80 text-sm font-bold text-white">
                T
              </div>

              <span className="text-xs font-semibold tracking-[0.28em] uppercase">
                Tickets
              </span>

            </div>

            <h1 className="text-4xl font-bold leading-tight">
              Tickets de OCP Tech
            </h1>

            <p className="mt-4 max-w-sm text-sm text-slate-200">
              Gestión segura y ordenada de servicios,
              incidencias y seguimiento técnico.
            </p>

            <div className="mt-8 space-y-3 text-sm text-slate-300">
              <p>✓ Registro de técnicos</p>
              <p>✓ Gestión de tickets</p>
              <p>✓ Seguimiento de servicios</p>
              <p>✓ Acceso seguro mediante contraseña</p>
            </div>

          </div>
        </div>

        {/* PANEL DERECHO */}

        <div className="bg-slate-50 p-6 sm:p-8 lg:p-10">

          <div className="mx-auto max-w-md">

            {/* TITULO */}

            <div className="mb-8 text-center lg:text-left">

              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">
                Acceso
              </p>

              <h2 className="mt-3 text-3xl font-bold text-slate-900">

                {viewMode === 'login' &&
                  'Iniciar sesión'}

                {viewMode === 'register' &&
                  'Crear cuenta'}

                {viewMode === 'recovery' &&
                  'Recuperar contraseña'}

              </h2>

              {viewMode === 'register' && (
                <p className="mt-2 text-sm text-slate-500">
                  Regístrate con tu correo electrónico
                  para acceder como técnico.
                </p>
              )}

            </div>

            {/* ALERTA ERROR */}

            {error && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* ALERTA ÉXITO */}

            {message && (
              <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-600">
                {message}
              </div>
            )}

            {/* ==================================================
                LOGIN
            ================================================== */}

            {viewMode === 'login' && (
              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >

                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Correo electrónico
                  </label>

                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    type="email"
                    placeholder="nombre@empresa.com"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    required
                  />

                </div>

                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Contraseña
                  </label>

                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    required
                  />

                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading
                    ? 'Ingresando...'
                    : 'Iniciar sesión'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    changeView('register')
                  }
                  className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  Crear una cuenta
                </button>

                <button
                  type="button"
                  onClick={() =>
                    changeView('recovery')
                  }
                  className="w-full text-sm font-medium text-slate-600 transition hover:text-slate-900"
                >
                  ¿Olvidaste tu contraseña?
                </button>

              </form>
            )}

            {/* ==================================================
                REGISTRO
            ================================================== */}

            {viewMode === 'register' && (
              <form
                onSubmit={handleRegister}
                className="space-y-5"
              >

                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Nombre completo
                  </label>

                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    type="text"
                    placeholder="Nombre y apellidos"
                    value={registerName}
                    onChange={(e) =>
                      setRegisterName(e.target.value)
                    }
                    required
                  />

                </div>

                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Correo electrónico
                  </label>

                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    type="email"
                    placeholder="nombre@empresa.com"
                    value={registerEmail}
                    onChange={(e) =>
                      setRegisterEmail(e.target.value)
                    }
                    required
                  />

                </div>

                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Contraseña
                  </label>

                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={registerPassword}
                    onChange={(e) =>
                      setRegisterPassword(e.target.value)
                    }
                    minLength={8}
                    required
                  />

                </div>

                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Confirmar contraseña
                  </label>

                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    type="password"
                    placeholder="Repite tu contraseña"
                    value={registerConfirmPassword}
                    onChange={(e) =>
                      setRegisterConfirmPassword(
                        e.target.value
                      )
                    }
                    minLength={8}
                    required
                  />

                </div>

                <button
                  type="submit"
                  disabled={registering}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {registering
                    ? 'Creando cuenta...'
                    : 'Crear cuenta'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    changeView('login')
                  }
                  className="w-full text-sm font-medium text-slate-600 transition hover:text-slate-900"
                >
                  ← Volver al inicio de sesión
                </button>

              </form>
            )}

            {/* ==================================================
                RECUPERACIÓN
            ================================================== */}

            {viewMode === 'recovery' && (
              <div className="space-y-5">

                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Correo electrónico
                  </label>

                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    type="email"
                    placeholder="nombre@empresa.com"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                  />

                </div>

                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={recovering}
                  className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {recovering
                    ? 'Enviando token...'
                    : 'Enviar token de recuperación'}
                </button>

                <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

                  <div>

                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Token recibido
                    </label>

                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      type="text"
                      placeholder="Pega el token de tu correo"
                      value={resetToken}
                      onChange={(e) =>
                        setResetToken(e.target.value)
                      }
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Nueva contraseña
                    </label>

                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      type="password"
                      placeholder="Nueva contraseña"
                      value={newPassword}
                      onChange={(e) =>
                        setNewPassword(e.target.value)
                      }
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Confirmar contraseña
                    </label>

                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      type="password"
                      placeholder="Confirma tu contraseña"
                      value={confirmPassword}
                      onChange={(e) =>
                        setConfirmPassword(e.target.value)
                      }
                    />

                  </div>

                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={resettingPassword}
                    className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {resettingPassword
                      ? 'Actualizando...'
                      : 'Guardar nueva contraseña'}
                  </button>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    changeView('login')
                  }
                  className="w-full text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  ← Volver al inicio de sesión
                </button>

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};

export default LoginPage;