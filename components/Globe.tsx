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
  onIntroComplete?: () => void;
  onRegisterFlyTo?: (fn: (rotX: number, rotY: number) => void) => void;
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
  onIntroComplete,
  onRegisterFlyTo,
}: GlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const { activePasses, activePassTypes, minVertical, minRuns, minLifts } =
    useFilter();
  const spritesRef = useRef<THREE.Sprite[]>([]);
  const applyFilterRef = useRef<
    | ((
        passes: Set<string>,
        passTypes: Set<string>,
        minVert: number,
        minRunsVal: number,
        minLiftsVal: number,
      ) => void)
    | null
  >(null);
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const previousMouse = useRef({ x: 0, y: 0 });
  const rotation = useRef({ x: 0, y: 0 });
  const cleanupRef = useRef<() => void>(() => {});
  const onIntroCompleteRef = useRef(onIntroComplete);
  useEffect(() => { onIntroCompleteRef.current = onIntroComplete; }, [onIntroComplete]);
  const onRegisterFlyToRef = useRef(onRegisterFlyTo);
  useEffect(() => { onRegisterFlyToRef.current = onRegisterFlyTo; }, [onRegisterFlyTo]);

  useEffect(() => {
    if (!mountRef.current) return;
    const mountEl = mountRef.current;
    let cancelled = false;
    const loadStart = performance.now();

    const width = mountEl.clientWidth;
    const height = mountEl.clientHeight;
    const R = 50;

    // --- Renderer & Camera ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
    camera.position.z = R * 2;
    // Cap how far the globe can shift left on very wide screens
    const globeOffset = Math.min(width * 0.5, 380);
    // Start centered; will animate to left-offset during intro
    camera.setViewOffset(width, height, 0, 0, width, height);

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
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: R * 0.04,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
    });
    scene.add(new THREE.Points(starGeo, starMat));

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
      ([
        colorMap,
        specularMap,
        cloudMap,
        milkyWayMap,
        epicTexRaw,
        ikonTexRaw,
      ]) => {
        const epicTex = makePinTexture(epicTexRaw.image as HTMLImageElement);
        const ikonTex = makePinTexture(ikonTexRaw.image as HTMLImageElement);
        if (cancelled) return;
        const elapsed = performance.now() - loadStart;
        const remaining = Math.max(0, 2000 - elapsed);
        setTimeout(() => {
          if (!cancelled) setReady(true);
        }, remaining);

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

        // Atmospheric glow — BackSide so the outer edge naturally fades to zero
        const atmMat = new THREE.ShaderMaterial({
          vertexShader: `
            varying vec3 vNormal;
            varying vec3 vViewDir;
            void main() {
              vNormal = normalize(-(normalMatrix * normal));
              vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
              vViewDir = normalize(-mvPos.xyz);
              gl_Position = projectionMatrix * mvPos;
            }
          `,
          fragmentShader: `
            varying vec3 vNormal;
            varying vec3 vViewDir;
            void main() {
              float rim = dot(normalize(vNormal), normalize(vViewDir));
              float intensity = pow(max(rim, 0.0), 3.0) * 0.85;
              gl_FragColor = vec4(1.0, 0.85, 0.4, intensity);
            }
          `,
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending,
          transparent: true,
          depthWrite: false,
        });
        scene.add(
          new THREE.Mesh(new THREE.SphereGeometry(R * 1.15, 64, 64), atmMat),
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
              const ikonCount = point.resorts.filter((r) => r.pass === "Ikon").length;
              const epicCount = point.resorts.filter((r) => r.pass === "Epic").length;
              const hasIkon = ikonCount > 0;
              const hasEpic = epicCount > 0;
              texture =
                hasIkon && hasEpic
                  ? makeClusterTexture(
                      point.resorts.length,
                      IKON_COLOR,
                      EPIC_COLOR,
                      ikonCount / (ikonCount + epicCount),
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
              ? R * (0.034 + Math.min(clusterCount, 50) * 0.0007)
              : R * 0.024;

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
        let filteredPayloads: (Resort[] | Resort)[] = [...allSet.payloads];
        spritesRef.current = activeSprites;

        const setsByKey: Record<string, SpriteSet> = {
          all: allSet,
          Ikon: ikonSet,
          Epic: epicSet,
        };
        let activeKey = "all";

        applyFilterRef.current = (
          passes: Set<string>,
          passTypes: Set<string>,
          minVert: number,
          minRunsVal: number,
          minLiftsVal: number,
        ) => {
          const key =
            passes.size === 2 ? "all" : passes.has("Ikon") ? "Ikon" : "Epic";

          // Switch base set if needed
          if (key !== activeKey) {
            setsByKey[activeKey]!.sprites.forEach((s) => (s.visible = false));
            activeKey = key;
            activeSprites = setsByKey[key]!.sprites;
            activePositions = setsByKey[key]!.localPositions;
            activePayloads = setsByKey[key]!.payloads;
            spritesRef.current = activeSprites;
          }

          const allPassTypes = passTypes.size >= 2;
          const noRangeFilter =
            minVert === 0 && minRunsVal === 0 && minLiftsVal === 0;

          function passesFilter(r: Resort): boolean {
            if (!allPassTypes && r.passType) {
              if (!passTypes.has(r.passType)) return false;
            }
            if (noRangeFilter) return true;
            return (
              r.verticalDrop >= minVert &&
              r.totalRuns >= minRunsVal &&
              r.lifts >= minLiftsVal
            );
          }

          filteredPayloads = [];
          setsByKey[key]!.sprites.forEach((sprite, i) => {
            const payload = setsByKey[key]!.payloads[i]!;
            if (Array.isArray(payload)) {
              const filtered = payload.filter(passesFilter);
              filteredPayloads.push(filtered);
              sprite.visible = filtered.length > 0;
              if (sprite.visible) {
                const ikonCount = filtered.filter((r) => r.pass === "Ikon").length;
                const epicCount = filtered.filter((r) => r.pass === "Epic").length;
                const hasIkon = ikonCount > 0;
                const hasEpic = epicCount > 0;
                sprite.material.map = makeClusterTexture(
                  filtered.length,
                  hasIkon ? IKON_COLOR : EPIC_COLOR,
                  hasIkon && hasEpic ? EPIC_COLOR : undefined,
                  hasIkon && hasEpic ? ikonCount / (ikonCount + epicCount) : undefined,
                );
                sprite.material.needsUpdate = true;
              }
            } else {
              filteredPayloads.push(payload);
              sprite.visible = passesFilter(payload);
            }
          });
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
          const hits = raycaster.intersectObjects(
            activeSprites.filter((s) => s.visible),
          );
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
            const visibleResorts =
              (filteredPayloads[idx] as Resort[]) ?? payload;
            onClusterClick(visibleResorts, screenPos);
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

        // --- Touch handlers ---
        let lastPinchDist = 0;

        const handleTouchStart = (e: TouchEvent) => {
          if (!introComplete) return;
          e.preventDefault();
          if (e.touches.length === 1) {
            isDragging.current = true;
            hasDragged.current = false;
            previousMouse.current = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY };
          } else if (e.touches.length === 2) {
            const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
            const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
            lastPinchDist = Math.sqrt(dx * dx + dy * dy);
          }
        };

        const handleTouchMove = (e: TouchEvent) => {
          if (!introComplete) return;
          e.preventDefault();
          if (e.touches.length === 1 && isDragging.current) {
            hasDragged.current = true;
            const dx = e.touches[0]!.clientX - previousMouse.current.x;
            const dy = e.touches[0]!.clientY - previousMouse.current.y;
            const sensitivity = (camera.position.z - R) * 0.00002;
            rotation.current.y += dx * sensitivity;
            rotation.current.x = Math.max(
              -Math.PI / 2,
              Math.min(Math.PI / 2, rotation.current.x + dy * sensitivity),
            );
            globeGroup.rotation.y = rotation.current.y;
            globeGroup.rotation.x = rotation.current.x;
            previousMouse.current = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY };
          } else if (e.touches.length === 2) {
            const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
            const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const delta = lastPinchDist - dist;
            camera.position.z = Math.max(R * 1.4, Math.min(R * 6, camera.position.z + delta * 0.3));
            lastPinchDist = dist;
          }
        };

        const handleTouchEnd = (e: TouchEvent) => {
          if (!introComplete) return;
          if (e.touches.length === 0) {
            isDragging.current = false;
            if (hasDragged.current) return;
            const touch = e.changedTouches[0];
            if (!touch) return;
            const syntheticEvent = { clientX: touch.clientX, clientY: touch.clientY } as MouseEvent;
            const hit = getSpriteAt(syntheticEvent);
            if (!hit) { glowSprite.visible = false; selectedLocalPos = null; return; }
            const idx = activeSprites.indexOf(hit);
            if (idx === -1) return;
            const payload = activePayloads[idx]!;
            const screenPos = projectToScreen(hit);
            glowSprite.scale.setScalar(hit.scale.x * 2.8);
            selectedLocalPos = activePositions[idx]!.clone();
            glowSprite.visible = true;
            if (Array.isArray(payload)) {
              onClusterClick((filteredPayloads[idx] as Resort[]) ?? payload, screenPos);
            } else {
              onResortClick(payload, screenPos);
            }
          }
        };

        // --- Intro animation ---
        const introStart = performance.now() + INTRO.FADE_DELAY;
        camera.position.z = R * INTRO.START_Z_FACTOR;
        globeGroup.rotation.y = INTRO.START_ROT_Y;
        rotation.current.y = INTRO.END_ROT_Y;
        rotation.current.x = INTRO.END_ROT_X;
        let introComplete = false;
        let legendTriggered = false;
        type FlyAnim = { startX: number; startY: number; endX: number; endY: number; startZ: number; endZ: number; startTime: number };
        let flyAnim: FlyAnim | null = null;

        onRegisterFlyToRef.current?.((rotX, rotY) => {
          flyAnim = {
            startX: rotation.current.x,
            startY: rotation.current.y,
            endX: rotX,
            endY: rotY,
            startZ: camera.position.z,
            endZ: R * INTRO.END_Z_FACTOR,
            startTime: performance.now(),
          };
        });

        // --- Render loop ---
        renderer.domElement.addEventListener("mousedown", handleMouseDown);
        renderer.domElement.addEventListener("wheel", handleWheel, { passive: false });
        renderer.domElement.addEventListener("touchstart", handleTouchStart, { passive: false });
        renderer.domElement.addEventListener("touchmove", handleTouchMove, { passive: false });
        renderer.domElement.addEventListener("touchend", handleTouchEnd, { passive: false });
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
            const arcX =
              R * INTRO.START_X_OFFSET * Math.sin((1 - e) * Math.PI * 0.5);
            const arcY = R * 0.3 * Math.sin((1 - e) * Math.PI * 0.5);
            camera.position.x = arcX;
            camera.position.y = arcY;
            camera.lookAt(0, 0, 0);

            // Slide globe from centered to left-offset as animation completes
            camera.setViewOffset(
              width + globeOffset * e,
              height,
              globeOffset * e,
              0,
              width,
              height,
            );

            // Globe rotation (same as before)
            globeGroup.rotation.y =
              INTRO.START_ROT_Y + (INTRO.END_ROT_Y - INTRO.START_ROT_Y) * e;
            globeGroup.rotation.x = INTRO.END_ROT_X * e;

            // Fade stars in during the second half of the intro
            starMat.opacity = Math.max(0, (t - 0.5) / 0.5) * 0.7;

            // Trigger legend slide-in 700ms before animation ends
            if (!legendTriggered && t >= 0.75) {
              legendTriggered = true;
              onIntroCompleteRef.current?.();
            }

            if (t >= 1) {
              introComplete = true;
              camera.position.x = 0;
              camera.position.y = 0;
              camera.setViewOffset(
                width + globeOffset,
                height,
                globeOffset,
                0,
                width,
                height,
              );
              renderer.domElement.style.cursor = "grab";
            }
          }

          if (introComplete && flyAnim) {
            const FLY_DURATION = 1200;
            const ft = Math.min((performance.now() - flyAnim.startTime) / FLY_DURATION, 1);
            const fe = -(Math.cos(Math.PI * ft) - 1) / 2;
            rotation.current.x = flyAnim.startX + (flyAnim.endX - flyAnim.startX) * fe;
            rotation.current.y = flyAnim.startY + (flyAnim.endY - flyAnim.startY) * fe;
            camera.position.z = flyAnim.startZ + (flyAnim.endZ - flyAnim.startZ) * fe;
            globeGroup.rotation.x = rotation.current.x;
            globeGroup.rotation.y = rotation.current.y;
            if (ft >= 1) flyAnim = null;
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
          renderer.domElement.removeEventListener("touchstart", handleTouchStart);
          renderer.domElement.removeEventListener("touchmove", handleTouchMove);
          renderer.domElement.removeEventListener("touchend", handleTouchEnd);
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
    applyFilterRef.current?.(
      activePasses,
      activePassTypes,
      minVertical,
      minRuns,
      minLifts,
    );
  }, [activePasses, activePassTypes, minVertical, minRuns, minLifts]);

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
        <div className="flex flex-col items-center gap-6">
          {/* Wireframe globe icon */}
          <div className="relative w-16 h-16">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border border-white/20" />
            {/* Equator ellipse */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-full h-[40%] rounded-full border border-white/15"
                style={{ transform: "scaleY(0.35)" }}
              />
            </div>
            {/* Meridian ellipse — spinning */}
            <div
              className="absolute inset-0 flex items-center justify-center animate-spin"
              style={{ animationDuration: "3s" }}
            >
              <div
                className="w-[40%] h-full rounded-full border border-white/25"
                style={{ transform: "scaleX(0.38)" }}
              />
            </div>
            {/* Glow dot at top */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-300/60" />
            {/* Pulse ring */}
            <div
              className="absolute inset-0 rounded-full border border-blue-400/20 animate-ping"
              style={{ animationDuration: "2s" }}
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-white/70 text-sm font-semibold tracking-widest uppercase">
              Epic vs. Ikon
            </p>
            <p className="text-white/30 text-xs tracking-wider">
              Loading ski resorts…
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
