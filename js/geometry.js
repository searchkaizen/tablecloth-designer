const REQUIRED_PANELS = ['front', 'back', 'left', 'right', 'top'];

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function assertRect(rect, panelName) {
  const requiredKeys = ['x', 'y', 'w', 'h'];
  requiredKeys.forEach((key) => {
    if (!isFiniteNumber(rect?.[key])) {
      throw new Error(`Invalid panel rect for \"${panelName}\": missing numeric ${key}`);
    }
  });
}

function toPx(valueInches, scalePxPerInch) {
  return Math.round(valueInches * scalePxPerInch);
}

function toPxRect(rectInches, scalePxPerInch) {
  return {
    x: toPx(rectInches.x, scalePxPerInch),
    y: toPx(rectInches.y, scalePxPerInch),
    w: toPx(rectInches.w, scalePxPerInch),
    h: toPx(rectInches.h, scalePxPerInch)
  };
}

export async function loadDimensionsConfig(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load dimensions config: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export function getProductConfig(config, productId) {
  const fallbackId = config?.defaultProductId;
  const resolvedProductId = productId || fallbackId;

  if (!resolvedProductId) {
    throw new Error('No product id provided and no defaultProductId found.');
  }

  const product = config?.products?.[resolvedProductId];
  if (!product) {
    throw new Error(`Unknown product id: ${resolvedProductId}`);
  }

  REQUIRED_PANELS.forEach((panelName) => {
    if (!product.panels?.[panelName]) {
      throw new Error(`Missing panel definition for \"${panelName}\" in product \"${resolvedProductId}\"`);
    }
    assertRect(product.panels[panelName], panelName);
  });

  if (!isFiniteNumber(product?.net?.width) || !isFiniteNumber(product?.net?.height)) {
    throw new Error(`Invalid net dimensions for product \"${resolvedProductId}\"`);
  }

  if (!isFiniteNumber(product?.table?.length) || !isFiniteNumber(product?.table?.width) || !isFiniteNumber(product?.table?.height)) {
    throw new Error(`Invalid table dimensions for product \"${resolvedProductId}\"`);
  }

  return {
    productId: resolvedProductId,
    ...product
  };
}

function assertScale(scalePxPerInch) {
  if (!isFiniteNumber(scalePxPerInch) || scalePxPerInch <= 0) {
    throw new Error('scalePxPerInch must be a positive number');
  }
}

function buildRectLayout(productConfig, scalePxPerInch) {
  assertScale(scalePxPerInch);

  const panelsInches = REQUIRED_PANELS.reduce((acc, panelName) => {
    acc[panelName] = { ...productConfig.panels[panelName] };
    return acc;
  }, {});

  const panelsPx = REQUIRED_PANELS.reduce((acc, panelName) => {
    acc[panelName] = toPxRect(panelsInches[panelName], scalePxPerInch);
    return acc;
  }, {});

  const topPanelInches = panelsInches.top;

  const foldLinesInches = {
    horizontalTop: {
      x: topPanelInches.x,
      y: topPanelInches.y,
      w: topPanelInches.w
    },
    horizontalBottom: {
      x: topPanelInches.x,
      y: topPanelInches.y + topPanelInches.h,
      w: topPanelInches.w
    },
    verticalLeft: {
      x: topPanelInches.x,
      y: topPanelInches.y,
      h: topPanelInches.h
    },
    verticalRight: {
      x: topPanelInches.x + topPanelInches.w,
      y: topPanelInches.y,
      h: topPanelInches.h
    }
  };

  const foldLinesPx = {
    horizontalTop: {
      x: toPx(foldLinesInches.horizontalTop.x, scalePxPerInch),
      y: toPx(foldLinesInches.horizontalTop.y, scalePxPerInch),
      w: toPx(foldLinesInches.horizontalTop.w, scalePxPerInch)
    },
    horizontalBottom: {
      x: toPx(foldLinesInches.horizontalBottom.x, scalePxPerInch),
      y: toPx(foldLinesInches.horizontalBottom.y, scalePxPerInch),
      w: toPx(foldLinesInches.horizontalBottom.w, scalePxPerInch)
    },
    verticalLeft: {
      x: toPx(foldLinesInches.verticalLeft.x, scalePxPerInch),
      y: toPx(foldLinesInches.verticalLeft.y, scalePxPerInch),
      h: toPx(foldLinesInches.verticalLeft.h, scalePxPerInch)
    },
    verticalRight: {
      x: toPx(foldLinesInches.verticalRight.x, scalePxPerInch),
      y: toPx(foldLinesInches.verticalRight.y, scalePxPerInch),
      h: toPx(foldLinesInches.verticalRight.h, scalePxPerInch)
    }
  };

  const safeInsetInches = isFiniteNumber(productConfig.safeInset) ? productConfig.safeInset : 2;
  const safeInsetPx = toPx(safeInsetInches, scalePxPerInch);

  return {
    productId: productConfig.productId,
    type: productConfig.type,
    shape: productConfig.shape,
    scalePxPerInch,
    table: {
      inches: { ...productConfig.table },
      px: {
        length: toPx(productConfig.table.length, scalePxPerInch),
        width: toPx(productConfig.table.width, scalePxPerInch),
        height: toPx(productConfig.table.height, scalePxPerInch)
      }
    },
    net: {
      inches: { ...productConfig.net },
      px: {
        width: toPx(productConfig.net.width, scalePxPerInch),
        height: toPx(productConfig.net.height, scalePxPerInch)
      }
    },
    panels: {
      inches: panelsInches,
      px: panelsPx
    },
    safeInset: {
      inches: safeInsetInches,
      px: safeInsetPx
    },
    foldLines: {
      inches: foldLinesInches,
      px: foldLinesPx
    },
    rulers: {
      top: { inches: productConfig.net.width, px: toPx(productConfig.net.width, scalePxPerInch) },
      left: { inches: productConfig.net.height, px: toPx(productConfig.net.height, scalePxPerInch) },
      bottomSegments: [panelsInches.left.w, panelsInches.top.w, panelsInches.right.w],
      rightSegments: [panelsInches.back.h, panelsInches.top.h, panelsInches.front.h]
    },
    panelOrder: [...REQUIRED_PANELS]
  };
}

function buildRoundLayout(productConfig, scalePxPerInch) {
  throw new Error(`Round layout not implemented for product \"${productConfig.productId}\" yet.`);
}

export function buildLayout(productConfig, scalePxPerInch) {
  switch (productConfig.shape) {
    case 'rect':
      return buildRectLayout(productConfig, scalePxPerInch);
    case 'round':
      return buildRoundLayout(productConfig, scalePxPerInch);
    default:
      throw new Error(`Unsupported product shape: ${productConfig.shape}`);
  }
}

export function getPanelCanvasDimsPx(layout) {
  return layout.panelOrder.reduce((acc, panelName) => {
    const panel = layout.panels.px[panelName];
    acc[panelName] = { w: panel.w, h: panel.h };
    return acc;
  }, {});
}
