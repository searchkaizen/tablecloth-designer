import { loadDimensionsConfig, getProductConfig, buildLayout, getPanelCanvasDimsPx } from './geometry.js';
import { resolveProductId } from './product-registry.js';
import { createFabricEngine } from './fabric-engine.js';
import { createThreeEngine } from './three-engine.js';
import { createSyncEngine } from './sync-engine.js';
import { createColorEngine } from './color-engine.js';
import { createLayoutController } from './layout-controller.js';
import { initSidebarController } from './sidebar-controller.js';
import { initViewController } from './view-controller.js';
import { initColorUIController } from './color-ui-controller.js';

const SCALE = 7;
const productParam = new URLSearchParams(window.location.search).get('product');

const dimensionsConfig = await loadDimensionsConfig('./data/tablecloth-dimensions.json');
const resolvedProductId = resolveProductId(productParam) || dimensionsConfig.defaultProductId;
const productConfig = getProductConfig(dimensionsConfig, resolvedProductId);
const layout = buildLayout(productConfig, SCALE);

const templateCanvasEl = document.getElementById('templateCanvas');
const panelDims = getPanelCanvasDimsPx(layout);

const fabricEngine = createFabricEngine({
  panelDims,
  safeInsetPx: layout.safeInset.px,
  templateCanvasEl
});

const colorEngine = createColorEngine({
  preview: { rgb: '#FFFFFF' },
  print: {
    pantone: null,
    cmyk: { c: 0, m: 0, y: 0, k: 0 }
  }
});

const threeEngine = createThreeEngine({
  layout,
  getPanelTexture: (panelName) => fabricEngine.capturePanelTexture(panelName),
  getCurrentColor: () => colorEngine.getState().preview.rgb
});

const syncEngine = createSyncEngine({
  onSync: () => {
    if (threeEngine.isInitialized()) {
      threeEngine.updateTextures();
    }
  }
});

const layoutController = createLayoutController({ layout, templateCanvasEl });

layoutController.init();
fabricEngine.init();
fabricEngine.bindUploadUI();

fabricEngine.onChange(() => {
  syncEngine.scheduleTextureUpdate(100);
});

initSidebarController({
  onResize: () => {
    layoutController.fitCanvas();
    threeEngine.resize();
  }
});

initViewController({ fabricEngine, threeEngine });
await initColorUIController({ colorEngine, fabricEngine });

let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    layoutController.fitCanvas();
    threeEngine.resize();
  }, 100);
});
