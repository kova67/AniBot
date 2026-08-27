"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * A slow pearl/blush light field for the top of the page.
 *
 * Written against raw WebGL rather than a shader library: the page already
 * carries three.js for the VRM, and a second GL runtime would cost more bundle
 * and more GPU than this one 40-line fragment shader. It renders at half
 * resolution, caps itself near 30fps, sleeps whenever it scrolls out of view or
 * the tab is hidden, and paints exactly one frame under reduced motion.
 *
 * Domain-warped fBm after Inigo Quilez's public write-up on warping
 * (https://iquilezles.org/articles/warp/), reimplemented here.
 */

const VERTEX_SHADER = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_pointer;   // 0..1, eased
uniform float u_intensity;
uniform float u_anchor;    // 0 = hug the top, 1 = hug the bottom

out vec4 outColor;

// -- value noise ----------------------------------------------------------
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float total = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    total += amp * noise(p);
    p = p * 2.02 + vec2(1.7, 9.2);
    amp *= 0.5;
  }
  return total;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  // gl_FragCoord counts up from the bottom, so this is the distance from
  // whichever edge the field is anchored to.
  float depth = mix(1.0 - uv.y, uv.y, u_anchor);

  // Work in a wide aspect so the bands read as horizontal drift, not blobs.
  vec2 p = vec2(uv.x * 2.4, uv.y * 1.15);
  float t = u_time * 0.035;

  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3 - t)));
  vec2 r = vec2(
    fbm(p + 2.0 * q + vec2(1.7, 9.2) + 0.15 * t),
    fbm(p + 2.0 * q + vec2(8.3, 2.8) - 0.12 * t)
  );
  float f = fbm(p + 1.8 * r);

  // Ani's palette: blush through rose, with one restrained violet in the
  // trough. Pearl is deliberately absent — pushing toward it turns the field
  // white long before it reads as light.
  vec3 blush  = vec3(0.886, 0.678, 0.741);
  vec3 rose   = vec3(0.780, 0.470, 0.588);
  vec3 violet = vec3(0.494, 0.427, 0.694);

  vec3 col = mix(violet, rose, clamp(f * 1.9, 0.0, 1.0));
  col = mix(col, blush, clamp(length(r) * 0.75, 0.0, 1.0));

  // Bands, not a wash: only the top of the noise range survives the curve.
  float density = pow(smoothstep(0.38, 0.86, f), 1.45);

  // Sit just below the header and fade out well before the fold.
  float vertical = smoothstep(0.0, 0.13, depth) * smoothstep(0.98, 0.34, depth);

  // A soft light that leans toward the pointer without chasing it. The pointer
  // arrives in page space (0 at the top), so it is compared against depth.
  float pointerDepth = mix(u_pointer.y, 1.0 - u_pointer.y, u_anchor);
  float toPointer = distance(
    vec2(uv.x, depth),
    vec2(u_pointer.x, clamp(pointerDepth, 0.0, 0.72))
  );
  float lift = smoothstep(0.8, 0.05, toPointer) * 0.4;

  float edge = smoothstep(0.0, 0.3, uv.x) * smoothstep(1.0, 0.7, uv.x);

  // Hard ceiling. This layer is air; it must never become a surface.
  float alpha = density * vertical * (0.55 + lift) * (0.35 + 0.65 * edge);
  alpha = min(alpha, 0.9) * 0.7 * u_intensity;

  outColor = vec4(col * alpha, alpha);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    // Silent failure here would leave an undefined draw on screen, which is
    // exactly how a background effect turns into a white rectangle.
    console.warn("AuroraField: shader failed to compile", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function AuroraField({
  anchor = "top",
  className,
  intensity = 1,
}: {
  /** Which edge the bands gather against. */
  anchor?: "top" | "bottom";
  className?: string;
  /** 0–1 multiplier so a section can dim the field without a second canvas. */
  intensity?: number;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const intensityRef = useRef(intensity);
  const anchorRef = useRef(anchor);

  useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);

  useEffect(() => {
    anchorRef.current = anchor;
  }, [anchor]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // The canvas is created per effect run rather than held in a ref. React 19
    // mounts effects twice in development, and a reused canvas hands back the
    // same context on the second run — a context this cleanup has already lost,
    // so every shader after it silently fails to compile.
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    mount.appendChild(canvas);

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: "low-power",
      premultipliedAlpha: true,
      stencil: false,
    });
    const abort = () => canvas.remove();
    if (!gl) return abort;

    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return abort;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("AuroraField: program failed to link", gl.getProgramInfoLog(program));
      return abort;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const location = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "u_res");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uPointer = gl.getUniformLocation(program, "u_pointer");
    const uIntensity = gl.getUniformLocation(program, "u_intensity");
    const uAnchor = gl.getUniformLocation(program, "u_anchor");

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = { x: 0.5, y: 0.16 };
    const eased = { x: 0.5, y: 0.16 };
    let visible = true;
    let frameId = 0;
    let lastDraw = 0;
    let started = 0;

    const resize = () => {
      const { clientWidth, clientHeight } = canvas;
      if (!clientWidth || !clientHeight) return;
      // Half resolution: the field is all low-frequency, so nobody can tell,
      // and it keeps the fragment count off the VRM canvas's back.
      const scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.5;
      const width = Math.max(2, Math.round(clientWidth * scale));
      const height = Math.max(2, Math.round(clientHeight * scale));
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    };

    const paint = (time: number) => {
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, time);
      gl.uniform2f(uPointer, eased.x, eased.y);
      gl.uniform1f(uIntensity, intensityRef.current);
      gl.uniform1f(uAnchor, anchorRef.current === "bottom" ? 1 : 0);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const drawStatic = () => {
      resize();
      paint(18);
    };

    const loop = (now: number) => {
      frameId = requestAnimationFrame(loop);
      if (!visible) return;
      // ~32fps is plenty for something this slow and saves a third of the work.
      if (now - lastDraw < 31) return;
      lastDraw = now;
      if (!started) started = now;
      eased.x += (pointer.x - eased.x) * 0.045;
      eased.y += (pointer.y - eased.y) * 0.045;
      resize();
      paint((now - started) / 1000);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointer.x = (event.clientX - rect.left) / rect.width;
      pointer.y = (event.clientY - rect.top) / rect.height;
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting && !document.hidden;
      },
      { rootMargin: "120px" },
    );
    observer.observe(canvas);

    const onVisibility = () => {
      if (document.hidden) visible = false;
    };

    const start = () => {
      cancelAnimationFrame(frameId);
      if (reducedMotion.matches) {
        drawStatic();
        return;
      }
      started = 0;
      lastDraw = 0;
      frameId = requestAnimationFrame(loop);
    };

    const resizeObserver = new ResizeObserver(() => {
      if (reducedMotion.matches) drawStatic();
    });
    resizeObserver.observe(canvas);

    reducedMotion.addEventListener("change", start);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    start();

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      resizeObserver.disconnect();
      reducedMotion.removeEventListener("change", start);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointerMove);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.deleteBuffer(buffer);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none block size-full", className)}
      ref={mountRef}
    />
  );
}
