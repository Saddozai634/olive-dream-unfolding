import * as THREE from "three";
import { Suspense, forwardRef, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useTexture } from "@react-three/drei";
import {
  clamp01,
  damp,
  initScrollCapture,
  sampleCam,
  scrollState,
  smoothstep,
  type CamKey,
} from "@/game/scroll";
import {
  STRIPE_POINTS,
  STRIPE_SEGMENTS,
  buildStripeGeometry,
  makeStripeTexture,
} from "@/scene/stripe-geometry";

const BG = "#383e21";

/* ---------- framed photoreal planes, edge-masked so they melt into the olive ---------- */

const PLANE_VERT = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const PLANE_FRAG = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform sampler2D uMap;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  vec4 tex = texture2D(uMap, vUv);
  float d = length(vUv - 0.5) * 2.0;
  float mask = smoothstep(1.0, 0.55, d);
  gl_FragColor = vec4(tex.rgb, mask * uOpacity);
  #include <fog_fragment>
}
`;

interface FramedPlaneProps {
  map: THREE.Texture;
  position: [number, number, number];
  scale: [number, number];
  rotationY?: number;
}

const FramedPlane = forwardRef<THREE.Mesh, FramedPlaneProps>(function FramedPlane(
  { map, position, scale, rotationY = 0 },
  ref,
) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          { uMap: { value: null }, uOpacity: { value: 1 } },
        ]),
        vertexShader: PLANE_VERT,
        fragmentShader: PLANE_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: true,
      }),
    [],
  );

  useEffect(() => {
    material.uniforms.uMap.value = map;
    return () => material.dispose();
  }, [material, map]);

  return (
    <mesh
      ref={ref}
      position={position}
      scale={[scale[0], scale[1], 1]}
      rotation={[0, rotationY, 0]}
      material={material}
    >
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
});

/* ---------- story objects + the one per-frame director ---------- */

interface StoryRefs {
  stripe: React.RefObject<THREE.Mesh | null>;
  pkg: React.RefObject<THREE.Group | null>;
  closed: React.RefObject<THREE.Mesh | null>;
  open: React.RefObject<THREE.Mesh | null>;
  sleeper: React.RefObject<THREE.Mesh | null>;
  mouth: React.RefObject<THREE.Mesh | null>;
  dust: React.RefObject<THREE.Points | null>;
}

// Absolute camera keyframes around the parcel (act 0-1).
const PACKAGE_KEYS: CamKey[] = [
  { at: 0.0, pos: [0, 0.35, 4.8], look: [0, 0, 0] },
  { at: 0.2, pos: [0.1, 0.15, 3.2], look: [0, 0.05, 0] },
  { at: 0.3, pos: [0.5, -0.9, 3.0], look: [0.2, -2.4, 0] },
];

// Camera offsets relative to the stripe tip while following the descent (acts 2-4).
const FOLLOW_KEYS: CamKey[] = [
  { at: 0.28, pos: [1.4, 1.6, 3.2], look: [0, -1.4, 0] },
  { at: 0.55, pos: [0.3, 0.9, 3.0], look: [0, -1.6, 0] },
  { at: 0.82, pos: [-0.4, 0.7, 2.8], look: [0, -2.0, 0] },
];

// Final framed shot of the sleeper (act 5).
const FINAL_KEYS: CamKey[] = [
  { at: 0.84, pos: [-0.2, -23.2, 3.4], look: [-1.4, -23.6, -1.0] },
  { at: 1.0, pos: [-0.5, -23.7, 3.1], look: [-1.6, -23.8, -1.0] },
];

/** Stripe tip emergence over page progress: hidden until the parcel opens, inside the lips by 0.8. */
export const tipProgress = (p: number): number => smoothstep(clamp01((p - 0.16) / 0.64));

function Director({ refs }: { refs: StoryRefs }) {
  const camera = useThree((s) => s.camera);
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        STRIPE_POINTS.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
      ),
    [],
  );
  const scratch = useMemo(
    () => ({
      aPos: [0, 0, 0] as number[],
      aLook: [0, 0, 0] as number[],
      bPos: [0, 0, 0] as number[],
      bLook: [0, 0, 0] as number[],
      cPos: [0, 0, 0] as number[],
      cLook: [0, 0, 0] as number[],
      pos: new THREE.Vector3(),
      look: new THREE.Vector3(),
      tip: new THREE.Vector3(),
    }),
    [],
  );

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    scrollState.current = damp(scrollState.current, scrollState.target, 7, dt);
    const p = scrollState.current;
    const t = state.clock.elapsedTime;

    // stripe unroll
    const tip = tipProgress(p);
    const stripeGeo = refs.stripe.current?.geometry;
    if (stripeGeo) {
      stripeGeo.setDrawRange(0, Math.round(tip * STRIPE_SEGMENTS) * 6);
    }

    // camera: parcel shot -> follow the tip -> framed sleeper
    const { aPos, aLook, bPos, bLook, cPos, cLook, pos, look, tip: tipV } = scratch;
    sampleCam(PACKAGE_KEYS, p, aPos, aLook);
    sampleCam(FOLLOW_KEYS, p, bPos, bLook);
    sampleCam(FINAL_KEYS, p, cPos, cLook);
    curve.getPoint(tip, tipV);
    const b1 = smoothstep(clamp01((p - 0.26) / 0.06));
    const b2 = smoothstep(clamp01((p - 0.78) / 0.08));
    pos.set(aPos[0], aPos[1], aPos[2]);
    look.set(aLook[0], aLook[1], aLook[2]);
    pos.lerp(
      { x: tipV.x + bPos[0], y: tipV.y + bPos[1], z: tipV.z + bPos[2] } as THREE.Vector3,
      b1,
    );
    look.lerp(
      { x: tipV.x + bLook[0], y: tipV.y + bLook[1], z: tipV.z + bLook[2] } as THREE.Vector3,
      b1,
    );
    pos.lerp({ x: cPos[0], y: cPos[1], z: cPos[2] } as THREE.Vector3, b2);
    look.lerp({ x: cLook[0], y: cLook[1], z: cLook[2] } as THREE.Vector3, b2);
    camera.position.copy(pos);
    camera.lookAt(look);

    // parcel idle drift
    const pkg = refs.pkg.current;
    if (pkg) {
      pkg.rotation.z = 0.05 * Math.sin(t * 0.4);
      pkg.rotation.y = 0.12 + 0.08 * Math.sin(t * 0.27);
      pkg.position.y = 0.08 * Math.sin(t * 0.6);
    }

    // plane reveals
    const setOp = (m: THREE.Mesh | null, v: number) => {
      if (m) {
        const mat = m.material as THREE.ShaderMaterial;
        if (mat.uniforms?.uOpacity) mat.uniforms.uOpacity.value = v;
      }
    };
    setOp(refs.closed.current, 1 - smoothstep(clamp01((p - 0.14) / 0.08)));
    setOp(
      refs.open.current,
      smoothstep(clamp01((p - 0.1) / 0.06)) * (1 - smoothstep(clamp01((p - 0.3) / 0.1))),
    );
    setOp(refs.sleeper.current, smoothstep(clamp01((p - 0.52) / 0.08)));
    setOp(refs.mouth.current, smoothstep(clamp01((p - 0.66) / 0.08)));

    // dust drifting upward
    const dust = refs.dust.current;
    if (dust) {
      const attr = dust.geometry.getAttribute("position") as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 1; i < arr.length; i += 3) {
        arr[i] += dt * 0.22;
        if (arr[i] > 2) arr[i] = -34;
      }
      attr.needsUpdate = true;
    }
  });

  return null;
}

function ReadySignal() {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    document
      .querySelector("[data-scene-canvas]")
      ?.setAttribute("data-scene-ready", "true");
  });
  return null;
}

function Story() {
  const refs: StoryRefs = {
    stripe: useRef<THREE.Mesh>(null),
    pkg: useRef<THREE.Group>(null),
    closed: useRef<THREE.Mesh>(null),
    open: useRef<THREE.Mesh>(null),
    sleeper: useRef<THREE.Mesh>(null),
    mouth: useRef<THREE.Mesh>(null),
    dust: useRef<THREE.Points>(null),
  };

  const stripeGeo = useMemo(() => buildStripeGeometry(), []);
  const stripeTex = useMemo(() => makeStripeTexture(), []);
  useEffect(
    () => () => {
      stripeGeo.dispose();
      stripeTex.dispose();
    },
    [stripeGeo, stripeTex],
  );

  const [texClosed, texOpen, texSleeper, texMouth] = useTexture([
    "/images/package-closed.jpg",
    "/images/package-open.jpg",
    "/images/sleeper.jpg",
    "/images/mouth.jpg",
  ]);
  useEffect(() => {
    for (const tex of [texClosed, texOpen, texSleeper, texMouth]) {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
    }
  }, [texClosed, texOpen, texSleeper, texMouth]);

  const dustGeo = useMemo(() => {
    const n = 240;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (Math.random() * 2 - 1) * 6;
      arr[i * 3 + 1] = 2 - Math.random() * 36;
      arr[i * 3 + 2] = -4 + Math.random() * 7;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return geo;
  }, []);

  return (
    <>
      <Director refs={refs} />
      <group ref={refs.pkg}>
        <FramedPlane ref={refs.closed} map={texClosed} position={[0, 0, 0]} scale={[3.2, 3.2]} />
        <FramedPlane
          ref={refs.open}
          map={texOpen}
          position={[0, 0, 0.01]}
          scale={[3.2, 3.2]}
        />
      </group>
      <mesh ref={refs.stripe} geometry={stripeGeo} frustumCulled={false}>
        <meshStandardMaterial
          map={stripeTex}
          roughness={0.92}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>
      <FramedPlane
        ref={refs.sleeper}
        map={texSleeper}
        position={[-2.0, -23.5, -1.2]}
        scale={[8, 5]}
        rotationY={0.3}
      />
      <FramedPlane
        ref={refs.mouth}
        map={texMouth}
        position={[0.3, -30.0, -0.5]}
        scale={[9, 5.6]}
      />
      <points ref={refs.dust} geometry={dustGeo} frustumCulled={false}>
        <pointsMaterial
          size={0.035}
          color="#e9e4c8"
          transparent
          opacity={0.4}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
      <ReadySignal />
    </>
  );
}

export default function Scene() {
  useEffect(() => initScrollCapture(), []);

  return (
    <Canvas
      camera={{ fov: 42, position: [0, 0.35, 4.8], near: 0.1, far: 80 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 4.0, 15.0]} />
      <ambientLight intensity={0.45} color="#e5e2c8" />
      <directionalLight position={[3, 6, 5]} intensity={1.5} color="#fff2d2" />
      <directionalLight position={[-4, -2, -3]} intensity={0.5} color="#cdd8a0" />
      <Environment resolution={64}>
        <Lightformer intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} />
        <Lightformer
          intensity={0.8}
          color="#8b8f5e"
          position={[-5, 1, -1]}
          rotation-y={Math.PI / 2}
          scale={[20, 1, 1]}
        />
      </Environment>
      <Suspense fallback={null}>
        <Story />
      </Suspense>
    </Canvas>
  );
}
