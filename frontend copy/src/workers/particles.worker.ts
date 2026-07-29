/**
 * particles.worker.ts
 * Off-main-thread WebGL2 (fallback WebGL1) particle scene for ScoreZero hero.
 * Receives messages:
 *   { type: 'init',    canvas: OffscreenCanvas, width: number, height: number, dpr: number }
 *   { type: 'resize',  width: number, height: number, dpr: number }
 *   { type: 'destroy' }
 */

const PARTICLE_COUNT = 420;

// GLSL — vertex shader
const VERT_SRC = `
attribute vec3 a_pos;
attribute float a_size;
attribute vec3 a_color;
attribute float a_alpha;
uniform mat4 u_mvp;
uniform float u_time;
varying vec3 v_color;
varying float v_alpha;
void main() {
  // gentle sin-wave drift on y
  vec3 p = a_pos;
  p.y += sin(u_time * 0.6 + a_pos.x * 3.14159) * 0.04;
  p.x += cos(u_time * 0.45 + a_pos.z * 2.71828) * 0.03;
  gl_Position = u_mvp * vec4(p, 1.0);
  gl_PointSize = a_size * (1.0 - gl_Position.z * 0.25);
  v_color = a_color;
  v_alpha = a_alpha;
}
`;

// GLSL — fragment shader (additive soft circle)
const FRAG_SRC = `
precision mediump float;
varying vec3 v_color;
varying float v_alpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c);
  if (d > 0.25) discard;
  float alpha = (1.0 - d * 4.0) * v_alpha;
  gl_FragColor = vec4(v_color * alpha, alpha);
}
`;

// ── helpers ──────────────────────────────────────────────────────────
function rand(min: number, max: number) { return min + Math.random() * (max - min); }

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh) ?? 'shader compile error');
  }
  return sh;
}

function linkProgram(gl: WebGLRenderingContext, vert: WebGLShader, frag: WebGLShader): WebGLProgram {
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog) ?? 'link error');
  }
  return prog;
}

// Orthographic-ish MVP (very slight perspective for depth feel)
function buildMVP(w: number, h: number): Float32Array {
  const aspect = w / h;
  const fov = 0.4; // very narrow = near-ortho
  const near = 0.1, far = 100;
  const f = 1 / Math.tan(fov / 2);
  // Simple perspective matrix
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) / (near - far), -1,
    0, 0, (2 * far * near) / (near - far), 0,
  ]);
}

// ── particle data ─────────────────────────────────────────────────────
const TEAL   = [0.176, 0.831, 0.749] as const; // #2DD4BF
const VIOLET = [0.486, 0.361, 1.0]   as const; // #7C5CFF

interface ParticleSystem {
  gl: WebGLRenderingContext;
  prog: WebGLProgram;
  posBuffer: WebGLBuffer;
  sizeBuffer: WebGLBuffer;
  colorBuffer: WebGLBuffer;
  alphaBuffer: WebGLBuffer;
  positions: Float32Array;
  sizes: Float32Array;
  colors: Float32Array;
  alphas: Float32Array;
  velocities: Float32Array; // [vx, vy, vz] per particle
  mvpLoc: WebGLUniformLocation;
  timeLoc: WebGLUniformLocation;
  aPos: number;
  aSize: number;
  aColor: number;
  aAlpha: number;
  rafId: number;
  width: number;
  height: number;
}

let sys: ParticleSystem | null = null;

function buildParticles() {
  const positions  = new Float32Array(PARTICLE_COUNT * 3);
  const sizes      = new Float32Array(PARTICLE_COUNT);
  const colors     = new Float32Array(PARTICLE_COUNT * 3);
  const alphas     = new Float32Array(PARTICLE_COUNT);
  const velocities = new Float32Array(PARTICLE_COUNT * 3);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;
    positions[i3]     = rand(-2, 2);
    positions[i3 + 1] = rand(-1.5, 1.5);
    positions[i3 + 2] = rand(-3, 0);

    sizes[i] = rand(2, 8);
    alphas[i] = rand(0.3, 0.85);

    velocities[i3]     = rand(-0.0003, 0.0003);
    velocities[i3 + 1] = rand(-0.0002, 0.0002);
    velocities[i3 + 2] = rand(-0.0001, 0.0001);

    // ~60% teal, ~40% violet
    const col = Math.random() < 0.6 ? TEAL : VIOLET;
    colors[i3]     = col[0];
    colors[i3 + 1] = col[1];
    colors[i3 + 2] = col[2];
  }
  return { positions, sizes, colors, alphas, velocities };
}

function uploadBuffer(
  gl: WebGLRenderingContext,
  buf: WebGLBuffer,
  data: Float32Array,
) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
}

function init(canvas: OffscreenCanvas, width: number, height: number, dpr: number) {
  canvas.width  = width * dpr;
  canvas.height = height * dpr;

  const gl = (
    canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: false }) ??
    canvas.getContext('webgl',  { antialias: false, alpha: true, premultipliedAlpha: false })
  ) as WebGLRenderingContext | null;

  if (!gl) {
    console.warn('[particles.worker] WebGL not available, exiting worker');
    return;
  }

  const vert = compileShader(gl, gl.VERTEX_SHADER,   VERT_SRC);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
  const prog = linkProgram(gl, vert, frag);

  const { positions, sizes, colors, alphas, velocities } = buildParticles();

  const posBuffer   = gl.createBuffer()!;
  const sizeBuffer  = gl.createBuffer()!;
  const colorBuffer = gl.createBuffer()!;
  const alphaBuffer = gl.createBuffer()!;

  uploadBuffer(gl, posBuffer,   positions);
  uploadBuffer(gl, sizeBuffer,  sizes);
  uploadBuffer(gl, colorBuffer, colors);
  uploadBuffer(gl, alphaBuffer, alphas);

  const aPos   = gl.getAttribLocation(prog, 'a_pos');
  const aSize  = gl.getAttribLocation(prog, 'a_size');
  const aColor = gl.getAttribLocation(prog, 'a_color');
  const aAlpha = gl.getAttribLocation(prog, 'a_alpha');

  const mvpLoc  = gl.getUniformLocation(prog, 'u_mvp')!;
  const timeLoc = gl.getUniformLocation(prog, 'u_time')!;

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // additive blending

  gl.viewport(0, 0, canvas.width, canvas.height);

  let startTime: number | null = null;

  sys = {
    gl, prog,
    posBuffer, sizeBuffer, colorBuffer, alphaBuffer,
    positions, sizes, colors, alphas, velocities,
    mvpLoc, timeLoc,
    aPos, aSize, aColor, aAlpha,
    rafId: 0,
    width: canvas.width,
    height: canvas.height,
  };

  const tick = (ts: number) => {
    if (!sys) return;
    if (startTime === null) startTime = ts;
    const elapsed = (ts - startTime) * 0.001; // seconds

    // Update positions
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      sys.positions[i3]     += sys.velocities[i3];
      sys.positions[i3 + 1] += sys.velocities[i3 + 1];
      sys.positions[i3 + 2] += sys.velocities[i3 + 2];

      // Wrap bounds
      if (sys.positions[i3]     >  2.2) sys.positions[i3]     = -2.2;
      if (sys.positions[i3]     < -2.2) sys.positions[i3]     =  2.2;
      if (sys.positions[i3 + 1] >  1.7) sys.positions[i3 + 1] = -1.7;
      if (sys.positions[i3 + 1] < -1.7) sys.positions[i3 + 1] =  1.7;
    }

    uploadBuffer(gl, sys.posBuffer, sys.positions);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0, 0, sys.width, sys.height);
    gl.useProgram(sys.prog);

    const mvp = buildMVP(sys.width, sys.height);
    gl.uniformMatrix4fv(sys.mvpLoc, false, mvp);
    gl.uniform1f(sys.timeLoc, elapsed);

    // Bind attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, sys.posBuffer);
    gl.enableVertexAttribArray(sys.aPos);
    gl.vertexAttribPointer(sys.aPos, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, sys.sizeBuffer);
    gl.enableVertexAttribArray(sys.aSize);
    gl.vertexAttribPointer(sys.aSize, 1, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, sys.colorBuffer);
    gl.enableVertexAttribArray(sys.aColor);
    gl.vertexAttribPointer(sys.aColor, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, sys.alphaBuffer);
    gl.enableVertexAttribArray(sys.aAlpha);
    gl.vertexAttribPointer(sys.aAlpha, 1, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.POINTS, 0, PARTICLE_COUNT);

    sys.rafId = requestAnimationFrame(tick);
  };

  sys.rafId = requestAnimationFrame(tick);
}

// ── message handler ───────────────────────────────────────────────────
self.addEventListener('message', (e: MessageEvent) => {
  const { type } = e.data as { type: string };

  if (type === 'init') {
    const { canvas, width, height, dpr } = e.data as {
      canvas: OffscreenCanvas; width: number; height: number; dpr: number;
    };
    init(canvas, width, height, dpr);
  }

  if (type === 'resize' && sys) {
    const { width, height, dpr } = e.data as { width: number; height: number; dpr: number };
    const canvas = sys.gl.canvas as OffscreenCanvas;
    canvas.width  = width * dpr;
    canvas.height = height * dpr;
    sys.width  = canvas.width;
    sys.height = canvas.height;
  }

  if (type === 'destroy' && sys) {
    cancelAnimationFrame(sys.rafId);
    sys.gl.getExtension('WEBGL_lose_context')?.loseContext();
    sys = null;
  }
});
``