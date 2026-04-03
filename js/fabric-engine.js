const PANEL_ORDER = ['front', 'back', 'left', 'right', 'top'];

export function createFabricEngine({ panelDims, safeInsetPx, templateCanvasEl }) {
  const fabricCanvases = {};
  const changeHandlers = new Set();
  let proofRenderTimeout;
  let changeTimeout;
  let uploadBound = false;

  function notifyChangeDebounced(delayMs = 100) {
    clearTimeout(changeTimeout);
    changeTimeout = setTimeout(() => {
      changeHandlers.forEach((handler) => handler());
    }, delayMs);
  }

  function panelTransformForProof(panelName) {
    switch (panelName) {
      case 'back':
        return 'rotate(180deg)';
      case 'left':
        return 'rotate(90deg)';
      case 'right':
        return 'rotate(-90deg)';
      default:
        return 'none';
    }
  }

  function getPanelOverlay(panelName) {
    const panelEl = document.querySelector(`.panel-${panelName}`);
    return panelEl ? panelEl.querySelector('.proof-overlay') : null;
  }

  function renderProofOverlays() {
    PANEL_ORDER.forEach((panelName) => {
      const fc = fabricCanvases[panelName];
      const overlay = getPanelOverlay(panelName);
      if (!fc || !overlay) {
        return;
      }

      const active = fc.getActiveObject();
      fc.discardActiveObject();
      fc.renderAll();

      const dataUrl = fc.toDataURL({
        format: 'png',
        multiplier: 1,
        enableRetinaScaling: false
      });

      if (active) {
        fc.setActiveObject(active);
        fc.renderAll();
      }

      let img = overlay.querySelector('img');
      if (!img) {
        img = document.createElement('img');
        overlay.appendChild(img);
      }

      img.src = dataUrl;
      img.style.transform = panelTransformForProof(panelName);
    });
  }

  function scheduleProofOverlayRender() {
    clearTimeout(proofRenderTimeout);
    proofRenderTimeout = setTimeout(() => {
      if (templateCanvasEl?.classList.contains('proof-mode')) {
        renderProofOverlays();
      }
    }, 150);
  }

  function getSafeZoneDims(panelName) {
    const dims = panelDims[panelName];
    return {
      width: dims.w - safeInsetPx * 2,
      height: dims.h - safeInsetPx * 2,
      left: safeInsetPx,
      top: safeInsetPx
    };
  }

  function createSafeZoneClipPath(panelName) {
    const zone = getSafeZoneDims(panelName);
    return new fabric.Rect({
      left: zone.left,
      top: zone.top,
      width: zone.width,
      height: zone.height,
      absolutePositioned: true
    });
  }

  function constrainImageToSafeZone(img, panelName) {
    const safeZone = getSafeZoneDims(panelName);
    const bounds = img.getBoundingRect();

    let newLeft = img.left;
    let newTop = img.top;
    const minVisible = 20;

    if (bounds.left > safeZone.left + safeZone.width - minVisible) {
      newLeft = img.left - (bounds.left - (safeZone.left + safeZone.width - minVisible));
    }
    if (bounds.top > safeZone.top + safeZone.height - minVisible) {
      newTop = img.top - (bounds.top - (safeZone.top + safeZone.height - minVisible));
    }
    if (bounds.left + bounds.width < safeZone.left + minVisible) {
      newLeft = img.left + (safeZone.left + minVisible - (bounds.left + bounds.width));
    }
    if (bounds.top + bounds.height < safeZone.top + minVisible) {
      newTop = img.top + (safeZone.top + minVisible - (bounds.top + bounds.height));
    }

    if (newLeft !== img.left || newTop !== img.top) {
      img.set({ left: newLeft, top: newTop });
      img.setCoords();
    }
  }

  function handleImageUpload(files, panelName, uploadWarning, uploadWarningText) {
    const fc = fabricCanvases[panelName];
    if (!fc) {
      return;
    }

    const safeZone = getSafeZoneDims(panelName);
    let wasScaled = false;
    let fileCount = 0;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds 10MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        fabric.Image.fromURL(
          event.target.result,
          (img) => {
            const imgWidth = img.width;
            const imgHeight = img.height;

            let scale = 1;
            const widthRatio = safeZone.width / imgWidth;
            const heightRatio = safeZone.height / imgHeight;

            if (imgWidth > safeZone.width || imgHeight > safeZone.height) {
              scale = Math.min(widthRatio, heightRatio);
              wasScaled = true;
            }

            img.scale(scale);

            const scaledWidth = imgWidth * scale;
            const scaledHeight = imgHeight * scale;
            img.set({
              left: safeZone.left + (safeZone.width - scaledWidth) / 2,
              top: safeZone.top + (safeZone.height - scaledHeight) / 2,
              originX: 'left',
              originY: 'top'
            });

            img.clipPath = createSafeZoneClipPath(panelName);

            fc.add(img);
            fc.setActiveObject(img);
            fc.renderAll();

            fileCount += 1;

            if (wasScaled && fileCount === files.length && uploadWarning && uploadWarningText) {
              uploadWarningText.textContent =
                files.length > 1
                  ? 'Images were scaled to fit within the safe zone.'
                  : 'Image was scaled to fit within the safe zone.';
              uploadWarning.classList.add('visible');
              setTimeout(() => uploadWarning.classList.remove('visible'), 5000);
            }

            notifyChangeDebounced();
            scheduleProofOverlayRender();
          },
          { crossOrigin: 'anonymous' }
        );
      };
      reader.readAsDataURL(file);
    });
  }

  function bindUploadUI({
    dropzoneId = 'uploadDropzone',
    fileInputId = 'uploadFileInput',
    panelSelectId = 'uploadPanelSelect',
    warningId = 'uploadWarning',
    warningTextId = 'uploadWarningText'
  } = {}) {
    if (uploadBound) {
      return;
    }

    const uploadDropzone = document.getElementById(dropzoneId);
    const uploadFileInput = document.getElementById(fileInputId);
    const uploadPanelSelect = document.getElementById(panelSelectId);
    const uploadWarning = document.getElementById(warningId);
    const uploadWarningText = document.getElementById(warningTextId);

    if (!uploadDropzone || !uploadFileInput || !uploadPanelSelect) {
      return;
    }

    uploadFileInput.addEventListener('change', (event) => {
      if (event.target.files.length > 0) {
        handleImageUpload(event.target.files, uploadPanelSelect.value, uploadWarning, uploadWarningText);
        event.target.value = '';
      }
    });

    uploadDropzone.addEventListener('click', () => {
      uploadFileInput.click();
    });

    uploadDropzone.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.stopPropagation();
      uploadDropzone.classList.add('drag-over');
    });

    uploadDropzone.addEventListener('dragleave', (event) => {
      event.preventDefault();
      event.stopPropagation();
      uploadDropzone.classList.remove('drag-over');
    });

    uploadDropzone.addEventListener('drop', (event) => {
      event.preventDefault();
      event.stopPropagation();
      uploadDropzone.classList.remove('drag-over');

      const files = event.dataTransfer.files;
      if (files.length > 0) {
        handleImageUpload(files, uploadPanelSelect.value, uploadWarning, uploadWarningText);
      }
    });

    window.addEventListener('dragover', (event) => event.preventDefault());
    window.addEventListener('drop', (event) => event.preventDefault());

    uploadBound = true;
  }

  function capturePanelTexture(panelName) {
    const fc = fabricCanvases[panelName];
    if (!fc) {
      console.warn('Fabric canvas not found for:', panelName);
      return null;
    }

    const activeObject = fc.getActiveObject();
    fc.discardActiveObject();
    fc.renderAll();

    const src = fc.lowerCanvasEl;
    const out = document.createElement('canvas');
    out.width = src.width;
    out.height = src.height;

    const ctx = out.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(src, 0, 0);

    if (activeObject) {
      fc.setActiveObject(activeObject);
      fc.renderAll();
    }

    return out;
  }

  function init() {
    PANEL_ORDER.forEach((panelName) => {
      const canvasId = `fabric${panelName.charAt(0).toUpperCase()}${panelName.slice(1)}`;
      const dims = panelDims[panelName];

      const fc = new fabric.Canvas(canvasId, {
        width: dims.w,
        height: dims.h,
        backgroundColor: '#ffffff',
        selection: true,
        preserveObjectStacking: true
      });

      fc.renderAll();
      fabricCanvases[panelName] = fc;

      fc.on('object:added', () => {
        notifyChangeDebounced();
        scheduleProofOverlayRender();
      });
      fc.on('object:removed', () => {
        notifyChangeDebounced();
        scheduleProofOverlayRender();
      });
      fc.on('object:modified', () => {
        notifyChangeDebounced();
        scheduleProofOverlayRender();
      });
      fc.on('object:moving', (event) => {
        if (event.target && event.target.type === 'image') {
          constrainImageToSafeZone(event.target, panelName);
        }
        notifyChangeDebounced();
        scheduleProofOverlayRender();
      });
      fc.on('object:scaling', () => {
        notifyChangeDebounced();
        scheduleProofOverlayRender();
      });
      fc.on('object:rotating', () => {
        notifyChangeDebounced();
        scheduleProofOverlayRender();
      });
    });
  }

  function setBackgroundColor(color) {
    const canvases = Object.values(fabricCanvases);
    let completed = 0;

    canvases.forEach((fc) => {
      fc.setBackgroundColor(color, () => {
        fc.renderAll();
        completed += 1;
        if (completed === canvases.length) {
          notifyChangeDebounced(0);
          scheduleProofOverlayRender();
        }
      });
    });
  }

  function setProofModeEnabled(enabled) {
    templateCanvasEl.classList.toggle('proof-mode', enabled);
    if (enabled) {
      renderProofOverlays();
    }
  }

  return {
    init,
    onChange(handler) {
      changeHandlers.add(handler);
      return () => changeHandlers.delete(handler);
    },
    setBackgroundColor,
    setProofModeEnabled,
    bindUploadUI,
    capturePanelTexture,
    getCanvases() {
      return fabricCanvases;
    }
  };
}
