"use client";

import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { Resort } from "../lib/types/resort";
import { useFilter } from "../lib/context/FilterContext";
import { latLngToVector3 } from "../lib/globe-utils/geo";
import { buildClusters, ClusterPoint } from "../lib/globe-utils/clustering";
import {
  makeClusterTexture,
  makeGlowTexture,
  makePinTexture,
} from "../lib/globe-utils/textures";

export interface ScreenPos {
  x: number;
  y: number;
}

interface GlobeProps {
  resorts: Resort[];
  onResortClick: (resort: Resort, pos: ScreenPos) => void;
  onClusterClick: (resorts: Resort[], pos: ScreenPos) => void;
}

const IKON_COLOR = 0x072141;
const EPIC_COLOR = 0xff8b00;

const INTRO = {
  DURATION: 4000,
  FADE_DELAY: 200,
  START_Z_FACTOR: 60,
  END_Z_FACTOR: 1.9,
  START_ROT_Y: Math.PI * 2,
  END_ROT_Y: 0.3,
  END_ROT_X: 0.72,
  // Arc: camera sweeps from a side angle down to center
  START_X_OFFSET: 0.6, // fraction of R — how far off-axis to start
} as const;

type SpriteSet = {
  sprites: THREE.Sprite[];
  localPositions: THREE.Vector3[];
  payloads: (Resort | Resort[])[];
};

function easeOutSext(t: number) {
  return 1 - Math.pow(1 - t, 6);
}

export default function Globe({
  resorts,
  onResortClick,
  onClusterClick,
}: GlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const { activePasses } = useFilter();
  const spritesRef = useRef<THREE.Sprite[]>([]);
  const spritePassTypesRef = useRef<(string | undefined)[]>([]);
  const applyFilterRef = useRef<((passes: Set<string>) => void) | null>(null);
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const previousMouse = useRef({ x: 0, y: 0 });
  const rotation = useRef({ x: 0, y: 0 });
  const cleanupRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!mountRef.current) return;
    const mountEl = mountRef.current;
    let cancelled = false;

    const width = mountEl.clientWidth;
    const height = mountEl.clientHeight;
    const R = 50;

    // --- Renderer & Camera ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
    camera.position.z = R * 2;
    camera.setViewOffset(width * 1.5, height, width * 0.5, 0, width, height);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    mountEl.appendChild(renderer.domElement);

    // --- Lights ---
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8);
    directionalLight.position.set(R * 5, R * 3, R * 5);
    scene.add(directionalLight);

    // --- Procedural stars ---
    const starCount = 1800;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = R * 18;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(starPositions, 3),
    );
    scene.add(
      new THREE.Points(
        starGeo,
        new THREE.PointsMaterial({
          color: 0xffffff,
          size: R * 0.04,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.7,
        }),
      ),
    );

    // --- Load all textures then build scene ---
    const globeGeo = new THREE.SphereGeometry(R, 64, 64);
    const load = (url: string) =>
      new Promise<THREE.Texture>((resolve) =>
        new THREE.TextureLoader().load(url, resolve),
      );

    Promise.all([
      load("/earth_color_8k_v3.png"),
      load("/earth-specular.png"),
      load("/8k_earth_clouds.jpg"),
      load("/8k_stars_milky_way.jpg"),
      load("/Epic.png"),
      load("/Ikon.png"),
    ]).then(
      ([colorMap, specularMap, cloudMap, milkyWayMap, epicTexRaw, ikonTexRaw]) => {
        const epicTex = makePinTexture(epicTexRaw.image as HTMLImageElement);
        const ikonTex = makePinTexture(ikonTexRaw.image as HTMLImageElement);
        if (cancelled) return;
        setReady(true);

        // Milky Way skybox
        scene.add(
          new THREE.Mesh(
            new THREE.SphereGeometry(R * 50, 64, 64),
            new THREE.MeshBasicMaterial({
              map: milkyWayMap,
              side: THREE.BackSide,
              opacity: 0.2,
              transparent: true,
            }),
          ),
        );

        // Earth sphere
        const globeGroup = new THREE.Group();
        scene.add(globeGroup);

        const globeMat = new THREE.MeshPhongMaterial({
          map: colorMap,
          specularMap,
          specular: new THREE.Color(0x334455),
          shininess: 12,
        });
        globeMat.onBeforeCompile = (shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <map_fragment>",
            `#include <map_fragment>
          float blueExcess = clamp((diffuseColor.b - max(diffuseColor.r, diffuseColor.g)) * 5.0, 0.0, 1.0);
          vec3 darkenedOcean = diffuseColor.rgb * vec3(0.14, 0.26, 0.52);
          diffuseColor.rgb = mix(diffuseColor.rgb, darkenedOcean, blueExcess);`,
          );
        };
        globeGroup.add(new THREE.Mesh(globeGeo, globeMat));

        // Cloud layer
        globeGroup.add(
          new THREE.Mesh(
            new THREE.SphereGeometry(R * 1.005, 64, 64),
            new THREE.MeshPhongMaterial({
              map: cloudMap,
              transparent: true,
              opacity: 0.1,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
            }),
          ),
        );

        // --- Sprite sets (all / ikon-only / epic-only) ---
        function buildSpriteSet(clusterList: ClusterPoint[]): SpriteSet {
          const set: SpriteSet = {
            sprites: [],
            localPositions: [],
            payloads: [],
          };
          clusterList.forEach((point) => {
            const isCluster = point.type === "cluster";
            const pass = isCluster ? point.resorts[0]?.pass : point.resort.pass;
            const lat = isCluster ? point.lat : point.resort.lat;
            const lng = isCluster ? point.lng : point.resort.lng;

            let texture: THREE.Texture;
            if (isCluster) {
              const hasIkon = point.resorts.some((r) => r.pass === "Ikon");
              const hasEpic = point.resorts.some((r) => r.pass === "Epic");
              texture =
                hasIkon && hasEpic
                  ? makeClusterTexture(
                      point.resorts.length,
                      IKON_COLOR,
                      EPIC_COLOR,
                    )
                  : makeClusterTexture(
                      point.resorts.length,
                      hasEpic ? EPIC_COLOR : IKON_COLOR,
                    );
            } else {
              texture = pass === "Epic" ? epicTex : ikonTex;
            }

            const clusterCount = isCluster ? point.resorts.length : 1;
            const scale = isCluster
              ? R * (0.028 + Math.min(clusterCount, 50) * 0.0006)
              : R * 0.018;

            const sprite = new THREE.Sprite(
              new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                depthTest: true,
              }),
            );
            sprite.renderOrder = 1;
            sprite.scale.set(scale, scale, 1);
            const localPos = latLngToVector3(lat, lng, R * 1.01);
            sprite.position.copy(localPos);
            scene.add(sprite);
            set.sprites.push(sprite);
            set.localPositions.push(localPos);
            set.payloads.push(isCluster ? point.resorts : point.resort);
          });
          return set;
        }

        const allSet = buildSpriteSet(buildClusters(resorts));
        const ikonSet = buildSpriteSet(
          buildClusters(resorts.filter((r) => r.pass === "Ikon")),
        );
        const epicSet = buildSpriteSet(
          buildClusters(resorts.filter((r) => r.pass === "Epic")),
        );

        ikonSet.sprites.forEach((s) => (s.visible = false));
        epicSet.sprites.forEach((s) => (s.visible = false));

        let activeSprites = allSet.sprites;
        let activePositions = allSet.localPositions;
        let activePayloads = allSet.payloads;
        spritesRef.current = activeSprites;

        const setsByKey: Record<string, SpriteSet> = {
          all: allSet,
          Ikon: ikonSet,
          Epic: epicSet,
        };
        let activeKey = "all";

        applyFilterRef.current = (passes: Set<string>) => {
          const key =
            passes.size === 2 ? "all" : passes.has("Ikon") ? "Ikon" : "Epic";
          if (key === activeKey) return;
          setsByKey[activeKey]!.sprites.forEach((s) => (s.visible = false));
          setsByKey[key]!.sprites.forEach((s) => (s.visible = true));
          activeKey = key;
          activeSprites = setsByKey[key]!.sprites;
          activePositions = setsByKey[key]!.localPositions;
          activePayloads = setsByKey[key]!.payloads;
          spritesRef.current = activeSprites;
        };

        // --- Selection glow ---
        const glowSprite = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: makeGlowTexture(),
            transparent: true,
            depthTest: false,
          }),
        );
        glowSprite.renderOrder = 0;
        glowSprite.visible = false;
        scene.add(glowSprite);
        let selectedLocalPos: THREE.Vector3 | null = null;

        // --- Mouse helpers ---
        function getSpriteAt(e: MouseEvent): THREE.Sprite | null {
          const rect = renderer.domElement.getBoundingClientRect();
          const mouse = new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1,
          );
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(mouse, camera);
          const hits = raycaster.intersectObjects(activeSprites);
          return hits.length > 0 ? (hits[0]!.object as THREE.Sprite) : null;
        }

        function projectToScreen(sprite: THREE.Sprite): ScreenPos {
          const rect = renderer.domElement.getBoundingClientRect();
          const p = sprite.position.clone().project(camera);
          return {
            x: rect.left + (p.x * 0.5 + 0.5) * rect.width,
            y: rect.top + (-p.y * 0.5 + 0.5) * rect.height,
          };
        }

        // --- Event handlers ---
        const handleMouseDown = (e: MouseEvent) => {
          if (!introComplete) return;
          isDragging.current = true;
          hasDragged.current = false;
          previousMouse.current = { x: e.clientX, y: e.clientY };
          renderer.domElement.style.cursor = "grabbing";
        };

        const handleMouseMove = (e: MouseEvent) => {
          if (!introComplete) return;
          if (isDragging.current) {
            hasDragged.current = true;
            const dx = e.clientX - previousMouse.current.x;
            const dy = e.clientY - previousMouse.current.y;
            const sensitivity = (camera.position.z - R) * 0.00002;
            rotation.current.y += dx * sensitivity;
            rotation.current.x = Math.max(
              -Math.PI / 2,
              Math.min(Math.PI / 2, rotation.current.x + dy * sensitivity),
            );
            globeGroup.rotation.y = rotation.current.y;
            globeGroup.rotation.x = rotation.current.x;
            previousMouse.current = { x: e.clientX, y: e.clientY };
          } else {
            renderer.domElement.style.cursor = getSpriteAt(e)
              ? "pointer"
              : "grab";
          }
        };

        const handleMouseUp = (e: MouseEvent) => {
          if (!introComplete) return;
          isDragging.current = false;
          renderer.domElement.style.cursor = "grab";
          if (hasDragged.current) return;

          const hit = getSpriteAt(e);
          if (!hit) {
            glowSprite.visible = false;
            selectedLocalPos = null;
            return;
          }

          const idx = activeSprites.indexOf(hit);
          if (idx === -1) return;

          const payload = activePayloads[idx]!;
          const screenPos = projectToScreen(hit);

          glowSprite.scale.setScalar(hit.scale.x * 2.8);
          selectedLocalPos = activePositions[idx]!.clone();
          glowSprite.visible = true;

          if (Array.isArray(payload)) {
            onClusterClick(payload, screenPos);
          } else {
            onResortClick(payload, screenPos);
          }
        };

        const handleWheel = (e: WheelEvent) => {
          e.preventDefault();
          if (!introComplete) return;
          camera.position.z = Math.max(
            R * 1.4,
            Math.min(R * 6, camera.position.z + e.deltaY * 0.15),
          );
        };

        // --- Intro animation ---
        const introStart = performance.now() + INTRO.FADE_DELAY;
        camera.position.z = R * INTRO.START_Z_FACTOR;
        globeGroup.rotation.y = INTRO.START_ROT_Y;
        rotation.current.y = INTRO.END_ROT_Y;
        rotation.current.x = INTRO.END_ROT_X;
        let introComplete = false;

        // --- Render loop ---
        renderer.domElement.addEventListener("mousedown", handleMouseDown);
        renderer.domElement.addEventListener("wheel", handleWheel, {
          passive: false,
        });
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        let animationId: number;
        const animate = () => {
          animationId = requestAnimationFrame(animate);
          if (!introComplete) {
            const t = Math.max(
              0,
              Math.min((performance.now() - introStart) / INTRO.DURATION, 1),
            );
            const e = easeOutSext(t);

            // Z zoom (same as before)
            camera.position.z =
              R * INTRO.START_Z_FACTOR +
              (R * INTRO.END_Z_FACTOR - R * INTRO.START_Z_FACTOR) * e;

            // Arc: camera starts offset on X and Y, sweeps to center
            // Uses a sine curve so it starts moving fast then settles smoothly
            const arcX =
              R * INTRO.START_X_OFFSET * Math.sin((1 - e) * Math.PI * 0.5);
            const arcY = R * 0.3 * Math.sin((1 - e) * Math.PI * 0.5);
            camera.position.x = arcX;
            camera.position.y = arcY;
            camera.lookAt(0, 0, 0); // keep globe centered as camera swings

            // Globe rotation (same as before)
            globeGroup.rotation.y =
              INTRO.START_ROT_Y + (INTRO.END_ROT_Y - INTRO.START_ROT_Y) * e;
            globeGroup.rotation.x = INTRO.END_ROT_X * e;

            if (t >= 1) {
              introComplete = true;
              camera.position.x = 0;
              camera.position.y = 0;
              renderer.domElement.style.cursor = "grab";
            }
          }

          globeGroup.updateMatrixWorld();
          activePositions.forEach((localPos, i) => {
            activeSprites[i]!.position.copy(localPos).applyMatrix4(
              globeGroup.matrixWorld,
            );
          });
          if (selectedLocalPos) {
            glowSprite.position
              .copy(selectedLocalPos)
              .applyMatrix4(globeGroup.matrixWorld);
          }
          renderer.render(scene, camera);
        };
        animate();

        cleanupRef.current = () => {
          cancelAnimationFrame(animationId);
          renderer.domElement.removeEventListener("mousedown", handleMouseDown);
          renderer.domElement.removeEventListener("wheel", handleWheel);
          window.removeEventListener("mousemove", handleMouseMove);
          window.removeEventListener("mouseup", handleMouseUp);
        };
      },
    );

    return () => {
      cancelled = true;
      cleanupRef.current();
      if (renderer.domElement.parentNode === mountEl)
        mountEl.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [resorts]);

  useEffect(() => {
    applyFilterRef.current?.(activePasses);
  }, [activePasses]);

  return (
    <div className="w-full h-full relative">
      <div ref={mountRef} className="w-full h-full" />
      <div
        className="absolute inset-0 flex items-center justify-center transition-opacity duration-700 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, #061428 0%, #020508 100%)",
          opacity: ready ? 0 : 1,
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
          <p className="text-white/40 text-sm tracking-widest uppercase">
            Loading
          </p>
        </div>
      </div>
    </div>
  );
}
