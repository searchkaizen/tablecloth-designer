import { createPantoneSearch } from './pantone-search.js';

function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;

  let r;
  let g;
  let b;

  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h;
  let s;
  const l = (max + min) / 2;

  if (max === min) {
    h = 0;
    s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      default:
        h = ((r - g) / d + 4) * 60;
        break;
    }
  }

  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 255, g: 255, b: 255 };
}

function rgbToCmyk(r, g, b) {
  if (r === 0 && g === 0 && b === 0) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }

  const c = 1 - r / 255;
  const m = 1 - g / 255;
  const y = 1 - b / 255;
  const k = Math.min(c, m, y);

  return {
    c: Math.round(((c - k) / (1 - k)) * 100),
    m: Math.round(((m - k) / (1 - k)) * 100),
    y: Math.round(((y - k) / (1 - k)) * 100),
    k: Math.round(k * 100)
  };
}

function cmykToRgb(c, m, y, k) {
  const cNorm = c / 100;
  const mNorm = m / 100;
  const yNorm = y / 100;
  const kNorm = k / 100;

  return {
    r: Math.round(255 * (1 - cNorm) * (1 - kNorm)),
    g: Math.round(255 * (1 - mNorm) * (1 - kNorm)),
    b: Math.round(255 * (1 - yNorm) * (1 - kNorm))
  };
}

export async function initColorUIController({ colorEngine, fabricEngine }) {
  let currentHSL = { h: 0, s: 0, l: 100 };
  let pantoneSearchEngine = createPantoneSearch([], 15);

  const colorGradient = document.getElementById('colorGradient');
  const colorCursor = document.getElementById('colorCursor');
  const colorHue = document.getElementById('colorHue');
  const hueCursor = document.getElementById('hueCursor');
  const colorPreviewSwatch = document.getElementById('colorPreviewSwatch');
  const pantoneName = document.getElementById('pantoneName');
  const hexInput = document.getElementById('hexInput');
  const cmykC = document.getElementById('cmykC');
  const cmykM = document.getElementById('cmykM');
  const cmykY = document.getElementById('cmykY');
  const cmykK = document.getElementById('cmykK');
  const pantoneSearchInput = document.getElementById('pantoneSearch');
  const pantoneDropdown = document.getElementById('pantoneDropdown');

  function renderDropdown(colors) {
    if (!colors.length) {
      pantoneDropdown.classList.remove('open');
      return;
    }

    pantoneDropdown.innerHTML = colors
      .map(
        (color) => `
        <div class="pantone-option" data-name="${color.name}" data-hex="${color.hex}" 
             data-cmyk-c="${color.cmyk.c}" data-cmyk-m="${color.cmyk.m}" 
             data-cmyk-y="${color.cmyk.y}" data-cmyk-k="${color.cmyk.k}">
            <div class="pantone-option-swatch" style="background: ${color.hex}"></div>
            <span class="pantone-option-name">${color.name}</span>
            <span class="pantone-option-hex">${color.hex}</span>
        </div>
      `
      )
      .join('');

    pantoneDropdown.classList.add('open');
  }

  function updateAllUI(hex, cmyk, updatePickerCursors) {
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const state = colorEngine.getState();

    colorPreviewSwatch.style.background = hex;
    hexInput.value = hex;

    if (state.print.pantone) {
      pantoneName.textContent = state.print.pantone.name;
      pantoneName.classList.add('is-pantone');
    } else {
      pantoneName.textContent = 'Custom Color';
      pantoneName.classList.remove('is-pantone');
    }

    cmykC.value = cmyk.c;
    cmykM.value = cmyk.m;
    cmykY.value = cmyk.y;
    cmykK.value = cmyk.k;

    colorGradient.style.background = `
      linear-gradient(to bottom, transparent, #000),
      linear-gradient(to right, #fff, hsl(${hsl.h}, 100%, 50%))
    `;

    if (updatePickerCursors) {
      const gradientWidth = colorGradient.offsetWidth || 200;
      hueCursor.style.top = `${(hsl.h / 360) * 150}px`;
      colorCursor.style.left = `${(hsl.s / 100) * gradientWidth}px`;
      colorCursor.style.top = `${((100 - hsl.l) / 100) * 150}px`;
    }

    fabricEngine.setBackgroundColor(hex);
  }

  function updateFromVisualPicker(h, s, l, updatePickerCursors = true) {
    currentHSL = { h, s, l };
    const rgb = hslToRgb(h, s, l);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);

    colorEngine.setHex(hex);
    updateAllUI(hex, cmyk, updatePickerCursors);
  }

  function updateFromHex(hex) {
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);

    currentHSL = hsl;
    colorEngine.setHex(hex);
    updateAllUI(hex, cmyk, true);
  }

  function updateFromPantone(pantoneColor) {
    const hex = pantoneColor.hex;
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

    currentHSL = hsl;
    colorEngine.setPantone(pantoneColor);
    updateAllUI(hex, pantoneColor.cmyk, true);
  }

  function handleGradientMove(event) {
    const rect = colorGradient.getBoundingClientRect();
    const width = rect.width;
    const x = Math.max(0, Math.min(width, event.clientX - rect.left));
    const y = Math.max(0, Math.min(150, event.clientY - rect.top));
    colorCursor.style.left = `${x}px`;
    colorCursor.style.top = `${y}px`;
    const s = (x / width) * 100;
    const l = 100 - (y / 150) * 100;
    updateFromVisualPicker(currentHSL.h, s, l, false);
  }

  function handleHueMove(event) {
    const rect = colorHue.getBoundingClientRect();
    const y = Math.max(0, Math.min(150, event.clientY - rect.top));
    hueCursor.style.top = `${y}px`;
    const h = (y / 150) * 360;
    updateFromVisualPicker(h, currentHSL.s, currentHSL.l, false);
  }

  function updateFromCmyk() {
    const c = Math.max(0, Math.min(100, parseInt(cmykC.value, 10) || 0));
    const m = Math.max(0, Math.min(100, parseInt(cmykM.value, 10) || 0));
    const y = Math.max(0, Math.min(100, parseInt(cmykY.value, 10) || 0));
    const k = Math.max(0, Math.min(100, parseInt(cmykK.value, 10) || 0));

    colorEngine.setCmyk({ c, m, y, k });
    const state = colorEngine.getState();
    const rgb = cmykToRgb(c, m, y, k);
    currentHSL = rgbToHsl(rgb.r, rgb.g, rgb.b);
    updateAllUI(state.preview.rgb, { c, m, y, k }, true);
  }

  let isDraggingGradient = false;
  colorGradient.addEventListener('mousedown', (event) => {
    isDraggingGradient = true;
    handleGradientMove(event);
  });
  document.addEventListener('mousemove', (event) => {
    if (isDraggingGradient) {
      handleGradientMove(event);
    }
  });
  document.addEventListener('mouseup', () => {
    isDraggingGradient = false;
  });

  let isDraggingHue = false;
  colorHue.addEventListener('mousedown', (event) => {
    isDraggingHue = true;
    handleHueMove(event);
  });
  document.addEventListener('mousemove', (event) => {
    if (isDraggingHue) {
      handleHueMove(event);
    }
  });
  document.addEventListener('mouseup', () => {
    isDraggingHue = false;
  });

  hexInput.addEventListener('change', (event) => {
    let value = event.target.value.trim();
    if (!value.startsWith('#')) {
      value = `#${value}`;
    }
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      updateFromHex(value);
    }
  });

  [cmykC, cmykM, cmykY, cmykK].forEach((input) => {
    input.addEventListener('change', updateFromCmyk);
    input.addEventListener('input', updateFromCmyk);
  });

  pantoneSearchInput.addEventListener('input', (event) => {
    renderDropdown(pantoneSearchEngine.search(event.target.value));
  });

  pantoneSearchInput.addEventListener('focus', (event) => {
    renderDropdown(pantoneSearchEngine.search(event.target.value));
  });

  pantoneDropdown.addEventListener('click', (event) => {
    const option = event.target.closest('.pantone-option');
    if (!option) {
      return;
    }

    const pantoneColor = {
      name: option.dataset.name,
      hex: option.dataset.hex,
      cmyk: {
        c: parseInt(option.dataset.cmykC, 10),
        m: parseInt(option.dataset.cmykM, 10),
        y: parseInt(option.dataset.cmykY, 10),
        k: parseInt(option.dataset.cmykK, 10)
      }
    };

    updateFromPantone(pantoneColor);
    pantoneDropdown.classList.remove('open');
    pantoneSearchInput.value = '';
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.pantone-search-wrapper')) {
      pantoneDropdown.classList.remove('open');
    }
  });

  try {
    const response = await fetch('./data/pantone_colors.json');
    const colors = await response.json();
    pantoneSearchEngine = createPantoneSearch(colors, 15);
  } catch (error) {
    console.warn('Could not load Pantone colors:', error);
  }

  updateFromHex('#F1B241');
}
