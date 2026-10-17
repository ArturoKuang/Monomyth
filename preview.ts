import {
  BoxGeometry,
  Color,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  OrthographicCamera,
  Scene,
  HemisphereLight,
  DirectionalLight,
  WebGLRenderer,
} from 'three';
import { createRandom } from './random';
import type { Seed } from './random';

/** Disposable build/test preview; not the game's scene or entity architecture. */
export function createPreview(container: HTMLElement) {
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.append(renderer.domElement);
  const scene = new Scene();
  scene.background = new Color('#18232b');
  const camera = new OrthographicCamera(-6, 6, 6, -6, 0.1, 100);
  camera.position.set(8, 9, 8);
  camera.lookAt(0, 0, 0);
  scene.add(new HemisphereLight('#ffffff', '#486053', 2));
  const light = new DirectionalLight('#ffe0a3', 3);
  light.position.set(4, 8, 2);
  scene.add(light);
  let mesh: InstancedMesh<BoxGeometry, MeshStandardMaterial> | undefined;
  let revision = 0;

  function releaseMesh() {
    if (!mesh) return;
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
    mesh.dispose();
    mesh = undefined;
  }

  function render() {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.left = (-6 * width) / height;
    camera.right = (6 * width) / height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }

  const observer = new ResizeObserver(render);
  observer.observe(container);

  return {
    generate(seed: Seed) {
      releaseMesh();
      const rng = createRandom(seed);
      mesh = new InstancedMesh(
        new BoxGeometry(0.9, 1, 0.9),
        new MeshStandardMaterial({ roughness: 0.85 }),
        25,
      );
      const transform = new Object3D();
      const color = new Color();
      for (let index = 0; index < 25; index += 1) {
        const height = rng.integer(3, 20) / 10;
        transform.position.set((index % 5) - 2, height / 2 - 1, Math.floor(index / 5) - 2);
        transform.scale.set(1, height, 1);
        transform.updateMatrix();
        mesh.setMatrixAt(index, transform.matrix);
        color.setHSL(0.32 + height * 0.04, 0.28, 0.28 + height * 0.1);
        mesh.setColorAt(index, color);
      }
      scene.add(mesh);
      render();
      revision += 1;
      return {
        revision,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
      };
    },
    dispose() {
      observer.disconnect();
      releaseMesh();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
