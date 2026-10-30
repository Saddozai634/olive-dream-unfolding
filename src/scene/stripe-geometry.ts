import * as THREE from "three";

/**
 * The stripe's journey, from inside the sealed parcel down to the lips.
 * Pure data + geometry, no React.
 */
export const STRIPE_POINTS: [number, number, number][] = [
  [0, 0.15, 0.35],
  [0.55, -2.2, 0.45],
  [-0.95, -5.6, 0.25],
  [0.75, -9.2, -0.2],
  [-0.45, -12.8, 0.3],
  [0.35, -16.2, 0.05],
  [-0.15, -19.4, 0],
  [0.1, -23.0, 0.3],
  [0.25, -27.0, 0.2],
  [0.25, -29.6, -0.3],
];

export const STRIPE_SEGMENTS = 420;

/** Builds the flat ribbon mesh along the stripe curve. Unroll via geometry.setDrawRange. */
export function buildStripeGeometry(
  segments = STRIPE_SEGMENTS,
  width = 0.22,
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(
    STRIPE_POINTS.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
  );
  const pts = curve.getSpacedPoints(segments);

  const vertCount = (segments + 1) * 2;
  const positions = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const indices = new Uint32Array(segments * 6);

  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();
  const zAxis = new THREE.Vector3(0, 0, 1);
  const half = width / 2;

  for (let i = 0; i <= segments; i++) {
    const p = pts[i];
    const next = pts[Math.min(i + 1, segments)];
    const prev = pts[Math.max(i - 1, 0)];
    tangent.subVectors(next, prev).normalize();
    side.crossVectors(tangent, zAxis);
    if (side.lengthSq() < 1e-8) side.set(1, 0, 0);
    side.normalize();
    // gentle organic twist along the length
    side.applyAxisAngle(tangent, 0.35 * Math.sin(i * 0.045));

    const base = i * 6;
    positions[base] = p.x - side.x * half;
    positions[base + 1] = p.y - side.y * half;
    positions[base + 2] = p.z - side.z * half;
    positions[base + 3] = p.x + side.x * half;
    positions[base + 4] = p.y + side.y * half;
    positions[base + 5] = p.z + side.z * half;

    const uvBase = i * 4;
    const v = i / segments;
    uvs[uvBase] = 0;
    uvs[uvBase + 1] = v;
    uvs[uvBase + 2] = 1;
    uvs[uvBase + 3] = v;

    if (i < segments) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      const idx = i * 6;
      indices[idx] = a;
      indices[idx + 1] = c;
      indices[idx + 2] = b;
      indices[idx + 3] = b;
      indices[idx + 4] = c;
      indices[idx + 5] = d;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  return geometry;
}

/** Ecru linen with fine olive pinstripes, drawn procedurally so the stripe feels woven. */
export function makeStripeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 1024;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("no 2d context");

  g.fillStyle = "#e7dfca";
  g.fillRect(0, 0, canvas.width, canvas.height);

  // wide soft olive bands
  g.fillStyle = "#8a8462";
  for (let x = 24; x < canvas.width; x += 64) {
    g.fillRect(x, 0, 10, canvas.height);
  }
  // fine pinstripes
  g.fillStyle = "#4a5327";
  for (let x = 8; x < canvas.width; x += 32) {
    g.fillRect(x, 0, 3, canvas.height);
  }

  // woven slub noise along the length
  const img = g.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let y = 0; y < canvas.height; y++) {
    const slub = Math.sin(y * 0.35) * 6 + Math.sin(y * 0.11) * 8;
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      const n = ((x * 7 + y * 13) % 17) - 8;
      const delta = slub * 0.4 + n;
      d[i] = Math.max(0, Math.min(255, d[i] + delta));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + delta));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + delta * 0.8));
    }
  }
  g.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
