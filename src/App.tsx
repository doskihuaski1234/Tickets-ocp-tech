import React, { useEffect, useRef, useState } from 'react';

import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

import { Dashboard } from './pages/Dashboard';
import Tickets from './pages/Tickets';
import { NuevaOrden } from './pages/NuevaOrden';

import MapaPage from './pages/MapaPage';

import { SeccionHojasServicio } from './pages/SeccionHojasServicio';
import { CentroReportes } from './pages/CentroReportes';
import { MisOrdenes } from './pages/MisOrdenes';
import { MiPerfil } from './pages/MiPerfil';
import { Usuarios } from './pages/Usuarios';
import { LoginPage } from './pages/LoginPage';

import type { Ticket, TicketStatus } from './types/tickets';
import type { TabType } from './types/navigation';

import { ApiError, ticketService } from './services/api';

import './App.css';

type TicketApiResponse = {
  id?: string | number;
  title?: string | number;

  descripcion?: string | number;
  description?: string | number;

  status?: string;

  createdAt?: string;

  empresa?: string | number;
  sucursal?: string | number;
  departamento?: string | number;
  municipio?: string | number;
  direccion?: string | number;

  assignedTo?: string | number;
  assignedToName?: string | number;

  notification?: string | number;

  createdBy?: string | number;
  evidenceBefore?: string;
  evidenceAfter?: string;
  evidenceBeforeImage?: string;
  evidenceAfterImage?: string;
  telefono?: string | number;
  emailCliente?: string | number;
  tecnico?: string | number;
  diagnostico?: string | number;
  resultado?: string | number;

  lat?: number | string;
  lng?: number | string;
};

const asString = (
  value: unknown,
  fallback = ''
): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return fallback;
};

const asNumber = (
  value: unknown,
): number | undefined => {
  if (
    typeof value === 'number' &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === 'string' &&
    value.trim() !== '' &&
    !Number.isNaN(Number(value))
  ) {
    return Number(value);
  }

  return undefined;
};

/*
 * ============================================================
 * NORMALIZAR ESTADO DEL TICKET
 * ============================================================
 *
 * Backend:
 * - Pendiente
 * - En proceso
 * - Completado
 *
 * Frontend:
 * - abierto
 * - procesado
 * - cerrado
 *
 * ============================================================
 */
const normalizeTicketStatus = (
  status: unknown
): TicketStatus => {
  const normalized = String(status ?? '')
    .trim()
    .toLowerCase();

  switch (normalized) {
    case 'procesado':
    case 'en proceso':
    case 'en_proceso':
      return 'procesado';

    case 'cerrado':
    case 'completado':
      return 'cerrado';

    case 'abierto':
    case 'pendiente':
    default:
      return 'abierto';
  }
};

const normalizeEmail = (
  value?: string | null
): string =>
  String(value ?? '')
    .trim()
    .toLowerCase();

const getStoredUser = () => {
  try {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    localStorage.removeItem('user');
    return null;
  }
};

const getVisibleTicketsForRole = (
  allTickets: Ticket[],
  role?: string,
  userEmail?: string
): Ticket[] => {
  if (role === 'admin') {
    return allTickets;
  }

  if (role === 'tecnico') {
    const normalizedUserEmail = normalizeEmail(userEmail);

    return allTickets.filter((ticket) => {
      const isUnassigned = !ticket.assignedTo;
      const isAssignedToMe =
        !!normalizedUserEmail &&
        normalizeEmail(ticket.assignedTo) === normalizedUserEmail;

      return isUnassigned || isAssignedToMe;
    });
  }

  return [];
};

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] =
    useState<TabType>('dashboard');

  const [tickets, setTickets] =
    useState<Ticket[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [ticketError, setTicketError] =
    useState('');

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [technicianLocation, setTechnicianLocation] =
    useState<{ lat: number; lng: number } | null>(null);

  const [auth, setAuth] = useState<{
    token: string | null;
    user: {
      email: string;
      role: string;
      name: string;
    } | null;
  }>({
    token: localStorage.getItem('token'),

    user: getStoredUser(),
  });

  const isAdmin =
    auth.user?.role === 'admin';

  const isTechnician =
    auth.user?.role === 'tecnico';

  useEffect(() => {
    if (!auth.token || !isTechnician) {
      return;
    }

    if (!('geolocation' in navigator)) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setTechnicianLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setTechnicianLocation(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );

    if ('Notification' in window) {
      Notification.requestPermission().catch(() => undefined);
    }
  }, [auth.token, isTechnician]);

  const lastTicketIdsRef =
    useRef<Set<string>>(new Set());

  /*
   * ============================================================
   * NOTIFICACIONES
   * ============================================================
   */
  const showMobileNotification = (
    title: string,
    body: string
  ) => {
    if (!('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/vite.svg',
      });

      return;
    }

    if (Notification.permission === 'default') {
      Notification.requestPermission()
        .then((permission) => {
          if (permission === 'granted') {
            new Notification(title, {
              body,
              icon: '/vite.svg',
            });
          }
        })
        .catch(() => undefined);
    }
  };

  /*
   * ============================================================
   * CARGAR TICKETS
   * ============================================================
   */
  useEffect(() => {
    const loadTickets = async () => {
      if (!auth.token) {
        setLoading(false);
        return;
      }

      try {
        setTicketError('');
        const data =
          await ticketService.getAll(
            auth.token
          );

        const mapped: Ticket[] =
          data.map(
            (item: TicketApiResponse) => ({
              id: String(item.id ?? ''),

              title: asString(
                item.title
              ),

              description:
                asString(
                  item.descripcion ??
                    item.description
                ),

              status:
                normalizeTicketStatus(
                  item.status
                ),

              createdAt:
                item.createdAt ||
                new Date().toISOString(),

              empresa:
                asString(
                  item.empresa
                ),

              sucursal:
                asString(
                  item.sucursal
                ),

              departamento:
                asString(
                  item.departamento
                ),

              municipio:
                asString(
                  item.municipio
                ),

              direccion:
                asString(
                  item.direccion
                ),

              assignedTo:
                asString(
                  item.assignedTo,
                  ''
                ) || undefined,

              assignedToName:
                asString(
                  item.assignedToName,
                  ''
                ) || undefined,

              notification:
                asString(
                  item.notification,
                  ''
                ) || undefined,

              /*
               * IMPORTANTE:
               * Ya no usamos las coordenadas de
               * Guatemala City como fallback.
               */
              lat:
                typeof item.lat !== 'undefined'
                  ? asNumber(item.lat)
                  : undefined,

              lng:
                typeof item.lng !== 'undefined'
                  ? asNumber(item.lng)
                  : undefined,
              createdBy: asString(item.createdBy, '') || undefined,
              evidenceBefore: item.evidenceBefore,
              evidenceAfter: item.evidenceAfter,
              evidenceBeforeImage: item.evidenceBeforeImage,
              evidenceAfterImage: item.evidenceAfterImage,
              telefono: asString(item.telefono, '') || undefined,
              emailCliente: asString(item.emailCliente, '') || undefined,
              tecnico: asString(item.tecnico, '') || undefined,
              diagnostico: asString(item.diagnostico, '') || undefined,
              resultado: asString(item.resultado, '') || undefined,
            })
          );

        /*
         * ========================================================
         * NOTIFICACIONES PARA TÉCNICOS
         * ========================================================
         */
        if (
          isTechnician &&
          auth.user?.email
        ) {
          const currentIds =
            new Set(
              mapped.map(
                (ticket) =>
                  ticket.id
              )
            );

          const newlyAvailable =
            mapped.filter(
              (ticket) =>
                !ticket.assignedTo &&
                !lastTicketIdsRef.current.has(
                  ticket.id
                )
            );

          const newlyAssignedToMe =
            mapped.filter(
              (ticket) =>
                ticket.assignedTo ===
                  auth.user?.email &&
                !lastTicketIdsRef.current.has(
                  ticket.id
                )
            );

          if (
            newlyAvailable.length > 0
          ) {
            showMobileNotification(
              'Nueva orden disponible',
              `Hay ${newlyAvailable.length} orden(es) nuevas para todos los técnicos.`
            );
          }

          if (
            newlyAssignedToMe.length > 0
          ) {
            showMobileNotification(
              'Orden asignada a ti',
              `Se te asignó ${newlyAssignedToMe.length} orden(es) nueva(s).`
            );
          }

          lastTicketIdsRef.current =
            currentIds;
        } else {
          lastTicketIdsRef.current =
            new Set(
              mapped.map(
                (ticket) =>
                  ticket.id
              )
            );
        }

        setTickets(mapped);
      } catch (error) {
        console.error(
          'Error cargando tickets:',
          error
        );

        setTicketError(
          error instanceof Error
            ? error.message
            : 'No fue posible cargar los tickets.'
        );
        setTickets([]);
        if (error instanceof ApiError && error.status === 401) {
          setAuth({ token: null, user: null });
        }
      } finally {
        setLoading(false);
      }
    };

    loadTickets();

    /*
     * Actualización automática cada 20 segundos.
     */
    const intervalId =
      window.setInterval(
        loadTickets,
        20000
      );

    return () =>
      window.clearInterval(
        intervalId
      );
  }, [
    auth.token,
    auth.user?.email,
    auth.user?.role,
    isTechnician,
  ]);

  /*
   * ============================================================
   * CREAR TICKET
   * ============================================================
   */
  const handleAddTicket = async (
    newTicket: Ticket
  ) => {
    if (!auth.token) {
      setTicketError('La sesión expiró. Inicia sesión nuevamente.');
      return;
    }

    try {
      /*
       * ========================================================
       * AQUÍ ESTABA EL PROBLEMA PRINCIPAL
       * ========================================================
       *
       * Antes solamente se enviaban algunos campos.
       *
       * Ahora enviamos también:
       *
       * - sucursal
       * - departamento
       * - municipio
       * - direccion
       * - lat
       * - lng
       *
       * Esto permite que la orden conserve la ubicación.
       */
      const payload = {
        id: newTicket.id,

        title:
          newTicket.title,

        empresa:
          newTicket.empresa,

        sucursal:
          newTicket.sucursal,

        departamento:
          newTicket.departamento,

        municipio:
          newTicket.municipio,

        direccion:
          newTicket.direccion,

        lat:
          newTicket.lat,

        lng:
          newTicket.lng,

        status: newTicket.status,

        description:
          newTicket.description,
        notification: newTicket.notification || 'Nueva orden disponible para técnicos',
        telefono: newTicket.telefono,
        emailCliente: newTicket.emailCliente,
      };

      /*
       * Mostrar en consola exactamente
       * qué se está enviando al backend.
       */
      console.log(
        '📦 Enviando ticket al backend:',
        payload
      );

      const created =
        (await ticketService.create(
          payload,
          auth.token
        )) as TicketApiResponse;

      console.log(
        '✅ Ticket guardado en backend:',
        created
      );

      /*
       * ========================================================
       * MAPEAR RESPUESTA DEL BACKEND
       * ========================================================
       */
      const mapped: Ticket = {
        id: String(
          created.id ??
          newTicket.id
        ),

        title:
          asString(
            created.title ??
              newTicket.title
          ),

        description: asString(created.description ?? created.descripcion ?? newTicket.description),

        status:
          normalizeTicketStatus(
            created.status ??
              newTicket.status
          ),

        createdAt:
          created.createdAt ??
          newTicket.createdAt ??
          new Date().toISOString(),

        empresa:
          asString(
            created.empresa ??
              newTicket.empresa
          ),

        sucursal:
          asString(
            created.sucursal ??
              newTicket.sucursal
          ),

        departamento:
          asString(
            created.departamento ??
              newTicket.departamento
          ),

        municipio:
          asString(
            created.municipio ??
              newTicket.municipio
          ),

        direccion:
          asString(
            created.direccion ??
              newTicket.direccion
          ),

        assignedTo:
          asString(
            created.assignedTo ??
              newTicket.assignedTo,
            ''
          ) || undefined,

        assignedToName:
          asString(
            created.assignedToName ??
              newTicket.assignedToName,
            ''
          ) || undefined,

        notification: asString(created.notification ?? newTicket.notification, '') || 'Nueva orden disponible para técnicos',

        /*
         * Si el backend devuelve coordenadas,
         * usamos las del backend.
         *
         * Si no las devuelve en la respuesta,
         * conservamos las que acabamos de obtener
         * desde NuevaOrden.
         */
        lat:
          typeof created.lat !==
          'undefined'
            ? asNumber(
                created.lat
              )
            : newTicket.lat,

        lng:
          typeof created.lng !==
          'undefined'
            ? asNumber(
                created.lng
              )
            : newTicket.lng,
          createdBy: asString(created.createdBy, '') || undefined,
          evidenceBefore: created.evidenceBefore,
          evidenceAfter: created.evidenceAfter,
          evidenceBeforeImage: created.evidenceBeforeImage,
          evidenceAfterImage: created.evidenceAfterImage,
          telefono: asString(created.telefono, '') || undefined,
          emailCliente: asString(created.emailCliente, '') || undefined,
          tecnico: asString(created.tecnico, '') || undefined,
          diagnostico: asString(created.diagnostico, '') || undefined,
          resultado: asString(created.resultado, '') || undefined,
      };

      /*
       * Reemplazamos el ticket optimista por la versión real
       * que devuelve el backend para mantener un único estado
       * consistente entre App, lista y mapa.
       */
      setTickets((prev) => [mapped, ...prev]);
      setTicketError('');
    } catch (error) {
      console.error(
        '❌ Error creando ticket:',
        error
      );
      setTicketError(error instanceof Error ? error.message : 'No fue posible crear el ticket.');
    }
  };

  /*
   * ============================================================
   * ACTUALIZAR ESTADO
   * ============================================================
   */
  const handleUpdateStatus = async (
    id: string,
    newStatus: TicketStatus
  ) => {
    if (!auth.token) {
      return;
    }

    try {
      const currentTicket =
        tickets.find(
          (ticket) =>
            ticket.id === id
        );

      /*
       * Si la orden no tiene técnico
       * y pasa a procesado,
       * el técnico actual está tomando
       * la orden.
       */
      const takingTicket =
        !currentTicket?.assignedTo &&
        newStatus === 'procesado';

      await ticketService.update(
        id,
        {
          status:
            newStatus,

          assignedTo:
            currentTicket?.assignedTo ||
            (takingTicket
              ? normalizeEmail(
                  auth.user?.email
                )
              : undefined),

          assignedToName:
            currentTicket?.assignedToName ||
            (takingTicket
              ? auth.user?.name ||
                auth.user?.email
              : undefined),

          notification:
            takingTicket
              ? `La orden fue tomada por ${
                  auth.user?.name ||
                  auth.user?.email
                }`
              : currentTicket?.notification ||
                `Orden actualizada por ${
                  auth.user?.name ||
                  'usuario'
                }`,
        },
        auth.token
      );

      /*
       * Actualizamos inmediatamente
       * la interfaz.
       */
      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === id
            ? {
                ...ticket,

                status:
                  newStatus,

                assignedTo:
                  takingTicket
                    ? normalizeEmail(
                        auth.user?.email
                      )
                    : ticket.assignedTo,

                assignedToName:
                  takingTicket
                    ? auth.user?.name ||
                      auth.user?.email
                    : ticket.assignedToName,

                notification:
                  takingTicket
                    ? `La orden fue tomada por ${
                        auth.user?.name ||
                        auth.user?.email
                      }`
                    : ticket.notification,
              }
            : ticket
        )
      );
    } catch (error) {
      console.error(
        'Error actualizando ticket:',
        error
      );
      setTicketError(error instanceof Error ? error.message : 'No fue posible actualizar el ticket.');
    }
  };

  /*
   * ============================================================
   * ELIMINAR TICKET
   * ============================================================
   */
  const handleDeleteTicket = async (
    id: string
  ) => {
    if (!auth.token) {
      return;
    }

    try {
      await ticketService.delete(
        id,
        auth.token
      );

      setTickets((prev) =>
        prev.filter(
          (ticket) =>
            ticket.id !== id
        )
      );
    } catch (error) {
      console.error(
        'Error eliminando ticket:',
        error
      );
      setTicketError(error instanceof Error ? error.message : 'No fue posible eliminar el ticket.');
    }
  };

  /*
   * ============================================================
   * LOGIN
   * ============================================================
   */
  const handleLogin = (
    token: string,
    user: {
      email: string;
      role: string;
      name: string;
    }
  ) => {
    setAuth({
      token,
      user,
    });
  };

  /*
   * ============================================================
   * LOGOUT
   * ============================================================
   */
  const handleLogout = () => {
    localStorage.removeItem(
      'token'
    );

    localStorage.removeItem(
      'user'
    );

    setAuth({
      token: null,
      user: null,
    });

    setSidebarOpen(false);
  };

  /*
   * ============================================================
   * CAMBIO DE PESTAÑA
   * ============================================================
   */
  const handleTabChange = (
    tab: TabType
  ) => {
    setCurrentTab(tab);
    setSidebarOpen(false);
  };

  /*
   * ============================================================
   * LOGIN
   * ============================================================
   */
  if (!auth.token) {
    return (
      <LoginPage
        onLogin={handleLogin}
      />
    );
  }

  const technicianTickets =
    getVisibleTicketsForRole(
      tickets,
      auth.user?.role,
      auth.user?.email
    );

  const visibleTickets =
    isAdmin
      ? tickets
      : technicianTickets;

  /*
   * ============================================================
   * APLICACIÓN PRINCIPAL
   * ============================================================
   */
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-100">

      {/* ======================================================
          NAVBAR
          ====================================================== */}

      <Navbar
        user={auth.user}
        onLogout={handleLogout}
        onMenuClick={() =>
          setSidebarOpen(true)
        }
      />

      {/* ======================================================
          OVERLAY PARA CELULAR
          ====================================================== */}

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-[1px] lg:hidden"
          onClick={() =>
            setSidebarOpen(false)
          }
        />
      )}

      {/* ======================================================
          CONTENEDOR PRINCIPAL
          ====================================================== */}

      <div className="relative flex min-h-[calc(100vh-65px)] w-full">

        {/* ====================================================
            SIDEBAR
            ==================================================== */}

        <aside
          className={`
            fixed
            inset-y-0
            left-0
            z-40
            w-[270px]
            transform
            bg-slate-50
            transition-transform
            duration-300
            ease-in-out
            lg:static
            lg:z-auto
            lg:block
            lg:w-[270px]
            lg:shrink-0
            lg:translate-x-0
            ${
              sidebarOpen
                ? 'translate-x-0'
                : '-translate-x-full'
            }
          `}
        >
          <Sidebar
            currentTab={
              currentTab
            }
            setCurrentTab={
              handleTabChange
            }
            userRole={
              auth.user?.role
            }
          />
        </aside>

        {/* ====================================================
            CONTENIDO
            ==================================================== */}

        <main
          className="
            min-w-0
            flex-1
            overflow-x-hidden
            px-3
            py-4
            sm:px-5
            sm:py-5
            md:px-6
            lg:px-8
            lg:py-6
          "
        >

          {/* ==================================================
              CARGANDO
              ================================================== */}

          {loading && (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
              Cargando tickets...
            </div>
          )}

          {ticketError && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {ticketError}
            </div>
          )}

          {/* ==================================================
              ADMIN
              ================================================== */}

          {isAdmin &&
            currentTab ===
              'dashboard' && (
              <Dashboard
                tickets={
                  visibleTickets
                }
              />
            )}

          {isAdmin &&
            currentTab ===
              'tickets' && (
              <Tickets
                tickets={
                  visibleTickets
                }
                onUpdateStatus={
                  handleUpdateStatus
                }
                onDelete={
                  handleDeleteTicket
                }
              />
            )}

          {isAdmin &&
            currentTab ===
              'nueva-orden' && (
              <NuevaOrden
                onAddTicket={
                  handleAddTicket
                }
              />
            )}

          {isAdmin &&
            currentTab ===
              'mapa' && (
              <MapaPage
                tickets={
                  visibleTickets
                }
              />
            )}

          {isAdmin &&
            currentTab ===
              'hojas-servicio' && (
              <SeccionHojasServicio
                tickets={
                  visibleTickets
                }
              />
            )}

          {isAdmin &&
            currentTab ===
              'reportes' && (
              <CentroReportes
                tickets={
                  visibleTickets
                }
              />
            )}

          {isAdmin &&
            currentTab ===
              'usuarios' && (
              <Usuarios />
            )}

          {isAdmin &&
            currentTab ===
              'mi-perfil' && (
              <MiPerfil
                user={
                  auth.user
                }
                onProfileUpdated={
                  handleLogin
                }
              />
            )}

          {/* ==================================================
              TÉCNICO
              ================================================== */}

          {isTechnician &&
            currentTab ===
              'mis-ordenes' && (
              <MisOrdenes
                tickets={
                  technicianTickets
                }
                onUpdateStatus={
                  handleUpdateStatus
                }
                technicianLocation={
                  technicianLocation
                }
              />
            )}

          {isTechnician &&
            currentTab ===
              'dashboard' && (
              <Dashboard
                tickets={
                  technicianTickets
                }
              />
            )}

          {isTechnician &&
            currentTab ===
              'mapa' && (
              <MapaPage
                tickets={
                  technicianTickets
                }
                technicianLocation={
                  technicianLocation
                }
              />
            )}

          {isTechnician &&
            currentTab ===
              'hojas-servicio' && (
              <SeccionHojasServicio
                tickets={
                  technicianTickets
                }
              />
            )}

          {isTechnician &&
            currentTab ===
              'reportes' && (
              <CentroReportes
                tickets={
                  technicianTickets
                }
              />
            )}

          {isTechnician &&
            currentTab ===
              'mi-perfil' && (
              <MiPerfil
                user={
                  auth.user
                }
                onProfileUpdated={
                  handleLogin
                }
              />
            )}

        </main>
      </div>
    </div>
  );
};

export default App;