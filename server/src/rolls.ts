import { ObjectId, type Collection, type Db } from 'mongodb';
import { CUSTOM_BASES, KINDS } from '../../src/dice/kinds.ts';
import type { OmenKind } from '../../src/dice/omen.ts';
import { CUSTOM, type Die } from './rules.ts';

// One document per throw. The dice are embedded: at most 10, always read with their throw.
// History is read per player, newest first, so the one index is (playerId, _id desc): an ObjectId grows
// with time, which also makes it the page cursor ("before this id").
export interface RollDoc { _id: ObjectId; playerId: string; createdAt: Date; dice: Die[]; total: number; omen: OmenKind | null; force: number | null }
export interface Roll { id: string; createdAt: string; dice: Die[]; total: number; omen: OmenKind | null; force: number | null }

// The collection itself also refuses malformed throws, whatever writes them.
const VALIDATOR = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['playerId', 'createdAt', 'dice', 'total', 'omen', 'force'],
    properties: {
      playerId: { bsonType: 'string', minLength: 1, maxLength: 64 },
      createdAt: { bsonType: 'date' },
      dice: {
        bsonType: 'array', minItems: 1, maxItems: 10,
        items: {
          bsonType: 'object', required: ['kind', 'value'], additionalProperties: false,
          properties: {
            kind: { anyOf: [{ enum: KINDS }, { bsonType: 'string', pattern: CUSTOM }] }, value: { bsonType: 'int', minimum: 1, maximum: 100 },
            base: { enum: [...CUSTOM_BASES] }, omens: { bsonType: 'bool' }, // imported dice only
          },
        },
      },
      total: { bsonType: 'int', minimum: 0 },
      omen: { enum: ['crit', 'fumble', 'duality', null] },
      force: { bsonType: ['double', 'int', 'null'], minimum: 0, maximum: 1 },
    },
  },
};

// Creates the collection (with its validator) and the history index if they are missing; safe to run on every start.
export async function rollsCollection(db: Db): Promise<Collection<RollDoc>> {
  if (!(await db.listCollections({ name: 'rolls' }, { nameOnly: true }).hasNext())) {
    await db.createCollection('rolls', { validator: VALIDATOR });
  }
  const rolls = db.collection<RollDoc>('rolls');
  await rolls.createIndex({ playerId: 1, _id: -1 }, { name: 'player_history' });
  return rolls;
}

const toRoll = ({ _id, createdAt, dice, total, omen, force }: RollDoc): Roll =>
  ({ id: _id.toHexString(), createdAt: createdAt.toISOString(), dice, total, omen, force });

export function rollStore(rolls: Collection<RollDoc>) {
  return {
    async add(roll: Omit<RollDoc, '_id' | 'createdAt'>): Promise<Roll> {
      const doc: RollDoc = { _id: new ObjectId(), createdAt: new Date(), ...roll };
      await rolls.insertOne(doc);
      return toRoll(doc);
    },
    // Newest first; `next` is the cursor for the following page, or null on the last one.
    async page(playerId: string, limit: number, before?: string): Promise<{ rolls: Roll[]; next: string | null }> {
      const docs = await rolls.find({ playerId, ...(before && { _id: { $lt: new ObjectId(before) } }) })
        .sort({ _id: -1 }).limit(limit + 1).toArray();
      const more = docs.length > limit;
      return { rolls: docs.slice(0, limit).map(toRoll), next: more ? docs[limit - 1]._id.toHexString() : null };
    },
  };
}
export type RollStore = ReturnType<typeof rollStore>;
