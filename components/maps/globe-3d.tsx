'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Line, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { geoEquirectangular, geoPath } from 'd3-geo';
import type { StationSlug } from '@/types';
import { STATIONS, NCPOR_HQ } from '@/data/stations';
import { EXPEDITIONS } from '@/data/expeditions';
import { REGION_META } from '@/lib/constants';
import { getBorders, getLand } from '@/lib/geo';

/**
 * Optional high-quality texture. Drop an equirectangular image at
 * /public/textures/earth.jpg (e.g. NASA Blue Marble, 4096×2048) and set this constant
 * to '/textures/earth.jpg'. When null, a procedural dot-matrix texture is generated
 * from the bundled TopoJSON (no network).
 */
export const REAL_TEXTURE_URL: string | null = null;

export function latLonToVec3(lat: number, lon: number, r = 1): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

function makeProceduralTexture(night: boolean): THREE.CanvasTexture {
  const W = 2048;
  const H = 1024;
  const base = document.createElement('canvas');
  base.width = W;
  base.height = H;
  const ctx = base.getContext('2d')!;
  const proj = geoEquirectangular().fitSize([W, H], { type: 'Sphere' });
  const path = geoPath(proj, ctx);
  // Land mask on an offscreen canvas.
  const mask = document.createElement('canvas');
  mask.width = W;
  mask.height = H;
  const mctx = mask.getContext('2d')!;
  mctx.fillStyle = '#fff';
  mctx.beginPath();
  geoPath(proj, mctx)(getLand());
  mctx.fill();
  const data = mctx.getImageData(0, 0, W, H).data;

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, night ? '#040c1c' : '#0f3a66');
  g.addColorStop(0.5, night ? '#07142b' : '#1b5a93');
  g.addColorStop(1, night ? '#040c1c' : '#0f3a66');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = night ? '#0d2240' : '#244d78';
  ctx.beginPath();
  path(getLand());
  ctx.fill();
  // Dot matrix over land.
  const step = 9;
  ctx.fillStyle = night ? '#5BB5E8' : '#dff0fb';
  for (let y = step / 2; y < H; y += step) {
    const lat = 90 - (y / H) * 180;
    const stretch = 1 / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
    for (let x = step / 2; x < W; x += step * Math.min(4, stretch)) {
      const i = (Math.floor(y) * W + Math.floor(x)) * 4;
      if (data[i] > 128) {
        ctx.beginPath();
        ctx.arc(x, y, 2.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.strokeStyle = night ? 'rgba(91,181,232,0.25)' : 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  path(getBorders());
  ctx.stroke();
  const tex = new THREE.CanvasTexture(base);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function Earth({ night }: { night: boolean }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (REAL_TEXTURE_URL) {
      new THREE.TextureLoader().load(
        REAL_TEXTURE_URL,
        (t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          setTex(t);
        },
        undefined,
        () => setTex(makeProceduralTexture(night)),
      );
    } else setTex(makeProceduralTexture(night));
  }, [night]);
  return (
    <mesh>
      <sphereGeometry args={[1, 96, 96]} />
      {tex ? <meshStandardMaterial map={tex} roughness={0.9} metalness={0} emissiveMap={night ? tex : null} emissive={night ? new THREE.Color('#5BB5E8') : new THREE.Color('#000')} emissiveIntensity={night ? 0.55 : 0} /> : <meshStandardMaterial color="#1b5a93" />}
    </mesh>
  );
}

function Atmosphere() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `varying vec3 vN; void main(){ float i = pow(0.72 - dot(vN, vec3(0.0,0.0,1.0)), 3.0); gl_FragColor = vec4(0.18,0.83,0.75,1.0) * i; }`,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
      }),
    [],
  );
  return (
    <mesh scale={1.12} material={mat}>
      <sphereGeometry args={[1, 64, 64]} />
    </mesh>
  );
}

function Marker({ slug, onSelect, hovered, setHovered }: { slug: StationSlug; onSelect: (s: StationSlug) => void; hovered: boolean; setHovered: (s: StationSlug | null) => void }) {
  const st = STATIONS.find((s) => s.slug === slug)!;
  const pos = useMemo(() => latLonToVec3(st.lat, st.lon, 1.01), [st]);
  const ring = useRef<THREE.Mesh>(null);
  const color = REGION_META[st.region].color;
  useEffect(() => {
    ring.current?.lookAt(pos.clone().multiplyScalar(2));
  }, [pos]);
  useFrame(({ clock }) => {
    if (!ring.current) return;
    const s = 1 + ((clock.elapsedTime * 0.8) % 1) * 2.2;
    ring.current.scale.setScalar(s);
    (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - ((clock.elapsedTime * 0.8) % 1));
  });
  return (
    <group position={pos}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(slug);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(null);
          document.body.style.cursor = '';
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(slug);
        }}
      >
        <sphereGeometry args={[hovered ? 0.024 : 0.018, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh ref={ring}>
        <ringGeometry args={[0.02, 0.026, 32]} />
        <meshBasicMaterial color={color} transparent side={THREE.DoubleSide} />
      </mesh>
      {hovered && (
        <Html distanceFactor={4} center style={{ pointerEvents: 'none' }}>
          <div className="whitespace-nowrap rounded-md bg-polar-navy/90 px-2 py-1 text-xs text-white shadow">
            <strong>{st.name}</strong> · {REGION_META[st.region].label}
            <br />
            {st.lat.toFixed(1)}°, {st.lon.toFixed(1)}° · click for details
          </div>
        </Html>
      )}
    </group>
  );
}

function Arc({ to, color }: { to: THREE.Vector3; color: string }) {
  const from = useMemo(() => latLonToVec3(NCPOR_HQ.lat, NCPOR_HQ.lon, 1.01), []);
  const points = useMemo(() => {
    const mid = from.clone().add(to).normalize().multiplyScalar(1 + from.distanceTo(to) * 0.35);
    return new THREE.QuadraticBezierCurve3(from, mid, to).getPoints(64);
  }, [from, to]);
  const ref = useRef<{ material: { dashOffset: number } } | null>(null);
  useFrame((_, dt) => {
    if (ref.current?.material) ref.current.material.dashOffset -= dt * 0.25;
  });
  return <Line ref={ref as never} points={points} color={color} lineWidth={1.6} dashed dashSize={0.05} gapSize={0.03} transparent opacity={0.9} />;
}

function Track({ coords, color }: { coords: [number, number][]; color: string }) {
  const points = useMemo(() => {
    const out: THREE.Vector3[] = [];
    for (let i = 0; i < coords.length - 1; i++) {
      const a = latLonToVec3(coords[i][1], coords[i][0], 1);
      const b = latLonToVec3(coords[i + 1][1], coords[i + 1][0], 1);
      for (let s = 0; s <= 16; s++) {
        const v = a.clone().lerp(b, s / 16).normalize().multiplyScalar(1.004);
        out.push(v);
      }
    }
    return out;
  }, [coords]);
  return <Line points={points} color={color} lineWidth={1} transparent opacity={0.55} />;
}

function Flyer({ target, onDone }: { target: THREE.Vector3 | null; onDone: () => void }) {
  const { camera } = useThree();
  const controls = useThree((s) => s.controls) as unknown as { update: () => void } | null;
  useFrame(() => {
    if (!target) return;
    camera.position.lerp(target, 0.06);
    camera.lookAt(0, 0, 0);
    controls?.update();
    if (camera.position.distanceTo(target) < 0.02) onDone();
  });
  return null;
}

export default function Globe3D({
  autoRotate,
  night,
  showTracks,
  showArcs,
  fly,
  onFlown,
  onSelect,
}: {
  autoRotate: boolean;
  night: boolean;
  showTracks: boolean;
  showArcs: boolean;
  fly: { lat: number; lon: number } | null;
  onFlown: () => void;
  onSelect: (s: StationSlug) => void;
}) {
  const [hovered, setHovered] = useState<StationSlug | null>(null);
  const target = useMemo(() => (fly ? latLonToVec3(fly.lat, fly.lon, 2.7) : null), [fly]);
  return (
    <Canvas camera={{ position: [0.8, 0.9, 2.9], fov: 45 }} dpr={[1, 2]} aria-label="3D globe" role="img">
      <color attach="background" args={[night ? '#02060f' : '#07142b']} />
      <ambientLight intensity={night ? 0.25 : 0.85} />
      <directionalLight position={[5, 3, 5]} intensity={night ? 0.35 : 1.3} />
      <Earth night={night} />
      <Atmosphere />
      {STATIONS.map((s) => (
        <Marker key={s.slug} slug={s.slug} onSelect={onSelect} hovered={hovered === s.slug} setHovered={setHovered} />
      ))}
      <mesh position={latLonToVec3(NCPOR_HQ.lat, NCPOR_HQ.lon, 1.01)}>
        <sphereGeometry args={[0.016, 16, 16]} />
        <meshBasicMaterial color="#F59E0B" />
      </mesh>
      {showArcs && STATIONS.map((s) => <Arc key={s.slug} to={latLonToVec3(s.lat, s.lon, 1.01)} color={REGION_META[s.region].color} />)}
      {showTracks && EXPEDITIONS.map((e) => <Track key={e.id} coords={e.track} color={REGION_META[e.region].color} />)}
      <OrbitControls makeDefault enablePan={false} minDistance={1.5} maxDistance={6} autoRotate={autoRotate && !fly} autoRotateSpeed={0.6} enableDamping />
      <Flyer target={target} onDone={onFlown} />
    </Canvas>
  );
}
