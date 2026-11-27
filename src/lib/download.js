/**
 * Browser-side file output: downloads via Blob URLs and chart image export.
 * No network calls; everything is generated in memory.
 */

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(text, fileName, mime = 'text/plain') {
  downloadBlob(new Blob([text], { type: `${mime};charset=utf-8` }), fileName);
}

/** Read CSS custom properties so exported images match the current theme. */
function themeVars() {
  const cs = getComputedStyle(document.documentElement);
  const v = (name) => cs.getPropertyValue(name).trim();
  return {
    bg: v('--bg'),
    surface: v('--surface'),
    text: v('--text'),
    muted: v('--muted'),
    border: v('--border'),
    link: v('--link-line'),
    healthy: v('--healthy'),
    healthyBg: v('--healthy-bg'),
    narrow: v('--narrow'),
    narrowBg: v('--narrow-bg'),
    wide: v('--wide'),
    wideBg: v('--wide-bg'),
    focus: v('--accent')
  };
}

/** Standalone stylesheet embedded into exported SVGs (CSS vars resolved to literal colors). */
function exportCss(t) {
  return `
  .link{fill:none;stroke:${t.link};stroke-width:1.5}
  .node-box{fill:${t.surface};stroke:${t.border};stroke-width:1.5}
  .node.healthy .node-box{fill:${t.healthyBg};stroke:${t.healthy};stroke-width:2.5}
  .node.narrow .node-box{fill:${t.narrowBg};stroke:${t.narrow};stroke-width:2.5}
  .node.wide .node-box{fill:${t.wideBg};stroke:${t.wide};stroke-width:2.5}
  .node.virtual .node-box{stroke-dasharray:4 3}
  .node.highlight .node-box{stroke:${t.focus};stroke-width:4}
  .node-stripe.healthy{fill:${t.healthy}} .node-stripe.narrow{fill:${t.narrow}} .node-stripe.wide{fill:${t.wide}}
  text{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;fill:${t.text}}
  .node-name{font-size:13px;font-weight:600}
  .node-title,.node-meta{font-size:11px;fill:${t.muted}}
  .node-toggle circle{fill:${t.surface};stroke:${t.muted}}
  .node-toggle text{font-size:12px;font-weight:700;fill:${t.text}}
  `;
}

/**
 * Serialize the visible chart (current zoom/pan) to a standalone SVG string.
 */
export function chartToSvgString(svgEl) {
  const t = themeVars();
  const { width, height } = svgEl.getBoundingClientRect();
  const clone = svgEl.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(Math.round(width)));
  clone.setAttribute('height', String(Math.round(height)));
  clone.setAttribute('viewBox', `0 0 ${Math.round(width)} ${Math.round(height)}`);
  clone.removeAttribute('class');
  clone.removeAttribute('style');
  // Strip interactive-only attributes
  clone.querySelectorAll('[tabindex]').forEach((el) => el.removeAttribute('tabindex'));
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = exportCss(t);
  clone.insertBefore(style, clone.firstChild);
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', '100%');
  bg.setAttribute('height', '100%');
  bg.setAttribute('fill', t.bg || '#ffffff');
  clone.insertBefore(bg, style.nextSibling);
  return { svg: new XMLSerializer().serializeToString(clone), width, height };
}

export function exportSvg(svgEl, fileName = 'spanscope-org-chart.svg') {
  const { svg } = chartToSvgString(svgEl);
  downloadText('<?xml version="1.0" encoding="UTF-8"?>\n' + svg, fileName, 'image/svg+xml');
}

/** Rasterize the SVG via an offscreen canvas at 2x for crisp output. */
export function exportPng(svgEl, fileName = 'spanscope-org-chart.png', scale = 2) {
  const { svg, width, height } = chartToSvgString(svgEl);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => {
          if (blob) {
            downloadBlob(blob, fileName);
            resolve();
          } else reject(new Error('PNG encoding failed'));
        }, 'image/png');
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not render chart image'));
    };
    img.src = url;
  });
}
