import { useEffect, useState } from 'react';

/** Hash-based routing so GitHub Pages refreshes never 404. Routes look like #/chart. */
const read = () => (window.location.hash.replace(/^#\/?/, '').split(/[?/]/)[0] || '');

export function useHashRoute() {
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function navigate(route) {
  const target = `#/${route}`;
  if (window.location.hash !== target) window.location.hash = target;
}
