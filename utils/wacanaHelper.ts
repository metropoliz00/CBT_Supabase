
/**
 * Helper utilities for detecting, parsing, and formatting
 * Media (Image URL / Base64) vs Teks Wacana (Reading Passages/Stimulus)
 */

export interface ParsedWacana {
  title: string;
  paragraphs: string[];
}

/**
 * Detects whether a given string is an image (URL, Base64, or Blob)
 * or a text passage (Wacana / Cerita).
 */
export const isImageMedia = (val?: string): boolean => {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed) return false;

  // Base64 Data URL or Blob URL
  if (trimmed.startsWith('data:image/')) return true;
  if (trimmed.startsWith('blob:')) return true;

  // HTTP or HTTPS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // If it contains newlines or spaces, it's text containing a URL rather than an image link
    if (trimmed.includes('\n') || /\s/.test(trimmed)) {
      return false;
    }
    return true;
  }

  return false;
};

/**
 * Parses raw text into a title and paragraphs.
 * Rules:
 * - The first non-empty line (or line prefixed with Judul: / #) is the Title.
 * - Remaining lines or blocks are the Paragraphs.
 */
export const parseWacana = (text: string): ParsedWacana => {
  if (!text || typeof text !== 'string') return { title: '', paragraphs: [] };
  const trimmed = text.trim();
  if (!trimmed) return { title: '', paragraphs: [] };

  const rawLines = trimmed.split('\n').map(l => l.trim());
  const nonEmptyLines = rawLines.filter(l => l.length > 0);

  if (nonEmptyLines.length === 0) {
    return { title: '', paragraphs: [] };
  }

  // Check if first line is a title
  let title = nonEmptyLines[0];
  if (title.toLowerCase().startsWith('judul:')) {
    title = title.substring(6).trim();
  } else if (title.startsWith('#')) {
    title = title.replace(/^#+\s*/, '').trim();
  }

  // If there's only 1 line and it's long (> 90 chars), treat it as a body paragraph rather than a title
  if (nonEmptyLines.length === 1 && title.length > 90) {
    return {
      title: '',
      paragraphs: [title]
    };
  }

  // If only 1 line and short, treat as title
  if (nonEmptyLines.length === 1) {
    return {
      title,
      paragraphs: []
    };
  }

  // Multiple lines: first line is title, the rest are paragraphs
  // Split remaining text by double newlines or single newlines into paragraphs
  const firstLineIdx = rawLines.findIndex(l => l.length > 0);
  const remainingRaw = rawLines.slice(firstLineIdx + 1).join('\n');

  const rawParagraphs = remainingRaw
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const paragraphs = rawParagraphs.length > 0
    ? rawParagraphs
    : nonEmptyLines.slice(1);

  return {
    title,
    paragraphs
  };
};

/**
 * Converts an image file to a base64 Data URL with automatic dimension scaling
 * to ensure high performance and prevent database bloat.
 */
export const fileToBase64 = (
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.85
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File yang dipilih bukan gambar.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const result = reader.result as string;
      if (!result) {
        reject(new Error('Data gambar kosong.'));
        return;
      }

      // Preserve SVGs or lightweight GIFs as raw
      if (file.type === 'image/svg+xml' || (file.type === 'image/gif' && file.size < 400 * 1024)) {
        resolve(result);
        return;
      }

      const img = new Image();
      img.onerror = () => resolve(result); // Fallback to raw base64
      img.onload = () => {
        let { width, height } = img;

        // If image is already smaller than max bounds and small in size, use as is
        if (width <= maxWidth && height <= maxHeight && file.size < 300 * 1024) {
          resolve(result);
          return;
        }

        // Calculate aspect ratio scale
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const compressedDataUrl = canvas.toDataURL(mimeType, quality);
        resolve(compressedDataUrl);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
};
