import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createThreeEngine({
  layout,
  getPanelTexture,
  getCurrentColor,
  containerId = 'preview3D',
  scale3d = 0.1
}) {
  const tableWidth = layout.table.inches.length;
  const tableDepth = layout.table.inches.width;
  const dropHeight = layout.table.inches.height;

  let scene;
  let camera;
  let renderer;
  let controls;
  let tableclothMesh;
  let initialized = false;

  const whiteFallbackTexture = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 2;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 2, 2);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.LinearSRGBColorSpace;
    return tex;
  })();

  function createTextureFromCanvas(panelName) {
    const sourceCanvas = getPanelTexture(panelName);
    if (!sourceCanvas) {
      return null;
    }

    const texture = new THREE.CanvasTexture(sourceCanvas);
    texture.colorSpace = THREE.LinearSRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    if (panelName === 'front' || panelName === 'back') {
      texture.wrapS = THREE.RepeatWrapping;
      texture.repeat.x = -1;
      texture.offset.x = 1;
    }

    texture.needsUpdate = true;
    return texture;
  }

  function createOutlines(meshGroup) {
    const lineGroup = new THREE.Group();
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 2
    });

    meshGroup.children.forEach((mesh) => {
      const edges = new THREE.EdgesGeometry(mesh.geometry, 15);
      const line = new THREE.LineSegments(edges, lineMaterial);
      line.position.copy(mesh.position);
      line.rotation.copy(mesh.rotation);
      lineGroup.add(line);
    });

    return lineGroup;
  }

  function createFabricMaterial(texture = whiteFallbackTexture) {
    return new THREE.MeshBasicMaterial({
      map: texture || whiteFallbackTexture,
      color: 0xffffff,
      side: THREE.DoubleSide
    });
  }

  function createTablecloth() {
    const clothHeight = dropHeight * scale3d;
    const tableclothGroup = new THREE.Group();

    const topGeometry = new THREE.PlaneGeometry(tableWidth * scale3d, tableDepth * scale3d);
    const topMesh = new THREE.Mesh(topGeometry, createFabricMaterial(createTextureFromCanvas('top') || whiteFallbackTexture));
    topMesh.rotation.x = -Math.PI / 2;
    topMesh.position.y = 0;
    tableclothGroup.add(topMesh);

    const frontGeometry = new THREE.PlaneGeometry(tableWidth * scale3d, clothHeight);
    const frontMesh = new THREE.Mesh(frontGeometry, createFabricMaterial(createTextureFromCanvas('front') || whiteFallbackTexture));
    frontMesh.position.set(0, -clothHeight / 2, -tableDepth * scale3d / 2);
    tableclothGroup.add(frontMesh);

    const backMesh = new THREE.Mesh(frontGeometry.clone(), createFabricMaterial(createTextureFromCanvas('back') || whiteFallbackTexture));
    backMesh.position.set(0, -clothHeight / 2, tableDepth * scale3d / 2);
    backMesh.rotation.y = Math.PI;
    tableclothGroup.add(backMesh);

    const sideGeometry = new THREE.PlaneGeometry(tableDepth * scale3d, clothHeight);
    const leftMesh = new THREE.Mesh(sideGeometry, createFabricMaterial(createTextureFromCanvas('left') || whiteFallbackTexture));
    leftMesh.position.set(-tableWidth * scale3d / 2, -clothHeight / 2, 0);
    leftMesh.rotation.y = -Math.PI / 2;
    tableclothGroup.add(leftMesh);

    const rightMesh = new THREE.Mesh(sideGeometry.clone(), createFabricMaterial(createTextureFromCanvas('right') || whiteFallbackTexture));
    rightMesh.position.set(tableWidth * scale3d / 2, -clothHeight / 2, 0);
    rightMesh.rotation.y = Math.PI / 2;
    tableclothGroup.add(rightMesh);

    const outlines = createOutlines(tableclothGroup);
    outlines.children.forEach((line) => {
      line.material.transparent = true;
      line.material.opacity = 0.3;
    });
    tableclothGroup.add(outlines);

    tableclothGroup.userData = {
      top: topMesh,
      front: frontMesh,
      back: backMesh,
      left: leftMesh,
      right: rightMesh,
      outlines
    };

    tableclothMesh = tableclothGroup;
    scene.add(tableclothGroup);
  }

  function adjustMaterialForColor(material, colorHex) {
    material.color.setHex(0xffffff);
    material.needsUpdate = true;

    const color = new THREE.Color(colorHex);
    const hsl = {};
    color.getHSL(hsl);

    const isDark = hsl.l < 0.5;
    const lineColorHex = isDark ? 0xffffff : 0x000000;
    const lineOpacity = isDark ? 0.15 : 0.25;

    if (tableclothMesh?.userData?.outlines) {
      tableclothMesh.userData.outlines.children.forEach((line) => {
        line.material.color.setHex(lineColorHex);
        line.material.opacity = lineOpacity;
        line.material.transparent = true;
        line.material.needsUpdate = true;
      });
    }
  }

  function animate() {
    if (!initialized) {
      return;
    }
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  function init() {
    if (initialized) {
      return;
    }

    const container = document.getElementById(containerId);
    const rect = container.getBoundingClientRect();
    const width = Math.max(1, rect.width > 0 ? rect.width : container.clientWidth);
    const height = Math.max(1, rect.height > 0 ? rect.height : container.clientHeight);

    container.innerHTML = '';

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe8e8e8);

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(10, 6, -10);
    camera.lookAt(0, -1, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = false;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI / 2 + 0.3;
    controls.target.set(0, -1, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.95));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.15);
    keyLight.position.set(5, 12, 8);
    scene.add(keyLight);

    createTablecloth();

    initialized = true;
    requestAnimationFrame(updateTextures);
    animate();
  }

  function updateTextures() {
    if (!initialized || !tableclothMesh) {
      return;
    }

    const panels = tableclothMesh.userData;
    const currentColor = getCurrentColor();

    ['top', 'front', 'back', 'left', 'right'].forEach((panelName) => {
      const oldTexture = panels[panelName].material.map;
      if (oldTexture && oldTexture !== whiteFallbackTexture) {
        oldTexture.dispose();
      }

      const newTexture = createTextureFromCanvas(panelName) || whiteFallbackTexture;
      panels[panelName].material.map = newTexture;
      adjustMaterialForColor(panels[panelName].material, currentColor);
      panels[panelName].material.needsUpdate = true;
    });
  }

  function resize() {
    if (!initialized) {
      return;
    }

    const container = document.getElementById(containerId);
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  return {
    init,
    resize,
    updateTextures,
    isInitialized() {
      return initialized;
    }
  };
}
