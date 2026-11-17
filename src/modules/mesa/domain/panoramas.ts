// The ready-made 360° backdrops (Poly Haven, CC0; see public/panoramas/LICENSE.md). The theme keeps only the id.
const base = import.meta.env.BASE_URL;
export interface PanoramaPronto { id: string; nome: string; arquivo: string; mini: string; rotation: number; tilt: number }
// rotation/tilt (degrees): the framing picked from captures of the main scene, whose camera looks down at the tray,
// so a negative tilt brings the horizon (trees, the fire, the sky) into the top of the view.
const pronto = (id: string, nome: string, rotation: number, tilt: number): PanoramaPronto => ({ id, nome, arquivo: `${base}panoramas/${id}.jpg`, mini: `${base}panoramas/${id}-mini.jpg`, rotation, tilt });
export const PANORAMAS: PanoramaPronto[] = [
  pronto('monks_forest', 'Floresta', 270, -30), pronto('fireplace', 'Lareira', 120, -30),
  pronto('cobblestone_street_night', 'Rua de pedra', 180, -30), pronto('rogland_clear_night', 'Noite estrelada', 180, -55),
];
export const panoramaPronto = (id: string | undefined) => PANORAMAS.find((p) => p.id === id);
