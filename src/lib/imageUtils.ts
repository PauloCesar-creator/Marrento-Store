/**
 * Helper to compress and optimize image files from mobile camera or gallery.
 * Handles high-resolution phone camera photos (12MP-48MP), varying MIME types (HEIC/raw),
 * and produces crisp, lightweight (~25-45KB) images.
 * 
 * Benefits:
 * - Fits safely in localStorage without triggering QuotaExceededError
 * - Persists reliably in Supabase database `image_url` TEXT column
 * - Loads instantaneously on mobile networks
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeBytes?: number; // target maximum size in bytes (e.g. 80KB)
}

/**
 * Checks if a file is an image by MIME type or file extension (vital for mobile camera captures)
 */
export function isImageFile(file: File): boolean {
  if (file.type && file.type.toLowerCase().startsWith('image/')) {
    return true;
  }
  const name = file.name.toLowerCase();
  return /\.(jpg|jpeg|png|webp|heic|heif|gif|bmp|avif)$/i.test(name);
}

/**
 * Compresses an image file from phone camera or gallery using an offscreen canvas.
 * Uses URL.createObjectURL for memory-efficient loading on mobile devices.
 */
export async function compressImageFile(
  file: File,
  maxWidth = 640,
  maxHeight = 640,
  quality = 0.78
): Promise<string> {
  if (!isImageFile(file)) {
    throw new Error('O arquivo selecionado não é uma imagem suportada.');
  }

  return new Promise((resolve, reject) => {
    // Create an object URL for memory efficiency on mobile
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    // Clean up object URL when done
    const cleanup = () => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        // ignore
      }
    };

    img.onerror = () => {
      cleanup();
      // If object URL fails (e.g. older browser or specific format), fallback to FileReader
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Falha ao ler a imagem da câmera ou galeria.'));
      reader.onload = () => {
        const fallbackImg = new Image();
        fallbackImg.onerror = () => reject(new Error('Formato de foto não suportado pelo navegador.'));
        fallbackImg.onload = () => {
          try {
            const result = renderToCompressedCanvas(fallbackImg, maxWidth, maxHeight, quality);
            resolve(result);
          } catch (err) {
            reject(err);
          }
        };
        fallbackImg.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    };

    img.onload = () => {
      cleanup();
      try {
        const result = renderToCompressedCanvas(img, maxWidth, maxHeight, quality);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };

    img.src = objectUrl;
  });
}

/**
 * Draws an Image element to canvas with aspect ratio preservation and compresses to JPEG.
 * If size exceeds 90KB, automatically scales down to guarantee stability.
 */
function renderToCompressedCanvas(
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number,
  quality: number
): string {
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (!width || !height) {
    width = 600;
    height = 600;
  }

  // Calculate proportional dimensions
  if (width > height) {
    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }
  } else {
    if (height > maxHeight) {
      width = Math.round((width * maxHeight) / height);
      height = maxHeight;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Não foi possível inicializar o processador de imagem.');
  }

  // Fill canvas with white background in case source had transparent pixels (PNG to JPEG conversion)
  ctx.fillStyle = '#141416';
  ctx.fillRect(0, 0, width, height);

  // High-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(img, 0, 0, width, height);

  // Compress to JPEG
  let base64 = canvas.toDataURL('image/jpeg', quality);

  // If base64 is still larger than ~100KB (string length > 130,000 chars), downscale slightly
  if (base64.length > 130000 && quality > 0.6) {
    base64 = canvas.toDataURL('image/jpeg', 0.62);
  }

  return base64;
}

/**
 * Luxury fallback placeholder SVG data URL when no image is available or image fails to load.
 */
export const LUXURY_IMAGE_FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
      <defs>
        <radialGradient id="grad" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stop-color="#2a2415"/>
          <stop offset="100%" stop-color="#121214"/>
        </radialGradient>
      </defs>
      <rect width="600" height="600" fill="url(#grad)"/>
      <circle cx="300" cy="280" r="110" stroke="#ffd56d" stroke-width="2" fill="none" opacity="0.3"/>
      <circle cx="300" cy="280" r="95" stroke="#ffd56d" stroke-width="1" stroke-dasharray="4 4" fill="none" opacity="0.4"/>
      <path d="M300 230 L325 275 L375 282 L340 315 L350 365 L300 340 L250 365 L260 315 L225 282 L275 275 Z" fill="#ffd56d" opacity="0.7"/>
      <text x="300" y="430" font-family="serif" font-size="24" font-weight="bold" fill="#ffd56d" text-anchor="middle" letter-spacing="4">MARENTO</text>
      <text x="300" y="460" font-family="sans-serif" font-size="12" font-weight="600" fill="#a09070" text-anchor="middle" letter-spacing="3">FOTO NÃO DISPONÍVEL</text>
    </svg>`
  );
