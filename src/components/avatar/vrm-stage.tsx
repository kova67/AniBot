"use client";

import { RefreshCw } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { VRM, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { useSelectedAvatar } from "@/components/avatar/avatar-provider";
import { cn } from "@/lib/utils";

type StageState = "loading" | "ready" | "error";

/**
 * Public-edition VRM adapter.
 *
 * This intentionally uses only the standard three-vrm loader and orbit
 * controls. AniBot's private lip-sync, motion corpus, retargeting, and
 * character-runtime layers are extension points rather than redistributed
 * source or assets.
 */
export function VrmStage({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
  speaking?: boolean;
}) {
  const { avatar } = useSelectedAvatar();
  const mountRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<StageState>("loading");
  const [loadProgress, setLoadProgress] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    setState("loading");
    setLoadProgress(0);

    let activeVrm: VRM | null = null;
    let disposed = false;
    let frameId = 0;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(compact ? 28 : 30, 1, 0.1, 20);
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
      stencil: false,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x151515, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(2.5, 4.5, 4);
    scene.add(key);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.minDistance = 1.1;
    controls.maxDistance = 10;

    const frameModel = () => {
      if (!activeVrm) return;
      activeVrm.scene.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(activeVrm.scene);
      if (bounds.isEmpty()) return;
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const verticalFov = THREE.MathUtils.degToRad(camera.fov);
      const distance = Math.max(size.y, size.x / Math.max(camera.aspect, 0.1))
        / (2 * Math.tan(verticalFov / 2));
      controls.target.copy(center);
      camera.position.set(center.x, center.y, center.z + distance * 1.24 + size.z * 0.5);
      controls.update();
    };

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, true);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      frameModel();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(
      avatar.model,
      (gltf) => {
        if (disposed) return;
        const vrm = gltf.userData.vrm as VRM | undefined;
        if (!vrm) {
          setState("error");
          return;
        }
        VRMUtils.removeUnnecessaryVertices(vrm.scene);
        VRMUtils.combineSkeletons(vrm.scene);
        VRMUtils.rotateVRM0(vrm);
        vrm.humanoid.resetNormalizedPose();
        activeVrm = vrm;
        scene.add(vrm.scene);
        frameModel();
        setLoadProgress(1);
        setState("ready");
      },
      (event) => {
        if (disposed || !event.total) return;
        setLoadProgress(Math.min(0.96, event.loaded / event.total));
      },
      () => {
        if (!disposed) setState("error");
      },
    );

    const clock = new THREE.Clock();
    const animate = () => {
      const delta = Math.min(clock.getDelta(), 0.05);
      activeVrm?.update(delta);
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      controls.dispose();
      activeVrm?.scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry?.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [avatar.model, compact, reloadKey]);

  return (
    <div
      aria-label={`Interactive 3D model: ${avatar.name}`}
      className={cn("relative isolate overflow-hidden bg-black", className)}
      role="region"
    >
      <div
        aria-hidden="true"
        className={cn(
          "ani-vrm-ready-bloom pointer-events-none absolute inset-0 z-0 opacity-0",
          state === "ready" && "is-ready",
        )}
      />
      <div
        className={cn(
          "absolute inset-0 z-[1] cursor-grab transition-[opacity,transform,filter] duration-700 ease-out active:cursor-grabbing",
          state === "ready"
            ? "scale-100 opacity-100 blur-0"
            : "scale-[0.985] opacity-0 blur-[3px]",
        )}
        ref={mountRef}
      />

      <div
        aria-hidden={state === "ready"}
        aria-live="polite"
        className={cn(
          "absolute inset-0 z-10 flex items-center justify-center overflow-hidden bg-black/68 px-6 backdrop-blur-[2px] transition-[opacity] duration-500 ease-out",
          state === "ready" ? "pointer-events-none opacity-0" : "opacity-100",
          state === "error" ? "pointer-events-auto" : "pointer-events-none",
        )}
        role={state === "error" ? "alert" : "status"}
      >
        <div aria-hidden="true" className="ani-vrm-load-field absolute inset-0" />
        <div className="relative flex flex-col items-center text-center">
          <div className="ani-vrm-loader-lens relative size-[92px] rounded-full p-[5px]">
            <div className="relative size-full overflow-hidden rounded-full bg-black shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.12),0_18px_60px_rgb(0_0_0_/_0.72)]">
              <Image
                alt=""
                className={cn(
                  "object-cover transition-[filter,opacity,transform] duration-500 ease-out",
                  state === "error"
                    ? "scale-[1.03] grayscale opacity-38"
                    : "scale-100 opacity-78 grayscale-[0.12]",
                )}
                fill
                sizes="92px"
                src={avatar.thumbnail}
              />
              {state === "loading" ? <span className="ani-vrm-loader-sheen absolute inset-0" /> : null}
            </div>
          </div>

          <p className="mt-5 text-[12px] font-medium tracking-[-0.015em] text-white/76">
            {state === "error" ? `Couldn’t load ${avatar.name}` : `Loading ${avatar.name}`}
          </p>
          <p className="mt-1 text-[11px] text-white/34">
            {state === "error" ? "The model file didn’t finish loading." : "Preparing the model"}
          </p>

          {state === "error" ? (
            <button
              className="mt-5 flex min-h-10 items-center gap-2 rounded-chip bg-white px-3.5 text-[12px] font-medium text-black transition-[background-color,scale] duration-150 hover:bg-white/88 active:scale-[0.96]"
              onClick={() => setReloadKey((value) => value + 1)}
              type="button"
            >
              <RefreshCw className="size-3.5" strokeWidth={2} />
              Try again
            </button>
          ) : (
            <div className="mt-5 h-px w-28 overflow-hidden bg-white/[0.09]">
              <span
                className="block h-full origin-left bg-[linear-gradient(90deg,rgb(var(--blush-rgb)/0.34),rgb(var(--pearl-rgb)/0.92))] transition-transform duration-300 ease-out"
                style={{ transform: `scaleX(${Math.max(0.035, loadProgress)})` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
