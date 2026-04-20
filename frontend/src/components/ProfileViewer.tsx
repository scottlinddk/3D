import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ProfileViewerProps {
  points: [number, number][];
  initialHeight?: number;
  initialRevolve?: boolean;
  filename?: string;
  /** Called when user saves changes — receives current height & revolve */
  onParamsChange?: (height: number, revolve: boolean) => void;
}

function buildGeometry(
  points: [number, number][],
  height: number,
  revolve: boolean,
): THREE.BufferGeometry {
  if (revolve) {
    // Lathe: profile in X-Y plane, revolved around Y axis.
    // Use absolute X as radius, keep Y as height.
    const minY = Math.min(...points.map(([, y]) => y));
    const lathePoints = points.map(
      ([x, y]) => new THREE.Vector2(Math.abs(x), y - minY),
    );
    return new THREE.LatheGeometry(lathePoints, 128);
  }

  // Extrusion in Z direction
  const shape = new THREE.Shape();
  const [x0, y0] = points[0];
  shape.moveTo(x0, y0);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i][0], points[i][1]);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
  });
  return geo;
}

function downloadSTL(mesh: THREE.Mesh, filename: string) {
  const exporter = new STLExporter();
  const stl = exporter.parse(mesh, { binary: true }) as DataView<ArrayBuffer>;
  const blob = new Blob([stl.buffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".stl") ? filename : `${filename}.stl`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ProfileViewer({
  points,
  initialHeight = 10,
  initialRevolve = false,
  filename = "model",
  onParamsChange,
}: ProfileViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const [height, setHeight] = useState(initialHeight);
  const [revolve, setRevolve] = useState(initialRevolve);
  const [ready, setReady] = useState(false);

  // Initialise Three.js scene once
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0d0d);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.01, 100_000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controlsRef.current = controls;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(1, 2, 1.5);
    key.castShadow = true;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x8b5cf6, 0.5);
    fill.position.set(-1, 0.5, -1);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0x3b82f6, 0.3);
    rim.position.set(0, -1, -2);
    scene.add(rim);

    // Grid + shadow ground
    const grid = new THREE.GridHelper(500, 50, 0x222222, 0x1a1a1a);
    scene.add(grid);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1000, 1000),
      new THREE.ShadowMaterial({ opacity: 0.2 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const ro = new ResizeObserver(() => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    });
    ro.observe(mount);

    setReady(true);

    return () => {
      cancelAnimationFrame(frameId);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  // Rebuild mesh whenever points / height / revolve change
  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!scene || !camera || !controls || !ready) return;

    // Remove old mesh
    if (meshRef.current) {
      scene.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      (meshRef.current.material as THREE.Material).dispose();
      meshRef.current = null;
    }

    if (points.length < 3) return;

    try {
      const geo = buildGeometry(points, height, revolve);
      geo.computeVertexNormals();

      // Centre in X/Z, sit on Y = 0
      geo.computeBoundingBox();
      const bbox = geo.boundingBox!;
      const cx = (bbox.max.x + bbox.min.x) / 2;
      const cz = (bbox.max.z + bbox.min.z) / 2;
      geo.translate(-cx, -bbox.min.y, -cz);
      geo.computeBoundingBox();

      const size = new THREE.Vector3();
      geo.boundingBox!.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);

      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ color: 0x7c3aed, metalness: 0.15, roughness: 0.35 }),
      );
      mesh.castShadow = true;
      scene.add(mesh);
      meshRef.current = mesh;

      // Fit camera
      const dist = maxDim * 2.2;
      camera.position.set(dist, dist * 0.75, dist);
      controls.target.set(0, size.y / 2, 0);
      controls.update();
    } catch {
      // Invalid geometry (e.g., degenerate profile) — silently skip
    }
  }, [points, height, revolve, ready]);

  const handleDownload = useCallback(() => {
    if (!meshRef.current) return;
    downloadSTL(meshRef.current, filename);
  }, [filename]);

  const handleApply = useCallback(() => {
    onParamsChange?.(height, revolve);
  }, [height, revolve, onParamsChange]);

  return (
    <div className="flex flex-col gap-4">
      {/* 3-D canvas */}
      <div
        className="relative w-full overflow-hidden rounded-xl bg-[#0d0d0d]"
        style={{ height: 440 }}
      >
        <div ref={mountRef} className="h-full w-full" />
        {ready && (
          <p className="absolute bottom-2 right-3 select-none text-[10px] text-gray-600">
            Drag · Scroll · Right-click to pan
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-[#2a2a2a] dark:bg-[#1a1a1a]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pv-height" className="text-gray-700 dark:text-gray-300">
            Height (mm)
          </Label>
          <Input
            id="pv-height"
            type="number"
            min={0.1}
            step={0.5}
            value={height}
            className="w-28"
            onChange={(e) => setHeight(parseFloat(e.target.value) || initialHeight)}
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={revolve}
            onChange={(e) => setRevolve(e.target.checked)}
            className="h-4 w-4 rounded accent-brand-purple"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Revolve (lathe)</span>
        </label>

        {onParamsChange && (
          <Button variant="outline" size="sm" onClick={handleApply}>
            Apply
          </Button>
        )}

        <Button
          variant="gradient"
          size="sm"
          className="ml-auto gap-2"
          onClick={handleDownload}
          disabled={!meshRef.current}
        >
          <Download className="h-4 w-4" />
          Download STL
        </Button>
      </div>
    </div>
  );
}
