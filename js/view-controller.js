export function initViewController({ fabricEngine, threeEngine }) {
  const btn2D = document.getElementById('btn2D');
  const btn3D = document.getElementById('btn3D');
  const preview2D = document.getElementById('preview2D');
  const preview3D = document.getElementById('preview3D');

  btn2D.addEventListener('click', () => {
    btn2D.classList.add('active');
    btn3D.classList.remove('active');
    preview2D.classList.remove('hidden');
    preview3D.classList.remove('active');
    fabricEngine.setProofModeEnabled(true);
  });

  btn3D.addEventListener('click', () => {
    btn3D.classList.add('active');
    btn2D.classList.remove('active');
    preview3D.classList.add('active');
    preview2D.classList.add('hidden');

    fabricEngine.setProofModeEnabled(false);

    requestAnimationFrame(() => {
      if (!threeEngine.isInitialized()) {
        threeEngine.init();
      }

      threeEngine.resize();
      threeEngine.updateTextures();
    });
  });
}
