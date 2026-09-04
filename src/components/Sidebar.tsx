import React from 'react';
import type { TabType } from '../types/navigation';

interface SidebarProps {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  userRole?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  userRole,
}) => {
  const adminItems: { id: TabType; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'tickets', label: 'Tickets' },
    { id: 'nueva-orden', label: 'Nueva orden' },
    { id: 'mapa', label: 'Mapa' },
    { id: 'hojas-servicio', label: 'Hojas de servicio' },
    { id: 'reportes', label: 'Centro de reportes' },
    { id: 'usuarios', label: 'Usuarios' },
    { id: 'mi-perfil', label: 'Mi perfil' },
  ];

  const userItems: { id: TabType; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'mapa', label: 'Mapa' },
    { id: 'hojas-servicio', label: 'Hojas de servicio' },
    { id: 'mis-ordenes', label: 'Mis órdenes' },
    { id: 'reportes', label: 'Centro de reportes' },
    { id: 'mi-perfil', label: 'Mi perfil' },
  ];

  const visibleItems = userRole === 'admin' ? adminItems : userItems;

  const icons: Record<string, string> = {
    dashboard: '📊',
    tickets: '🎫',
    'nueva-orden': '➕',
    mapa: '📍',
    'hojas-servicio': '🧾',
    reportes: '📈',
    usuarios: '👥',
    'mi-perfil': '👤',
    'mis-ordenes': '🧭',
  };

  return (
    <aside className="h-full min-h-screen w-full bg-slate-50 p-3">
      <div className="h-full rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">

        {/* Encabezado */}
        <div className="px-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Navegación
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Menú principal
          </p>
        </div>

        {/* Menú */}
        <ul className="mt-4 space-y-2">
          {visibleItems.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setCurrentTab(item.id)}
                className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
                  currentTab === item.id
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {/* Icono */}
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base transition-all duration-200 ${
                    currentTab === item.id
                      ? 'bg-white/10'
                      : 'bg-white shadow-sm group-hover:bg-slate-200'
                  }`}
                >
                  {icons[item.id] || '•'}
                </span>

                {/* Texto */}
                <span className="truncate">
                  {item.label}
                </span>
              </button>
            </li>
          ))}
        </ul>

      </div>
    </aside>
  );
};