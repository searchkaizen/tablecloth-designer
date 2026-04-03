export function createUploadEngine({ maxFileSizeMb = 10 } = {}) {
  const maxBytes = maxFileSizeMb * 1024 * 1024;

  return {
    validateFiles(fileList) {
      return Array.from(fileList || []).map((file) => ({
        file,
        validType: file.type.startsWith('image/'),
        validSize: file.size <= maxBytes
      }));
    }
  };
}
