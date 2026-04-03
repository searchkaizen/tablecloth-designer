import { loadDimensionsConfig, getProductConfig, buildLayout, getPanelCanvasDimsPx } from './geometry.js';
import { createFabricEngine } from './fabric-engine.js';
import { createThreeEngine } from './three-engine.js';
import { createSyncEngine } from './sync-engine.js';
import { createColorEngine } from './color-engine.js';
import { resolveProductId } from './product-registry.js';

export async function bootstrapApp({
  dimensionsPath = './data/tablecloth-dimensions.json',
  productKey,
  scalePxPerInch = 7
} = {}) {
  const dimensionsConfig = await loadDimensionsConfig(dimensionsPath);
  const selectedProductId = resolveProductId(productKey) || dimensionsConfig.defaultProductId;
  const productConfig = getProductConfig(dimensionsConfig, selectedProductId);
  const layout = buildLayout(productConfig, scalePxPerInch);
  const panelDims = getPanelCanvasDimsPx(layout);
  const templateCanvasEl = document.getElementById('templateCanvas');

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

  fabricEngine.onChange(() => {
    syncEngine.scheduleTextureUpdate(100);
  });

  return {
    dimensionsConfig,
    productConfig,
    layout,
    engines: {
      fabric: fabricEngine,
      three: threeEngine,
      sync: syncEngine,
      color: colorEngine
    }
  };
}
