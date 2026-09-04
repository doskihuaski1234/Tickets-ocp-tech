const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

export const getCoordinates = async (
  query: string,
  expectedMunicipio?: string,
  expectedDepartamento?: string
): Promise<[number, number] | null> => {
  try {
    if (!MAPBOX_TOKEN) return null;

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=5&country=GT&language=es`;

    const response = await fetch(url);

    if (!response.ok) return null;

    const data = await response.json();

    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const municipio = normalize(expectedMunicipio || '');
    const departamento = normalize(expectedDepartamento || '');
    const candidates = Array.isArray(data.features) ? data.features : [];
    const matching = candidates.filter((feature: { place_name?: string; text?: string; center?: unknown }) => {
      const text = normalize(`${feature.text || ''} ${feature.place_name || ''}`);
      return (!municipio || text.includes(municipio)) && (!departamento || text.includes(departamento));
    });
    const feature = matching[0];
    if (feature && Array.isArray(feature.center) && feature.center.length === 2) {
      const [lng, lat] = feature.center;
      if (typeof lng === 'number' && typeof lat === 'number' && Number.isFinite(lng) && Number.isFinite(lat)) {
        return [lng, lat];
      }
    }

    return null;
  } catch (err) {
    console.error('Error al geocodificar: - geocoding.ts:23', err);
    return null;
  }
};