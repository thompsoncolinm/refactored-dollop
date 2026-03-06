/**
 * Shape3D.ts
 * Renders a slowly-rotating 3-D shape using Three.js inside a given container.
 * Supported shapes: cube, sphere, cone, torus, pyramid (tetrahedron).
 */

import * as THREE from 'three';

export type Shape3DType = 'cube' | 'sphere' | 'cone' | 'torus' | 'pyramid';

export const SHAPE_3D_TYPES: Shape3DType[] = [
  'cube',
  'sphere',
  'cone',
  'torus',
  'pyramid',
];

/** Returns a Three.js BufferGeometry for the given shape type. */
function createGeometry(shape: Shape3DType): THREE.BufferGeometry {
  switch (shape) {
    case 'cube':
      return new THREE.BoxGeometry(1.4, 1.4, 1.4);
    case 'sphere':
      return new THREE.SphereGeometry(1, 32, 32);
    case 'cone':
      return new THREE.ConeGeometry(0.9, 1.8, 32);
    case 'torus':
      return new THREE.TorusGeometry(0.85, 0.35, 16, 64);
    case 'pyramid':
      // Tetrahedron serves as a low-poly pyramid
      return new THREE.TetrahedronGeometry(1.2);
    default:
      return new THREE.BoxGeometry(1.4, 1.4, 1.4);
  }
}

/** Holds the renderer and animation loop handle so they can be torn down. */
export interface Shape3DHandle {
  /** Dispose of the Three.js renderer and cancel the animation loop. */
  dispose(): void;
}

/**
 * Render a rotating 3-D shape inside `container`.
 * Returns a handle that must be called to stop the animation and free GPU resources.
 *
 * @param container  The DOM element to render into (canvas is appended).
 * @param shape      Which shape to display.
 * @param color      Hex colour string (e.g. '#e74c3c').
 */
export function renderShape3D(
  container: HTMLElement,
  shape: Shape3DType,
  color: string,
): Shape3DHandle {
  const width = container.clientWidth || 200;
  const height = container.clientHeight || 200;

  // Scene
  const scene = new THREE.Scene();
  // Leave scene background unset; transparency is provided by alpha:true on the renderer.

  // Camera
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
  camera.position.z = 3.5;

  // Renderer (transparent background so Tailwind class sets the card colour)
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const directional = new THREE.DirectionalLight(0xffffff, 1.2);
  directional.position.set(5, 5, 5);
  scene.add(directional);

  // Mesh
  const geometry = createGeometry(shape);
  const material = new THREE.MeshStandardMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // Animation loop – rotate slowly for visual interest
  let animationId: number;
  const animate = () => {
    animationId = requestAnimationFrame(animate);
    mesh.rotation.x += 0.008;
    mesh.rotation.y += 0.012;
    renderer.render(scene, camera);
  };
  animate();

  return {
    dispose() {
      cancelAnimationFrame(animationId);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
