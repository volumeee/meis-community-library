import { TRANSLATIONS } from '../i18n/translations';
import { useLocaleStore } from '../store/useLocaleStore';
import { MAX_COVER_DATA_URL_LENGTH } from './libraryLogic';

const ALLOWED_IMAGE_TYPES: Record<string, true> = {
  'image/jpeg': true,
  'image/jpg': true,
  'image/png': true,
  'image/webp': true,
};
const ALLOWED_EXT_REGEX = /\.(jpe?g|png|webp)$/i;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB raw file limit
const MAX_IMAGE_PIXELS = 25_000_000;
const TARGET_MAX_WIDTH = 480;
const TARGET_MAX_HEIGHT = 640;

function getPhotoErrors() {
  return TRANSLATIONS[useLocaleStore.getState().locale].bookForm.photoErrors;
}

export async function processCoverImageFile(file: File): Promise<string> {
  const errors = getPhotoErrors();
  const hasAllowedMime = file.type
    ? Boolean(ALLOWED_IMAGE_TYPES[file.type.toLowerCase()])
    : false;
  const hasAllowedExt = ALLOWED_EXT_REGEX.test(file.name);
  if (!hasAllowedMime && !(file.type === '' && hasAllowedExt)) {
    throw new Error(errors.unsupportedType);
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(errors.fileTooLarge);
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(errors.invalidImage));
      image.src = objectUrl;
    });

    if (img.naturalWidth < 1 || img.naturalHeight < 1) {
      throw new Error(errors.invalidImage);
    }
    if (img.naturalWidth * img.naturalHeight > MAX_IMAGE_PIXELS) {
      throw new Error(errors.dimensionsTooLarge);
    }

    const scale = Math.min(
      1,
      TARGET_MAX_WIDTH / img.naturalWidth,
      TARGET_MAX_HEIGHT / img.naturalHeight
    );
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error(errors.encodingFailed);
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    let compressed = canvas.toDataURL('image/jpeg', 0.82);
    if (compressed.length > MAX_COVER_DATA_URL_LENGTH) {
      compressed = canvas.toDataURL('image/jpeg', 0.65);
    }
    if (!compressed.startsWith('data:image/jpeg;base64,')) {
      throw new Error(errors.encodingFailed);
    }
    if (compressed.length > MAX_COVER_DATA_URL_LENGTH) {
      throw new Error(errors.tooLargeAfterCompression);
    }

    return compressed;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
