import React, { useEffect, useRef } from 'react';
import styles from './AvatarCanvas.module.css';

type Props = {
  spriteSrc: string;           // URL/path do sprite ou portrait
  frameWidth?: number;         // largura do frame (px) se for spritesheet
  frameHeight?: number;        // altura do frame (px)
  desiredSize?: number;        // tamanho final do avatar (px) dentro da moldura (ex: 64)
  scale?: number;              // força um scale inteiro (opcional)
  alt?: string;
};

export default function AvatarCanvas({
  spriteSrc,
  frameWidth = 32,
  frameHeight = 32,
  desiredSize = 64,
  scale,
  alt = 'avatar',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = spriteSrc;
    img.crossOrigin = 'anonymous';
    imageRef.current = img;

    let mounted = true;

    const onLoad = () => {
      if (!mounted) return;
      const canvas = canvasRef.current!;
      if (!canvas) return;

      // target logical pixel size inside canvas (content area)
      const contentSize = desiredSize;
      // choose integer scale to avoid subpixel scaling blur
      const naturalFrameW = frameWidth;
      const naturalFrameH = frameHeight;

      // compute base scale if not provided: floor of desiredSize / frameWidth
      const integerScale = scale ?? Math.max(1, Math.floor(contentSize / naturalFrameW));

      // set canvas logical size (we will draw integer-scaled portrait)
      canvas.width = naturalFrameW * integerScale;
      canvas.height = naturalFrameH * integerScale;
      // set CSS size to contentSize (keeps pixels crisp)
      canvas.style.width = `${contentSize}px`;
      canvas.style.height = `${contentSize}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Disable smoothing for crisp pixel art
      ctx.imageSmoothingEnabled = false;
      // some browsers support pixelated rendering on canvas via CSS
      // we also set ctx.patternQuality etc if available (best-effort)
      // Clear with transparent, then draw background by CSS of wrapper (keeps separation)
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // If sprite is a sheet and larger than a single frame, try to pick the central frame
      const framesAcross = Math.max(1, Math.floor(img.width / naturalFrameW));
      const framesDown = Math.max(1, Math.floor(img.height / naturalFrameH));

      // Choose frame coords: center frame (portrait style)
      const frameXIndex = Math.floor(framesAcross / 2);
      const frameYIndex = Math.floor(framesDown / 2);

      const sx = frameXIndex * naturalFrameW;
      const sy = frameYIndex * naturalFrameH;
      const sWidth = naturalFrameW;
      const sHeight = naturalFrameH;

      // Destination size in canvas pixels (already integer scaled)
      const dWidth = naturalFrameW * integerScale;
      const dHeight = naturalFrameH * integerScale;

      // Centering within canvas (if canvas bigger than frame)
      const dx = Math.floor((canvas.width - dWidth) / 2);
      const dy = Math.floor((canvas.height - dHeight) / 2);

      // Draw
      try {
        ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
      } catch (e) {
        // fallback: draw the whole image scaled to fit, integer scaling enforced
        ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
      }
    };

    img.onload = onLoad;
    img.onerror = () => {
      // Optionally render placeholder
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#6b4a2a';
      ctx.fillRect(0, 0, canvas.width || desiredSize, canvas.height || desiredSize);
      // tiny X placeholder
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(desiredSize, desiredSize);
      ctx.moveTo(desiredSize, 0);
      ctx.lineTo(0, desiredSize);
      ctx.stroke();
    };

    return () => {
      mounted = false;
    };
  }, [spriteSrc, frameWidth, frameHeight, desiredSize, scale]);

  return (
    <div className={styles.frame} role="img" aria-label={alt}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
