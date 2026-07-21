/* Explicit public-app bootstrap edge for the visual aperture. The release page
 * loads this module directly; it mounts the display projection without
 * coupling it to the compiler-facing app module or to localization. Standalone
 * builds set the bundle flag and inline the same CSS and JavaScript instead,
 * and strip this module's script tag. If the aperture cannot load, the
 * mainline atlas remains as the progressive fallback. */
if (typeof document !== 'undefined'
  && !globalThis.__CLIFFORD_APERTURE_BUNDLED__
  && !globalThis.__CLIFFORD_APERTURE_LOADING__) {
  globalThis.__CLIFFORD_APERTURE_LOADING__ = true;
  if (!document.getElementById('clifford-visual-aperture-css')) {
    const link = document.createElement('link');
    link.id = 'clifford-visual-aperture-css';
    link.rel = 'stylesheet';
    link.href = 'src/visual-aperture.css?v=20260721-workspace';
    document.head.append(link);
  }
  import('./visual-aperture.js?v=20260721-workspace').catch(error => {
    console.error('Could not load the visual aperture.', error);
  });
}
