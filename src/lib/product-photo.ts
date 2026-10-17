export const PHOTO_URL_PREFIX = "/api/public/product-image/";

/** Storage file name for a product photo URL, or null if the photo isn't in our folder. */
export function photoPath(url: string | null | undefined): string | null {
  if (!url || !url.startsWith(PHOTO_URL_PREFIX)) return null;
  return url.slice(PHOTO_URL_PREFIX.length) || null;
}

/** Old photo to delete after saving a product, or null when nothing should be deleted. */
export function photoToDeleteOnSave(oldUrl: string | null | undefined, newUrl: string | null | undefined): string | null {
  if ((oldUrl ?? "") === (newUrl ?? "")) return null;
  return photoPath(oldUrl);
}
