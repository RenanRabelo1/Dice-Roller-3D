import type { DieKind } from '../../regras/index.ts';
import type { Finish } from '../contracts.ts';

const EMBER: Partial<Record<string, string>> = { fire: '#FF4D00' }; // the fire die glows a little on its own

export const GemMaterial = ({ kind, color, finish = 'gema', painted = false }: { kind: DieKind; color: string; finish?: Finish; painted?: boolean }) => {
  // With painted numerals the colour lives in the vertices (white here), so the paint is not tinted.
  const tone = painted ? '#ffffff' : color, key = `${finish}${painted}`;
  // Gem look without a refraction pass: clearcoat + env reflections + slight translucency. The coin is solid gold.
  if (kind === 'coin') return <meshPhysicalMaterial color={color} metalness={1} roughness={0.32} envMapIntensity={0.75} transparent opacity={1} />;
  // Matte: opaque and rough, so a numeral cut into it reads. `transparent` stays on because the return animation fades opacity.
  if (finish === 'fosco') return <meshStandardMaterial key={key} color={tone} vertexColors={painted} roughness={0.8} metalness={0} transparent opacity={1} />;
  return (
    <meshPhysicalMaterial key={key} color={tone} vertexColors={painted} roughness={0.08} clearcoat={1} clearcoatRoughness={0.04}
      ior={1.6} specularIntensity={1} transparent opacity={0.88} emissive={EMBER[kind] ?? '#000000'} emissiveIntensity={0.35} />
  );
};
