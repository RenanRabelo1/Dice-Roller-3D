// The HTTP contract of the roll history: the types the browser imports with `import type` (ADR 0004)
// and the JSON schemas the routes validate with. No fastify or mongodb here: it must compile on both sides.
import { CUSTOM_BASES, FREE_VALUES, KINDS, MAX_DICE, type CustomBase, type DieKind, type OmenKind } from '../../../../src/modules/regras/index.ts';

// An imported die: "custom:" and the id the browser gave it.
export const CUSTOM = '^custom:[A-Za-z0-9_-]{1,64}$';
// The player is an anonymous id the browser keeps (until there are accounts).
const PLAYER = { type: 'string', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' } as const;

// An imported die (kind "custom:<id>") also says which solid it is and whether it counts as a d20 for omens.
export interface DieIn { kind: DieKind; value: number; base?: CustomBase; omens?: boolean }
/** Body of `POST /rolls`. */
export interface RollIn { playerId: string; dice: DieIn[]; force?: number }
/** One saved throw: the answer of `POST /rolls` and an item of `GET /rolls`. */
export interface Roll { id: string; createdAt: string; dice: DieIn[]; total: number; omen: OmenKind | null; force: number | null }
/** Answer of `GET /rolls`: newest first; `next` is the `before` of the following page, or null on the last one. */
export interface RollPage { rolls: Roll[]; next: string | null }
/** Query of `GET /rolls`, after the schema's default (`limit` 20). */
export interface RollQuery { playerId: string; limit: number; before?: string }

export const ROLL_IN_SCHEMA = {
  body: {
    type: 'object', required: ['playerId', 'dice'], additionalProperties: false,
    properties: {
      playerId: PLAYER,
      dice: {
        type: 'array', minItems: 1, maxItems: MAX_DICE,
        items: {
          type: 'object', required: ['kind', 'value'], additionalProperties: false,
          properties: {
            kind: { anyOf: [{ enum: KINDS }, { type: 'string', pattern: CUSTOM }] }, value: { type: 'integer', minimum: FREE_VALUES.min, maximum: FREE_VALUES.max },
            base: { enum: CUSTOM_BASES }, omens: { type: 'boolean' }, // imported dice only
          },
        },
      },
      force: { type: 'number', minimum: 0, maximum: 1 },
    },
  },
};

export const ROLL_QUERY_SCHEMA = {
  querystring: {
    type: 'object', required: ['playerId'], additionalProperties: false,
    properties: {
      playerId: PLAYER,
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      before: { type: 'string', pattern: '^[0-9a-f]{24}$' },
    },
  },
};
