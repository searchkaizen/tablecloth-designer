export function createLayoutController({ layout, templateCanvasEl }) {
  const baseWidth = layout.net.px.width + 70;
  const baseHeight = layout.net.px.height + 30;

  function applyLayoutGeometry() {
    const templateWrapperEl = document.querySelector('.template-wrapper');

    templateWrapperEl.style.setProperty('--layout-base-width', `${baseWidth}px`);
    templateWrapperEl.style.setProperty('--layout-base-height', `${baseHeight}px`);
    templateCanvasEl.style.setProperty('--layout-net-width', `${layout.net.px.width}px`);
    templateCanvasEl.style.setProperty('--layout-net-height', `${layout.net.px.height}px`);

    Object.entries(layout.panels.px).forEach(([panelName, panel]) => {
      const panelEl = document.querySelector(`.panel-${panelName}`);
      if (!panelEl) {
        return;
      }

      panelEl.style.setProperty('--panel-x', `${panel.x}px`);
      panelEl.style.setProperty('--panel-y', `${panel.y}px`);
      panelEl.style.setProperty('--panel-w', `${panel.w}px`);
      panelEl.style.setProperty('--panel-h', `${panel.h}px`);
      panelEl.style.setProperty('--safe-inset', `${layout.safeInset.px}px`);

      const panelCanvas = panelEl.querySelector('canvas');
      if (panelCanvas) {
        panelCanvas.width = panel.w;
        panelCanvas.height = panel.h;
      }
    });
  }

  function applyRulerLabels() {
    document.querySelector('#rulerTop .dimension-text').textContent = `${layout.net.inches.width}"`;
    document.querySelector('#rulerLeft .dimension-text').textContent = `${layout.net.inches.height}"`;

    const [bottomLeft, bottomCenter, bottomRight] = layout.rulers.bottomSegments;
    document.querySelector('#segBottomLeft .seg-text').textContent = `${bottomLeft}"`;
    document.querySelector('#segBottomCenter .seg-text').textContent = `${bottomCenter}"`;
    document.querySelector('#segBottomRight .seg-text').textContent = `${bottomRight}"`;

    const [rightTop, rightMiddle, rightBottom] = layout.rulers.rightSegments;
    document.querySelector('#segRightTop .seg-text').textContent = `${rightTop}"`;
    document.querySelector('#segRightMiddle .seg-text').textContent = `${rightMiddle}"`;
    document.querySelector('#segRightBottom .seg-text').textContent = `${rightBottom}"`;
  }

  function drawDimensions() {
    const totalWidthPx = layout.net.px.width;
    const totalHeightPx = layout.net.px.height;
    const frontWidthPx = layout.panels.px.top.w;
    const panelHeightPx = layout.panels.px.front.h;
    const sideWidthPx = layout.panels.px.left.w;
    const tableTopDepthPx = layout.panels.px.top.h;

    const rulerTop = document.getElementById('rulerTop');
    rulerTop.style.width = `${totalWidthPx}px`;
    rulerTop.style.left = '0px';
    rulerTop.style.top = '-12px';

    const rulerBottom = document.getElementById('rulerBottom');
    rulerBottom.style.width = `${totalWidthPx}px`;
    rulerBottom.style.left = '0px';
    rulerBottom.style.bottom = '-12px';
    document.getElementById('segBottomLeft').style.width = `${sideWidthPx}px`;
    document.getElementById('segBottomCenter').style.width = `${frontWidthPx}px`;
    document.getElementById('segBottomRight').style.width = `${sideWidthPx}px`;

    const rulerLeft = document.getElementById('rulerLeft');
    rulerLeft.style.height = `${totalHeightPx}px`;
    rulerLeft.style.left = '-28px';
    rulerLeft.style.top = '0px';

    const rulerRight = document.getElementById('rulerRight');
    rulerRight.style.height = `${totalHeightPx}px`;
    rulerRight.style.right = '-28px';
    rulerRight.style.top = '0px';
    document.getElementById('segRightTop').style.height = `${panelHeightPx}px`;
    document.getElementById('segRightMiddle').style.height = `${tableTopDepthPx}px`;
    document.getElementById('segRightBottom').style.height = `${panelHeightPx}px`;

    const foldTopH = document.getElementById('foldTopH');
    foldTopH.style.top = `${panelHeightPx}px`;
    foldTopH.style.left = `${sideWidthPx}px`;
    foldTopH.style.width = `${frontWidthPx}px`;

    const foldBottomH = document.getElementById('foldBottomH');
    foldBottomH.style.top = `${panelHeightPx + tableTopDepthPx}px`;
    foldBottomH.style.left = `${sideWidthPx}px`;
    foldBottomH.style.width = `${frontWidthPx}px`;

    const foldLeftV = document.getElementById('foldLeftV');
    foldLeftV.style.left = `${sideWidthPx}px`;
    foldLeftV.style.top = `${panelHeightPx}px`;
    foldLeftV.style.height = `${tableTopDepthPx}px`;

    const foldRightV = document.getElementById('foldRightV');
    foldRightV.style.left = `${sideWidthPx + frontWidthPx}px`;
    foldRightV.style.top = `${panelHeightPx}px`;
    foldRightV.style.height = `${tableTopDepthPx}px`;
  }

  function fitCanvas() {
    const container = document.querySelector('.main-canvas');
    const canvasScale = document.getElementById('canvasScale');
    const wrapper = document.querySelector('.template-wrapper');

    const availableWidth = container.clientWidth - 20 - 30;
    const availableHeight = container.clientHeight - 20 - 30;
    const scale = Math.min(availableWidth / baseWidth, availableHeight / baseHeight, 1);

    canvasScale.style.transform = `scale(${scale})`;
    wrapper.style.width = `${baseWidth * scale}px`;
    wrapper.style.height = `${baseHeight * scale}px`;
  }

  function init() {
    applyLayoutGeometry();
    applyRulerLabels();
    drawDimensions();
    fitCanvas();
  }

  return {
    init,
    fitCanvas
  };
}
