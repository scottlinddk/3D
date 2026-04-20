import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface ModelViewerProps {
  url: string;
}

export function ModelViewer({ url }: ModelViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0d0d);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / mount.clientHeight,
      0.01,
      100_000,
    );

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 1;
    controls.maxDistance = 50_000;

    // Lighting — key + purple fill + blue rim
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(1, 2, 1.5);
    key.castShadow = true;
    key.shadow.mapSize.setScalar(2048);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x8b5cf6, 0.5);
    fill.position.set(-1, 0.5, -1);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0x3b82f6, 0.3);
    rim.position.set(0, -1, -2);
    scene.add(rim);

    // Shadow-catching ground plane (invisible)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1_000, 1_000),
      new THREE.ShadowMaterial({ opacity: 0.25 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid
    const grid = new THREE.GridHelper(500, 50, 0x222222, 0x1a1a1a);
    scene.add(grid);

    // Load STL
    const loader = new STLLoader();
    loader.load(
      url,
      (geometry) => {
        geometry.computeVertexNormals();

        // Centre X/Z, sit flat on Y = 0
        geometry.computeBoundingBox();
        const bbox = geometry.boundingBox!;
        const cx = (bbox.max.x + bbox.min.x) / 2;
        const cz = (bbox.max.z + bbox.min.z) / 2;
        geometry.translate(-cx, -bbox.min.y, -cz);
        geometry.computeBoundingBox();

        const size = new THREE.Vector3();
        geometry.boundingBox!.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);

        const mesh = new THREE.Mesh(
          geometry,
          new THREE.MeshStandardMaterial({
            color: 0x7c3aed,
            metalness: 0.15,
            roughness: 0.35,
          }),
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);

        // Fit camera and grid to model
        grid.scale.setScalar(maxDim / 10);
        ground.scale.setScalar(maxDim * 10);

        const dist = maxDim * 2;
        camera.position.set(dist, dist * 0.75, dist);
        controls.target.set(0, size.y / 2, 0);
        controls.update();

        setLoading(false);
      },
      undefined,
      () => {
        setLoadError(true);
        setLoading(false);
      },
    );

    // Render loop
    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize observer keeps canvas sharp when container resizes
    const ro = new ResizeObserver(() => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(frameId);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [url]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-[#0d0d0d]" style={{ height: 440 }}>
      <div ref={mountRef} className="h-full w-full" />

      {loading && !loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          <p className="text-xs text-gray-500">Loading preview…</p>
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-gray-500">Preview unavailable — download to view in your slicer.</p>
        </div>
      )}

      {!loading && !loadError && (
        <p className="absolute bottom-2 right-3 select-none text-[10px] text-gray-600">
          Drag · Scroll · Right-click to pan
        </p>
      )}
    </div>
  );
}
