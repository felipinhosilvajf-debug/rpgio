import { drawCharacter } from "./characterRenderer";
import { drawHDCharacter } from "./hdCharacterRenderer";
import type { CharacterOpts } from "./characterRenderer";

// Unified renderer wrapper
// - By default prefers HD renderer for higher visual quality
// - Falls back to legacy renderer if HD throws or if opts.forceLegacy === true

export function drawCharacterUnified(ctx: CanvasRenderingContext2D, x: number, y: number, opts: CharacterOpts & { forceLegacy?: boolean } ) {
  // If caller explicitly requests legacy, respect it
  if (opts?.forceLegacy) {
    try { drawCharacter(ctx, x, y, opts); } catch (e) { console.warn("legacy renderer failed:", e); }
    return;
  }

  // Try HD renderer first (non-blocking). drawHDCharacter is implemented to draw synchronously
  // in most cases; if it fails we fallback to legacy.
  try {
    // drawHDCharacter returns a Promise in current implementation; call without await so
    // rendering doesn't block the engine loop. The HD renderer draws immediately in most cases.
    // If the HD renderer needs to load external images it will handle them internally.
    // We intentionally don't await here to keep frame timing consistent.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (drawHDCharacter as any)(ctx, x, y, opts);
    return;
  } catch (e) {
    console.warn("HD renderer failed, falling back to legacy:", e);
    try { drawCharacter(ctx, x, y, opts); } catch (ee) { console.error("Both renderers failed:", ee); }
  }
}
