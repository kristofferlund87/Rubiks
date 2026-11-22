import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { COLORS, GEOMETRY, MOVE_DEFS, UNKNOWN_HEX, type Facelets, type Move, type Vec3 } from '../cube/model';

const AXES = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];

function roundedRect(size: number, radius: number): THREE.ShapeGeometry {
  const h = size / 2;
  const s = new THREE.Shape();
  s.moveTo(-h + radius, -h);
  s.lineTo(h - radius, -h);
  s.quadraticCurveTo(h, -h, h, -h + radius);
  s.lineTo(h, h - radius);
  s.quadraticCurveTo(h, h, h - radius, h);
  s.lineTo(-h + radius, h);
  s.quadraticCurveTo(-h, h, -h, h - radius);
  s.lineTo(-h, -h + radius);
  s.quadraticCurveTo(-h, -h, -h + radius, -h);
  return new THREE.ShapeGeometry(s, 6);
}

interface Cubie {
  group: THREE.Group;
  pos: Vec3;
}

export class CubeScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  private controls: OrbitControls;
  private root = new THREE.Group();
  private pivot = new THREE.Group();
  private cubies: Cubie[] = [];
  private stickers: THREE.MeshStandardMaterial[] = [];
  private resizeObserver: ResizeObserver;
  private frame = 0;
  private animating = false;

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.camera.position.set(5.2, 4.4, 6.6);
    this.camera.lookAt(0, 0, 0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = false;
    this.controls.enableZoom = false;
    this.controls.enableDamping = true;
    this.controls.rotateSpeed = 0.8;

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(4, 8, 6);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.6);
    fill.position.set(-6, -3, -4);
    this.scene.add(fill);

    this.scene.add(this.root);
    this.root.add(this.pivot);
    this.build();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    const loop = () => {
      this.frame = requestAnimationFrame(loop);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  private build() {
    const body = new THREE.BoxGeometry(0.97, 0.97, 0.97);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.6 });
    const stickerGeom = roundedRect(0.84, 0.12);

    const byPos = new Map<string, Cubie>();
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue;
          const group = new THREE.Group();
          group.position.set(x, y, z);
          group.add(new THREE.Mesh(body, bodyMat));
          this.root.add(group);
          const cubie = { group, pos: [x, y, z] as Vec3 };
          this.cubies.push(cubie);
          byPos.set(`${x},${y},${z}`, cubie);
        }

    for (const g of GEOMETRY) {
      const mat = new THREE.MeshStandardMaterial({ color: UNKNOWN_HEX, roughness: 0.35 });
      const mesh = new THREE.Mesh(stickerGeom, mat);
      const n = new THREE.Vector3(...g.normal);
      mesh.position.copy(n.clone().multiplyScalar(0.49));
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      byPos.get(g.pos.join(','))!.group.add(mesh);
      this.stickers[g.index] = mat;
    }
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setState(state: Facelets, highlight?: Set<number>) {
    state.forEach((s, i) => {
      const mat = this.stickers[i];
      mat.color.set(s ? COLORS[s].hex : UNKNOWN_HEX);
      mat.emissive.set(highlight?.has(i) ? 0x882222 : 0x000000);
    });
  }

  /** Animera ett drag. När det är klart visas `after`. */
  animateMove(move: Move, after: Facelets, durationMs = 380): Promise<void> {
    if (this.animating) return Promise.resolve();
    this.animating = true;
    const { axis, layer, quarter } = MOVE_DEFS[move.face];
    const quarters = move.turns === 3 ? -quarter : quarter * move.turns;
    const target = (quarters * Math.PI) / 2;
    const layerCubies = this.cubies.filter((c) => c.pos[axis] === layer);
    for (const c of layerCubies) this.pivot.attach(c.group);
    const duration = durationMs * (move.turns === 2 ? 1.5 : 1);

    return new Promise((resolve) => {
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        this.pivot.setRotationFromAxisAngle(AXES[axis], target * eased);
        if (t < 1) {
          requestAnimationFrame(step);
          return;
        }
        // Återställ bitarna och visa det nya tillståndet med färger i stället.
        this.pivot.rotation.set(0, 0, 0);
        for (const c of layerCubies) {
          this.root.attach(c.group);
          c.group.position.set(...c.pos);
          c.group.rotation.set(0, 0, 0);
        }
        this.setState(after);
        this.animating = false;
        resolve();
      };
      requestAnimationFrame(step);
    });
  }

  resetView() {
    this.camera.position.set(5.2, 4.4, 6.6);
    this.camera.lookAt(0, 0, 0);
    this.controls.target.set(0, 0, 0);
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
