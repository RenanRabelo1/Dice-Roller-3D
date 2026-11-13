// Allowed: the owner's collection and a $lookup into it. Violates: a $lookup into a collection of perfil.
interface Db { collection(nome: string): { aggregate(etapas: object[]): unknown } }

export const historico = (db: Db) => db.collection('rolls').aggregate([
  { $lookup: { from: 'rolls', localField: 'anterior', foreignField: '_id', as: 'anterior' } },
  { $lookup: { from: 'jogadores', localField: 'playerId', foreignField: '_id', as: 'jogador' } },
]);
