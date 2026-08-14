const cache = new Map<string, HTMLCanvasElement>();

function keyFromOpts(opts: any) {
  return JSON.stringify({
    cor: opts.cor,
    cabelo: opts.cabelo,
    pele: opts.pele,
    camisaImagem: opts.camisaImagem,
    uniformeCor: opts.uniforme?.cor ?? null,
    camisaModelo: opts.camisaModelo ?? null,
    cabeloEstilo: opts.cabeloEstilo ?? null,
  });
}

export function getCachedSprite(opts: any) {
  const k = keyFromOpts(opts);
  return cache.get(k) ?? null;
}

export function setCachedSprite(opts: any, canvas: HTMLCanvasElement) {
  const k = keyFromOpts(opts);
  cache.set(k, canvas);
}

export function clearCache() { cache.clear(); }
