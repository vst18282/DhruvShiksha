'use client';

import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Slice, LayerKind } from '@/lib/ice-core';
import { LAYER_COLORS } from '@/lib/ice-core';
import { seededRandom } from '@/lib/utils';

function Stack({ slices, x, cutaway, explode, visible, selected, onPick, label }: { slices: Slice[]; x: number; cutaway: boolean; explode: boolean; visible: Record<LayerKind, boolean>; selected: number | null; onPick: (s: Slice) => void; label?: string }) {
  const H = 4;
  const h = H / slices.length;
  const gap = explode ? h * 0.35 : 0;
  const total = H + gap * slices.length;
  const bubbles = useMemo(
    () =>
      slices.flatMap((s, i) => {
        if (s.kind !== 'bubbles') return [];
        const r = seededRandom(i * 17 + 3);
        return Array.from({ length: 6 }, () => ({ i, x: (r() - 0.5) * 0.6, z: (r() - 0.5) * 0.6, y: (r() - 0.5) * h * 0.7, s: 0.015 + r() * 0.02 }));
      }),
    [slices, h],
  );
  return (
    <group position={[x, 0, 0]}>
      {slices.map((s, i) => {
        const y = total / 2 - i * (h + gap) - h / 2;
        const hidden = !visible[s.kind];
        const color = new THREE.Color(LAYER_COLORS[s.kind]).multiplyScalar(s.kind === 'annual' ? s.shade : 1);
        return (
          <mesh
            key={i}
            position={[0, y, 0]}
            onClick={(e) => {
              e.stopPropagation();
              onPick(s);
            }}
            onPointerOver={() => (document.body.style.cursor = 'pointer')}
            onPointerOut={() => (document.body.style.cursor = '')}
          >
            <cylinderGeometry args={[0.5, 0.5, h * 0.98, 48, 1, false, 0, cutaway ? Math.PI * 1.5 : Math.PI * 2]} />
            <meshStandardMaterial
              color={selected === i ? '#F59E0B' : color}
              transparent
              opacity={hidden ? 0.08 : s.kind === 'annual' || s.kind === 'bubbles' ? 0.82 : 0.97}
              roughness={0.3}
              metalness={0.05}
              side={THREE.DoubleSide}
            />
            {s.event && !hidden && (
              <Html position={[0.62, 0, 0]} style={{ pointerEvents: 'none' }}>
                <div className="whitespace-nowrap rounded bg-polar-navy/90 px-1.5 py-0.5 text-[10px] text-white">⚑ {s.event}</div>
              </Html>
            )}
          </mesh>
        );
      })}
      {visible.bubbles &&
        bubbles.map((b, k) => (
          <mesh key={k} position={[b.x, total / 2 - b.i * (h + gap) - h / 2 + b.y, b.z]}>
            <sphereGeometry args={[b.s, 8, 8]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.9} />
          </mesh>
        ))}
      {label && (
        <Html position={[0, total / 2 + 0.35, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="whitespace-nowrap rounded bg-background/90 px-2 py-0.5 text-xs font-semibold text-foreground shadow">{label}</div>
        </Html>
      )}
    </group>
  );
}

export default function IceCoreScene({
  stacks,
  cutaway,
  explode,
  visible,
  selected,
  onPick,
}: {
  stacks: { slices: Slice[]; label?: string }[];
  cutaway: boolean;
  explode: boolean;
  visible: Record<LayerKind, boolean>;
  selected: { stack: number; index: number } | null;
  onPick: (stack: number, index: number) => void;
}) {
  return (
    <Canvas camera={{ position: [2.6, 1.2, 4.2], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={['#0B1F3A']} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 6, 5]} intensity={1.1} />
      <pointLight position={[-3, -2, 2]} intensity={0.6} color="#5BB5E8" />
      {stacks.map((s, i) => (
        <Stack
          key={i}
          slices={s.slices}
          label={s.label}
          x={stacks.length === 1 ? 0 : i === 0 ? -0.8 : 0.8}
          cutaway={cutaway}
          explode={explode}
          visible={visible}
          selected={selected?.stack === i ? selected.index : null}
          onPick={(sl) => onPick(i, s.slices.indexOf(sl))}
        />
      ))}
      <OrbitControls enablePan={false} minDistance={2.5} maxDistance={9} />
    </Canvas>
  );
}
