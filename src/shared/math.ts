// Geometry types and animation curves shared by dice, throw, physics and scene (ADR 0008).
// No imports and erasable syntax only, so the server can import it.
export type Vec3 = [number, number, number]
export type Quat = [number, number, number, number] // x, y, z, w
export type Pose = { p: Vec3; q: Quat }

export const easeOut = (t: number) => 1 - (1 - t) ** 4
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
// 0 before a, 1 after b, linear in between (same as three's MathUtils.clamp((t - a) / (b - a), 0, 1), NaN included).
export const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
