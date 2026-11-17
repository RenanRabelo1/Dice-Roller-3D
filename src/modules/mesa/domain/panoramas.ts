// The ready-made 360° backdrops (Poly Haven, CC0; see public/panoramas/LICENSE.md). The theme keeps only the id.
const base = import.meta.env.BASE_URL;
export interface PanoramaPronto { id: string; nome: string; arquivo: string; mini: string; rotation: number; tilt: number }
const pronto = (id: string, nome: string): PanoramaPronto => ({ id, nome, arquivo: `${base}panoramas/${id}.jpg`, mini: `${base}panoramas/${id}-mini.jpg`, rotation: 0, tilt: 0 });
export const PANORAMAS: PanoramaPronto[] = [
  pronto('monks_forest', 'Floresta'), pronto('fireplace', 'Lareira'),
  pronto('cobblestone_street_night', 'Rua de pedra'), pronto('rogland_clear_night', 'Noite estrelada'),
];
export const panoramaPronto = (id: string | undefined) => PANORAMAS.find((p) => p.id === id);
