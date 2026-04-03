export function createSyncEngine({ onSync } = {}) {
  let timeoutId = null;

  return {
    scheduleTextureUpdate(delayMs = 100) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (typeof onSync === 'function') {
          onSync();
        }
      }, delayMs);
    },
    flush() {
      clearTimeout(timeoutId);
      if (typeof onSync === 'function') {
        onSync();
      }
    }
  };
}
