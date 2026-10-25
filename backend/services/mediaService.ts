// Browser se aayi image data URLs (FileReader.readAsDataURL) ko validate karta hai.
// Sirf raster image subtypes allow hain — koi bhi data:text/html ya data:application
// allowed nahi, taaki uploaded payload kabhi markup ki tarah render na ho.
const RASTER_IMAGE_DATA_URL = /^data:image\/(?:jpeg|jpg|png|webp|gif|bmp|avif|heic|heif);base64,[A-Za-z0-9+/]+={0,2}$/i;

export function isRasterImageDataUrl(value: unknown): value is string {
  return typeof value === 'string' && RASTER_IMAGE_DATA_URL.test(value);
}
