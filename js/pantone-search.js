export function createPantoneSearch(pantoneColors = [], maxResults = 15) {
  const safeMaxResults = Number.isFinite(maxResults) ? maxResults : 15;

  return {
    search(query) {
      const normalized = (query || '').trim().toLowerCase();
      if (!normalized) {
        return pantoneColors.slice(0, safeMaxResults);
      }

      const numericOnly = normalized.match(/^\d+/)?.[0] || null;

      const ranked = pantoneColors
        .filter((color) => {
          const name = (color?.name || '').toLowerCase();
          return name.includes(normalized) || (numericOnly ? name.includes(`pantone ${numericOnly}`) : false);
        })
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      return ranked.slice(0, safeMaxResults);
    }
  };
}
