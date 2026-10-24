/* VITALIS: escultura digital simbólica — NO es anatomía ni herramienta clínica. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const container = document.getElementById('heart-viewer');
const fallback = document.getElementById('heart-fallback');
const status = document.getElementById('heart-status');
const stage = document.getElementById('heart-stage');
const spinButton = document.getElementById('spin-button');
const resetButton = document.getElementById('reset-button');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

function makeHeart() {
  const shape = new THREE.Shape();
  shape.moveTo(5, 5);
  shape.bezierCurveTo(5, 5, 4, 0, 0, 0);
  shape.bezierCurveTo(-6, 0, -6, 7, -6, 7);
  shape.bezierCurveTo(-6, 11, -2, 13, 5, 18);
  shape.bezierCurveTo(12, 13, 16, 11, 16, 7);
  shape.bezierCurveTo(16, 7, 16, 0, 10, 0);
  shape.bezierCurveTo(7, 0, 5, 5, 5, 5);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 3.6, bevelEnabled: true, bevelThickness: 2, bevelSize: 1.45,
    bevelSegments: 7, curveSegments: 25, steps: 1,
  });
  geometry.center();
  geometry.rotateZ(Math.PI);
  geometry.scale(.145, .145, .145);
  return new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial({
    color: '#14b8a6', metalness: .32, roughness: .21,
    clearcoat: 1, clearcoatRoughness: .15,
    emissive: '#064d4e', emissiveIntensity: .18,
  }));
}

function buildSculpture() {
  const sculpture = new THREE.Group();
  const heart = makeHeart();
  heart.rotation.y = -.15;
  sculpture.add(heart);

  const silver = new THREE.MeshStandardMaterial({ color: '#71d6de', metalness: .7, roughness: .26, transparent: true, opacity: .72 });
  const bright = new THREE.MeshBasicMaterial({ color: '#65f0d2' });
  for (let i = 0; i < 3; i++) {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(2.6 + .19 * i, .012, 8, 150), silver);
    hoop.rotation.set(Math.PI * (.16 + i * .25), Math.PI * (.17 + i * .21), .19 + i * .5);
    sculpture.add(hoop);
  }
  const sphereGeo = new THREE.SphereGeometry(.095, 20, 16);
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const r = 2.62 + Math.sin(i * 2.8) * .13;
    const point = new THREE.Mesh(sphereGeo, i % 4 === 0 ? bright : silver);
    point.position.set(Math.cos(angle) * r, Math.sin(angle) * r, Math.sin(angle * 3) * .48);
    sculpture.add(point);
  }
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(1.69, .008, 6, 130),
    new THREE.MeshBasicMaterial({ color: '#b9fff3', transparent: true, opacity: .45 }),
  );
  halo.rotation.x = Math.PI / 2;
  sculpture.add(halo);
  return sculpture;
}

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
} catch (error) {
  console.warn('WebGL no disponible:', error.message);
  status.textContent = 'Vista de referencia: el modo 3D necesita un navegador con WebGL.';
}

if (renderer) {
  try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
    camera.position.set(0, .3, 9.9);
    scene.add(new THREE.HemisphereLight('#ddfff8', '#114b6b', 2.15));
    const highlight = new THREE.DirectionalLight('#d8fffc', 3.3);
    highlight.position.set(4, 6, 8);
    scene.add(highlight);
    const other = new THREE.PointLight('#48c7ff', 90);
    other.position.set(-6, -2, 3);
    scene.add(other);
    const sculpture = buildSculpture();
    scene.add(sculpture);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = .06;
    controls.enablePan = false;
    controls.minDistance = 5.5;
    controls.maxDistance = 14;
    controls.autoRotate = !reduceMotion.matches;
    controls.autoRotateSpeed = 1.0;

    function resize() {
      const rect = container.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      renderer.setSize(rect.width, rect.height, false);
      renderer.render(scene, camera);
    }
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
    fallback.hidden = true;
    spinButton.disabled = false;
    resetButton.disabled = false;

    function updateSpinButton() {
      spinButton.textContent = controls.autoRotate ? 'Ⅱ Pausar giro' : '↻ Activar giro';
      spinButton.setAttribute('aria-pressed', String(controls.autoRotate));
    }
    updateSpinButton();
    spinButton.addEventListener('click', () => { controls.autoRotate = !controls.autoRotate; updateSpinButton(); });
    resetButton.addEventListener('click', () => {
      camera.position.set(0, .3, 9.9);
      controls.target.set(0, 0, 0);
      sculpture.rotation.set(0, 0, 0);
      controls.update();
    });
    reduceMotion.addEventListener?.('change', (event) => {
      if (event.matches) { controls.autoRotate = false; updateSpinButton(); }
    });

    let frame;
    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    render();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(frame);
      else { cancelAnimationFrame(frame); render(); }
    });
  } catch (error) {
    console.warn('No se pudo iniciar el modelo conceptual:', error.message);
    fallback.hidden = false;
    status.textContent = 'La visualización 3D no está disponible en este dispositivo.';
    renderer.domElement.remove();
  }
}
