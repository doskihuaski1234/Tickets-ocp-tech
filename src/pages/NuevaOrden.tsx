import React, { useState } from 'react';

import type { Ticket } from '../types/tickets';

import { GUATEMALA_DATA, EMPRESAS } from '../data/ubicaciones';

interface NuevaOrdenProps {
  onAddTicket: (ticket: Ticket) => void;
}

interface GeocodingResult {
  lat: number;
  lng: number;
  placeName: string;
  relevance: number;
}

export const NuevaOrden: React.FC<NuevaOrdenProps> = ({ onAddTicket }) => {
  const [loading, setLoading] = useState(false);
  const [departamento, setDepartamento] = useState('');
  const [municipio, setMunicipio] = useState('');

  const [ubicacionEncontrada, setUbicacionEncontrada] =
    useState<GeocodingResult | null>(null);
  const [resultadosUbicacion, setResultadosUbicacion] =
    useState<GeocodingResult[]>([]);

  const [errorUbicacion, setErrorUbicacion] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    empresa: '',
    sucursal: '',
    calleAvenida: '',
    zona: '',
  });

  /**
   * 🌍 Busca la dirección utilizando Mapbox.
   *
   * Importante:
   * - No utiliza una ubicación de Guatemala como fallback.
   * - Si Mapbox no encuentra la dirección, devuelve null.
   * - De esta manera evitamos crear tickets con coordenadas incorrectas.
   */
  const getCoordinates = async (
    query: string
  ): Promise<GeocodingResult[]> => {
    try {
      const token = import.meta.env.VITE_MAPBOX_TOKEN;

      if (!token) {
        console.error('VITE_MAPBOX_TOKEN no está configurada.');
        setErrorUbicacion(
          'No se encontró la configuración del mapa. Verifica VITE_MAPBOX_TOKEN en el archivo .env.'
        );
        return [];
      }

      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
        `${encodeURIComponent(query)}.json` +
        `?access_token=${token}` +
        `&country=GT` +
        `&language=es` +
        `&limit=5`;

      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(
          `Mapbox respondió con código ${res.status}`
        );
      }

      const data = await res.json();

      if (!data.features || data.features.length === 0) {
        return [];
      }

      type MapboxFeature = {
        context?: Array<{
          id?: string;
          text?: string;
        }>;
        place_name?: string;
        center?: [number, number];
        relevance?: number;
      };

      const normalizarTexto = (value: string) =>
        value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const municipioEsperado = normalizarTexto(municipio);
      const departamentoEsperado = normalizarTexto(departamento);

      /**
       * Buscamos preferentemente resultados que tengan
       * contexto de Guatemala y que sean suficientemente relevantes.
       */
      const resultados = data.features.filter(
        (feature: MapboxFeature) => {
          const context = Array.isArray(feature.context)
            ? feature.context
            : [];

          const tieneGuatemala =
            context.some(
              (item) =>
                item.id?.startsWith('country.') &&
                String(item.text || '')
                  .toLowerCase()
                  .includes('guatemala')
            ) ||
            String(feature.place_name || '')
              .toLowerCase()
              .includes('guatemala');

          const textoResultado = normalizarTexto(
            `${feature.place_name || ''} ${context.map((item) => item.text || '').join(' ')}`
          );

          return tieneGuatemala &&
            textoResultado.includes(municipioEsperado) &&
            textoResultado.includes(departamentoEsperado);
        }
      );

      const convertirResultados = (features: MapboxFeature[], aproximada = false) =>
        features.flatMap((resultado: MapboxFeature) => {
        if (!Array.isArray(resultado.center) || resultado.center.length < 2) return [];
        const [lng, lat] = resultado.center;
        if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];
        return [{
          lat,
          lng,
          placeName: aproximada
            ? `${resultado.place_name || query} (ubicación aproximada del municipio)`
            : resultado.place_name || query,
          relevance: typeof resultado.relevance === 'number' ? resultado.relevance : 0,
        }];
      });

      const resultadosExactos = convertirResultados(resultados);
      if (resultadosExactos.length > 0) {
        return resultadosExactos;
      }

      // Muchas direcciones locales no están indexadas por calle y número.
      const consultaMunicipio = `${municipio}, ${departamento}, Guatemala`;
      const urlMunicipio =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
        `${encodeURIComponent(consultaMunicipio)}.json` +
        `?access_token=${token}&country=GT&language=es&limit=5`;
      const respuestaMunicipio = await fetch(urlMunicipio);
      if (!respuestaMunicipio.ok) return [];

      const datosMunicipio = await respuestaMunicipio.json();
      const resultadosMunicipio = Array.isArray(datosMunicipio.features)
        ? datosMunicipio.features.filter((feature: MapboxFeature) => {
          const texto = normalizarTexto(
            `${feature.place_name || ''} ${feature.context?.map((item) => item.text || '').join(' ') || ''}`
          );
          return texto.includes(municipioEsperado) && texto.includes(departamentoEsperado);
        })
        : [];

      return convertirResultados(resultadosMunicipio, true);
    } catch (err) {
      console.error('Error geocodificando dirección:', err);

      setErrorUbicacion(
        'No fue posible consultar la ubicación. Verifica tu conexión e inténtalo nuevamente.'
      );

      return [];
    }
  };

  /**
   * Construye una dirección completa y específica.
   *
   * Ejemplo:
   * 5 Avenida 10-20, Zona 1, Mixco, Guatemala, Guatemala
   */
  const construirDireccion = () => {
    const partes = [
      formData.calleAvenida.trim(),
      formData.zona.trim()
        ? `Zona ${formData.zona.trim().replace(/^zona\s*/i, '')}`
        : '',
      municipio.trim(),
      departamento.trim(),
      'Guatemala',
    ].filter(Boolean);

    return partes.join(', ');
  };

  /**
   * Busca la ubicación antes de crear el ticket.
   */
  const handleBuscarUbicacion = async () => {
    setErrorUbicacion('');
    setUbicacionEncontrada(null);
    setLoading(true);

    const query = construirDireccion();

    const resultados = await getCoordinates(query);

    setLoading(false);
    setResultadosUbicacion(resultados);

    if (resultados.length === 0) {
      setErrorUbicacion(
        `No encontramos una ubicación suficientemente confiable para:\n${query}\n\nRevisa la calle/avenida, zona, municipio y departamento.`
      );
      return;
    }

    setUbicacionEncontrada(resultados.length === 1 ? resultados[0] : null);
    if (resultados.length > 1) {
      setErrorUbicacion('Selecciona el resultado exacto antes de crear la orden.');
    }
  };

  /**
   * Crea finalmente el ticket utilizando las coordenadas
   * que fueron encontradas y confirmadas.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrorUbicacion('');

    /**
     * Si todavía no se ha buscado la ubicación,
     * primero la buscamos.
     */
    if (!ubicacionEncontrada) {
      setLoading(true);

      const query = construirDireccion();

      const resultados = await getCoordinates(query);

      setLoading(false);

      if (resultados.length === 0) {
        setErrorUbicacion(
          `No encontramos una ubicación suficientemente confiable para:\n${query}\n\nRevisa los datos de la dirección e inténtalo nuevamente.`
        );
        return;
      }

      setResultadosUbicacion(resultados);
      if (resultados.length === 1) {
        setUbicacionEncontrada(resultados[0]);
      } else {
        setErrorUbicacion('Selecciona el resultado exacto antes de crear la orden.');
      }
      return;
    }

    setLoading(true);

    try {
      const direccion = construirDireccion();

      const nuevo: Ticket = {
        id: crypto.randomUUID(),

        title: formData.title.trim(),

        description: formData.description.trim(),

        status: 'abierto',

        createdAt: new Date().toISOString(),

        empresa: formData.empresa,

        sucursal: formData.sucursal.trim(),

        departamento,

        municipio,

        direccion,

        lat: ubicacionEncontrada.lat,

        lng: ubicacionEncontrada.lng,
      };

      /**
       * Se entrega el ticket al componente padre.
       * Las coordenadas ya vienen validadas desde Mapbox.
       */
      onAddTicket(nuevo);

      // Reset del formulario
      setFormData({
        title: '',
        description: '',
        empresa: '',
        sucursal: '',
        calleAvenida: '',
        zona: '',
      });

      setDepartamento('');
      setMunicipio('');

      setUbicacionEncontrada(null);
      setResultadosUbicacion([]);
      setErrorUbicacion('');
    } catch (err) {
      console.error('Error creando ticket:', err);

      setErrorUbicacion(
        'No fue posible crear el ticket. Inténtalo nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cuando cambia la dirección, eliminamos la ubicación anterior.
   *
   * Esto evita un problema importante:
   * que el usuario cambie la dirección pero el ticket
   * conserve las coordenadas de la dirección anterior.
   */
  const actualizarDireccion = (
    campo: 'calleAvenida' | 'zona',
    valor: string
  ) => {
    setFormData({
      ...formData,
      [campo]: valor,
    });

    setUbicacionEncontrada(null);
    setErrorUbicacion('');
  };

  return (
    <div className="w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_15px_35px_rgba(15,23,42,0.05)] sm:p-6">
      <div className="mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          Operación
        </p>

        <h2 className="mt-1 text-2xl font-bold text-slate-800">
          Nueva Orden
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
        {/* TÍTULO */}
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Título
          </label>

          <input
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
            placeholder="Título"
            value={formData.title}
            onChange={(e) =>
              setFormData({
                ...formData,
                title: e.target.value,
              })
            }
            required
          />
        </div>

        {/* DESCRIPCIÓN */}
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Descripción
          </label>

          <textarea
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
            placeholder="Descripción"
            value={formData.description}
            onChange={(e) =>
              setFormData({
                ...formData,
                description: e.target.value,
              })
            }
            required
          />
        </div>

        {/* EMPRESA */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Empresa
          </label>

          <select
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
            value={formData.empresa}
            onChange={(e) =>
              setFormData({
                ...formData,
                empresa: e.target.value,
              })
            }
            required
          >
            <option value="">Selecciona</option>

            {EMPRESAS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>

        {/* SUCURSAL */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Sucursal
          </label>

          <input
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
            placeholder="Sucursal"
            value={formData.sucursal}
            onChange={(e) =>
              setFormData({
                ...formData,
                sucursal: e.target.value,
              })
            }
            required
          />
        </div>

        {/* DEPARTAMENTO */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Departamento
          </label>

          <select
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
            value={departamento}
            onChange={(e) => {
              setDepartamento(e.target.value);
              setMunicipio('');
              setUbicacionEncontrada(null);
              setResultadosUbicacion([]);
              setErrorUbicacion('');
            }}
            required
          >
            <option value="">Selecciona</option>

            {Object.keys(GUATEMALA_DATA).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* MUNICIPIO */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Municipio
          </label>

          <select
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            value={municipio}
            onChange={(e) => {
              setMunicipio(e.target.value);
              setUbicacionEncontrada(null);
              setResultadosUbicacion([]);
              setErrorUbicacion('');
            }}
            required
            disabled={!departamento}
          >
            <option value="">Selecciona</option>

            {departamento &&
              GUATEMALA_DATA[departamento].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
          </select>
        </div>

        {/* CALLE / AVENIDA */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Calle / Avenida
          </label>

          <input
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
            placeholder="Ej. 5 Avenida 10-20"
            value={formData.calleAvenida}
            onChange={(e) =>
              actualizarDireccion(
                'calleAvenida',
                e.target.value
              )
            }
            required
          />
        </div>

        {/* ZONA */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Zona
          </label>

          <input
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
            placeholder="Ej. 1"
            value={formData.zona}
            onChange={(e) =>
              actualizarDireccion(
                'zona',
                e.target.value
              )
            }
            required
          />
        </div>

        {/* DIRECCIÓN CONSTRUIDA */}
        <div className="md:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Dirección del servicio
            </p>

            <p className="mt-2 text-sm font-medium text-slate-700">
              {formData.calleAvenida ||
              formData.zona ||
              municipio ||
              departamento ? (
                construirDireccion()
              ) : (
                'Completa los datos de ubicación'
              )}
            </p>
          </div>
        </div>

        {/* ERROR DE UBICACIÓN */}
        {errorUbicacion && (
          <div className="md:col-span-2">
            <div className="whitespace-pre-line rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-semibold">
                No se pudo confirmar la ubicación
              </p>

              <p className="mt-1">
                {errorUbicacion}
              </p>
            </div>
          </div>
        )}

        {resultadosUbicacion.length > 1 && !ubicacionEncontrada && (
          <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800">Selecciona la ubicación exacta</p>
            <div className="mt-3 space-y-2">
              {resultadosUbicacion.map((resultado) => (
                <button
                  key={`${resultado.lat}-${resultado.lng}`}
                  type="button"
                  onClick={() => {
                    setUbicacionEncontrada(resultado);
                    setErrorUbicacion('');
                  }}
                  className="w-full rounded-xl border border-amber-200 bg-white p-3 text-left text-sm text-slate-700 hover:bg-amber-100"
                >
                  {resultado.placeName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* UBICACIÓN ENCONTRADA */}
        {ubicacionEncontrada && (
          <div className="md:col-span-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg">
                  📍
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-emerald-800">
                    Ubicación encontrada
                  </p>

                  <p className="mt-1 text-sm text-emerald-700">
                    {ubicacionEncontrada.placeName}
                  </p>

                  <div className="mt-3 grid gap-2 text-xs text-emerald-700 sm:grid-cols-2">
                    <div>
                      <span className="font-semibold">
                        Latitud:
                      </span>{' '}
                      {ubicacionEncontrada.lat.toFixed(6)}
                    </div>

                    <div>
                      <span className="font-semibold">
                        Longitud:
                      </span>{' '}
                      {ubicacionEncontrada.lng.toFixed(6)}
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-emerald-600">
                    Verifica que la ubicación encontrada corresponda
                    al lugar donde se realizará el servicio.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BOTONES */}
        <div className="md:col-span-2 pt-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {/* BUSCAR UBICACIÓN */}
            <button
              type="button"
              onClick={handleBuscarUbicacion}
              disabled={
                loading ||
                !departamento ||
                !municipio ||
                !formData.calleAvenida.trim() ||
                !formData.zona.trim()
              }
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? 'Buscando ubicación...'
                : '📍 Buscar ubicación'}
            </button>

            {/* CREAR TICKET */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-slate-900 to-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-[0_15px_30px_rgba(15,23,42,0.18)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading
                ? 'Procesando ubicación...'
                : ubicacionEncontrada
                  ? '✓ Crear Ticket'
                  : 'Crear Ticket'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default NuevaOrden;