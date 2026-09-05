const configuredApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');
const API_URL = configuredApiUrl || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface UserPayload {
  id?: number | string;
  email?: string;
  role?: string;
  rol?: string;
  name?: string;
  nombre?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: {
    id: number | string;
    email: string;
    role: string;
    name: string;
  };
  usuario?: UserPayload;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  user?: {
    id: number | string;
    email: string;
    role: string;
    name: string;
  };
  usuario?: {
    id: number | string;
    nombre: string;
    email: string;
    rol: string;
  };
}

interface ApiMessageResponse {
  success: boolean;
  message: string;
}

const normalizeUser = (payload?: UserPayload) => ({
  id: payload?.id ?? 0,
  email: payload?.email ?? '',
  role: String(payload?.role ?? payload?.rol ?? '').toLowerCase(),
  name: payload?.name ?? payload?.nombre ?? 'Usuario',
});

const readResponse = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type') || '';
  const body = await response.text();

  if (!body.trim()) {
    return null;
  }

  if (!contentType.toLowerCase().includes('application/json')) {
    throw new ApiError(
      `El servidor respondió con contenido no JSON (HTTP ${response.status})`,
      response.status
    );
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new ApiError(
      `El servidor devolvió JSON inválido (HTTP ${response.status})`,
      response.status
    );
  }
};

const request = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    console.error('Error de red al comunicarse con la API:', error);
    throw new Error('No se pudo conectar con el servidor de la API', { cause: error });
  }

  const data = await readResponse(response);

  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'message' in data
        ? String((data as { message?: string }).message)
        : response.status === 404
          ? 'La ruta API no existe en el servidor'
          : response.status >= 500
            ? 'El servidor encontró un error interno'
            : 'Ocurrió un error al comunicarse con el servidor';

    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }

    throw new ApiError(message || 'Ocurrió un error al comunicarse con el servidor', response.status);
  }

  if (data === null) {
    throw new ApiError('El servidor devolvió una respuesta vacía', response.status);
  }

  return data as T;
};

export const ticketService = {
  getAll: async (token: string) => {
    const response = await fetch(`${API_URL}/tickets`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error('El servidor devolvió una respuesta inválida');
    }

    if (!response.ok) {
      const message =
        typeof data === 'object' && data !== null && 'message' in data
          ? String((data as { message?: string }).message)
          : 'Error al cargar tickets';
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      throw new ApiError(message, response.status);
    }

    return Array.isArray(data) ? data : [];
  },

  create: async (ticket: Record<string, unknown>, token: string) => {
    return request<Record<string, unknown>>('/tickets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(ticket),
    });
  },

  update: async (id: string | number, updates: Record<string, unknown>, token: string) => {
    return request<Record<string, unknown>>(`/tickets/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
  },

  delete: async (id: string | number, token: string) => {
    return request<Record<string, unknown>>(`/tickets/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },
};

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const data = await request<LoginResponse & { usuario?: UserPayload }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const payloadUser = data.user ?? data.usuario ?? {};

    return {
      success: data.success,
      message: data.message,
      token: data.token,
      user: normalizeUser(payloadUser),
      usuario: payloadUser,
    };
  },

  async register(
    nombre: string,
    email: string,
    password: string,
    role = 'tecnico'
  ): Promise<RegisterResponse> {
    const data = await request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        nombre,
        email,
        password,
        role,
      }),
    });

    return data;
  },

  async getProfile(token: string): Promise<{ success: boolean; message: string; user: { id: number | string; email: string; role: string; name: string } }> {
    const data = await request<{ success: boolean; message: string; user?: UserPayload }>('/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return {
      success: data.success,
      message: data.message,
      user: normalizeUser(data.user),
    };
  },

  async updateProfile(
    token: string,
    payload: Record<string, unknown>
  ): Promise<{ success: boolean; message: string; token: string; user: { id: number | string; email: string; role: string; name: string } }> {
    const data = await request<{ success: boolean; message: string; token?: string; user?: UserPayload }>('/auth/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    return {
      success: data.success,
      message: data.message,
      token: data.token ?? token,
      user: normalizeUser(data.user),
    };
  },

  async createUser(
    payload: Record<string, unknown>,
    token: string
  ): Promise<{ success: boolean; message: string; user?: { id: number | string; email: string; role: string; name: string } }> {
    const data = await request<{ success: boolean; message: string; user?: UserPayload }>('/auth/users', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    return {
      success: data.success,
      message: data.message,
      user: data.user ? normalizeUser(data.user) : undefined,
    };
  },

  async forgotPassword(email: string): Promise<ApiMessageResponse> {
    return request<ApiMessageResponse>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        email,
      }),
    });
  },

  async resetPassword(
    token: string,
    password: string
  ): Promise<ApiMessageResponse> {
    return request<ApiMessageResponse>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token,
        password,
      }),
    });
  },
};

export default authService;
