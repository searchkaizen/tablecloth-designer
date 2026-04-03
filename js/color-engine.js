function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function cmykToHex(c, m, y, k) {
  const cNorm = clamp(c, 0, 100) / 100;
  const mNorm = clamp(m, 0, 100) / 100;
  const yNorm = clamp(y, 0, 100) / 100;
  const kNorm = clamp(k, 0, 100) / 100;

  const r = Math.round(255 * (1 - cNorm) * (1 - kNorm));
  const g = Math.round(255 * (1 - mNorm) * (1 - kNorm));
  const b = Math.round(255 * (1 - yNorm) * (1 - kNorm));

  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

export function createColorEngine(initialState = {}) {
  const state = {
    preview: { rgb: initialState.preview?.rgb || '#FFFFFF' },
    print: {
      pantone: initialState.print?.pantone || null,
      cmyk: initialState.print?.cmyk || { c: 0, m: 0, y: 0, k: 0 }
    }
  };

  return {
    setHex(hex) {
      state.preview.rgb = hex;
      state.print.pantone = null;
    },
    setPantone(pantone) {
      state.print.pantone = pantone;
      state.preview.rgb = pantone?.hex || state.preview.rgb;
      if (pantone?.cmyk) {
        state.print.cmyk = { ...pantone.cmyk };
      }
    },
    setCmyk(cmyk) {
      state.print.cmyk = {
        c: clamp(Number(cmyk.c ?? 0), 0, 100),
        m: clamp(Number(cmyk.m ?? 0), 0, 100),
        y: clamp(Number(cmyk.y ?? 0), 0, 100),
        k: clamp(Number(cmyk.k ?? 0), 0, 100)
      };
      state.print.pantone = null;
      state.preview.rgb = cmykToHex(state.print.cmyk.c, state.print.cmyk.m, state.print.cmyk.y, state.print.cmyk.k);
    },
    getState() {
      return JSON.parse(JSON.stringify(state));
    }
  };
}
