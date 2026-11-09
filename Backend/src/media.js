import sharp from 'sharp';
import { uploadObject } from './s3.js';

// Photos are served straight to visitors, so store a web-sized copy instead of the camera original
const MAX_IMAGE_DIMENSION = 2560;
const WEBP_QUALITY = 82;

// Animated GIFs and SVGs would lose animation/vector data, so they are stored unchanged
const PASSTHROUGH_IMAGE_TYPES = new Set(['image/gif', 'image/svg+xml']);

// Keep memory low on the small server: one image at a time, no libvips cache
sharp.concurrency(1);
sharp.cache(false);

const uniqueName = () => `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

const optimizeImage = (buffer) => sharp(buffer)
  .rotate() // apply the camera's EXIF orientation before metadata is stripped
  .resize({ width: MAX_IMAGE_DIMENSION, height: MAX_IMAGE_DIMENSION, fit: 'inside', withoutEnlargement: true })
  .webp({ quality: WEBP_QUALITY })
  .toBuffer();

// Optimize (images) and upload one multer file to S3; returns the upload result the API reports
const storeMedia = async (file) => {
  const mediaType = file.mimetype.startsWith('image/') ? 'images' : 'videos';
  const optimize = mediaType === 'images' && !PASSTHROUGH_IMAGE_TYPES.has(file.mimetype);

  const body = optimize ? await optimizeImage(file.buffer) : file.buffer;
  const contentType = optimize ? 'image/webp' : file.mimetype;
  const extension = optimize ? 'webp' : file.originalname.split('.').pop();
  const filename = `portfolio/${mediaType}/${uniqueName()}.${extension}`;

  const url = await uploadObject(filename, body, contentType);

  return {
    originalName: file.originalname,
    filename,
    url,
    size: body.length,
    originalSize: file.size,
    contentType,
    mediaType,
    uploadedAt: new Date().toISOString()
  };
};

export { storeMedia };
