import express from 'express';
import multer from 'multer';
import { supabase, isInvalidId } from '../supabase.js';
import { storeMedia } from '../media.js';
import { requireAdmin } from '../auth.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { handleDatabaseError } from '../middleware/errorHandler.js';

const router = express.Router();

// Media arrays keep their API names; the database uses snake_case columns
const MEDIA_COLUMNS = {
  images: 'images',
  videos: 'videos',
  youtubeUrls: 'youtube_urls'
};

const toPortfolioItem = (row) => ({
  id: row.id,
  categoryId: row.category_id,
  categoryName: row.category_name,
  title: row.title,
  description: row.description,
  images: row.images,
  videos: row.videos,
  youtubeUrls: row.youtube_urls,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

// Fetch a portfolio row by id, treating a malformed id as not found
const findPortfolioRow = async (id) => {
  const { data, error } = await supabase.from('portfolio').select('*').eq('id', id).maybeSingle();
  if (error && !isInvalidId(error)) throw error;
  return data;
};

// Configure multer for file uploads (images and videos)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image or video
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed!'), false);
    }
  }
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 100MB.'
      });
    }
  }
  next(error);
};

// Helper function to convert YouTube URL to embed format
function convertToEmbedUrl(url) {
  if (!url) return null;
  
  // Already an embed URL
  if (url.includes('/embed/')) {
    return url;
  }
  
  // Regular YouTube URL
  if (url.includes('youtube.com/watch?v=')) {
    const videoId = url.split('v=')[1].split('&')[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }
  
  // YouTube short URL
  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1].split('?')[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }
  
  return url;
}

// Media upload route (handles both images and videos)
router.post('/upload', requireAdmin, upload.array('media', 10), handleMulterError, asyncHandler(async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No media files uploaded'
      });
    }

    // One file at a time so resizing several large photos can't exhaust the server's memory
    const uploadResults = [];
    for (const file of req.files) {
      try {
        uploadResults.push({ success: true, ...(await storeMedia(file)) });
      } catch (fileError) {
        uploadResults.push({
          success: false,
          originalName: file.originalname,
          error: fileError.message
        });
      }
    }

    const successfulUploads = uploadResults.filter(result => result.success);
    const failedUploads = uploadResults.filter(result => !result.success);

    if (successfulUploads.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'All media uploads failed',
        errors: failedUploads
      });
    }

    res.json({
      success: true,
      message: `Successfully uploaded ${successfulUploads.length} file(s)`,
      data: successfulUploads,
      ...(failedUploads.length > 0 && {
        warnings: {
          failedUploads: failedUploads.length,
          errors: failedUploads
        }
      })
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading media',
      error: error.message
    });
  }
}));

// Single media upload route
router.post('/upload-single', requireAdmin, upload.single('media'), handleMulterError, asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No media file uploaded'
      });
    }

    const uploadResult = await storeMedia(req.file);

    res.json({
      success: true,
      message: 'Media uploaded successfully',
      data: uploadResult
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading media',
      error: error.message
    });
  }
}));

// Get all portfolio items
router.get('/', asyncHandler(async (req, res) => {
  try {
    const { category } = req.query;

    // Newest first
    let query = supabase
      .from('portfolio')
      .select('*')
      .order('created_at', { ascending: false });

    if (category) query = query.eq('category_id', category);

    const { data, error } = await query;
    if (error && !isInvalidId(error)) throw error;

    res.json({
      success: true,
      data: (data || []).map(toPortfolioItem)
    });
  } catch (error) {
    handleDatabaseError(error, res);
  }
}));

// Add portfolio item with media (images, videos, and YouTube URLs)
router.post('/', requireAdmin, asyncHandler(async (req, res) => {
  try {
    const { categoryId, title, description, images, videos, youtubeUrls } = req.body;

    if (!categoryId || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Category ID, title, and description are required'
      });
    }

    // Verify at least one media type is provided
    const hasMedia = (images && images.length > 0) ||
                     (videos && videos.length > 0) ||
                     (youtubeUrls && youtubeUrls.length > 0);

    if (!hasMedia) {
      return res.status(400).json({
        success: false,
        message: 'At least one image, video, or YouTube URL must be provided'
      });
    }

    // Verify category exists
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('name')
      .eq('id', categoryId)
      .maybeSingle();
    if (categoryError && !isInvalidId(categoryError)) throw categoryError;

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category does not exist'
      });
    }

    // Process YouTube URLs to embed format
    const processedYoutubeUrls = youtubeUrls ?
      youtubeUrls.map(url => ({
        originalUrl: url,
        embedUrl: convertToEmbedUrl(url)
      })) : [];

    const { data, error } = await supabase
      .from('portfolio')
      .insert({
        category_id: categoryId,
        category_name: category.name,
        title,
        description,
        images: Array.isArray(images) ? images : (images ? [images] : []),
        videos: Array.isArray(videos) ? videos : (videos ? [videos] : []),
        youtube_urls: processedYoutubeUrls
      })
      .select()
      .single();
    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Portfolio item added successfully',
      data: toPortfolioItem(data)
    });
  } catch (error) {
    handleDatabaseError(error, res);
  }
}));

// Update portfolio item
router.put('/:id', requireAdmin, asyncHandler(async (req, res) => {
  try {
    const portfolioId = req.params.id;
    const { title, description, images, videos, youtubeUrls } = req.body;

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (images) updateData.images = images;
    if (videos) updateData.videos = videos;
    if (youtubeUrls) {
      updateData.youtube_urls = youtubeUrls.map(url => ({
        originalUrl: url,
        embedUrl: convertToEmbedUrl(url)
      }));
    }

    const { error } = await supabase.from('portfolio').update(updateData).eq('id', portfolioId);
    if (error) throw error;

    res.json({
      success: true,
      message: 'Portfolio item updated successfully'
    });
  } catch (error) {
    handleDatabaseError(error, res);
  }
}));

// Get specific portfolio item by ID
router.get('/:id', asyncHandler(async (req, res) => {
  try {
    const portfolioId = req.params.id;

    if (!portfolioId) {
      return res.status(400).json({
        success: false,
        message: 'Portfolio item ID is required'
      });
    }

    const row = await findPortfolioRow(portfolioId);

    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio item not found'
      });
    }

    res.json({
      success: true,
      data: toPortfolioItem(row)
    });
  } catch (error) {
    handleDatabaseError(error, res);
  }
}));

// Delete specific media item from portfolio
router.delete('/:id/media/:type/:index', requireAdmin, asyncHandler(async (req, res) => {
  try {
    const portfolioId = req.params.id;
    const mediaType = req.params.type; // 'images', 'videos', or 'youtubeUrls'
    const mediaIndex = parseInt(req.params.index);

    if (isNaN(mediaIndex) || mediaIndex < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid media index'
      });
    }

    if (!Object.keys(MEDIA_COLUMNS).includes(mediaType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid media type. Must be images, videos, or youtubeUrls'
      });
    }

    const row = await findPortfolioRow(portfolioId);

    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio item not found'
      });
    }

    const portfolioData = toPortfolioItem(row);
    const mediaArray = portfolioData[mediaType] || [];

    if (mediaIndex >= mediaArray.length) {
      return res.status(400).json({
        success: false,
        message: 'Media index out of range'
      });
    }

    mediaArray.splice(mediaIndex, 1);

    // Check if all media arrays are empty
    const images = mediaType === 'images' ? mediaArray : (portfolioData.images || []);
    const videos = mediaType === 'videos' ? mediaArray : (portfolioData.videos || []);
    const youtubeUrls = mediaType === 'youtubeUrls' ? mediaArray : (portfolioData.youtubeUrls || []);

    if (images.length === 0 && videos.length === 0 && youtubeUrls.length === 0) {
      const { error } = await supabase.from('portfolio').delete().eq('id', portfolioId);
      if (error) throw error;

      return res.json({
        success: true,
        message: 'Last media deleted. Portfolio item removed.',
        deletedItem: true
      });
    }

    const { error } = await supabase
      .from('portfolio')
      .update({
        [MEDIA_COLUMNS[mediaType]]: mediaArray,
        updated_at: new Date().toISOString()
      })
      .eq('id', portfolioId);
    if (error) throw error;

    res.json({
      success: true,
      message: `${mediaType.slice(0, -1)} deleted successfully`,
      data: {
        id: portfolioId,
        remainingMedia: {
          images: images.length,
          videos: videos.length,
          youtubeUrls: youtubeUrls.length
        }
      }
    });
  } catch (error) {
    handleDatabaseError(error, res);
  }
}));

// Delete portfolio item
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  try {
    const portfolioId = req.params.id;

    const { error } = await supabase.from('portfolio').delete().eq('id', portfolioId);
    if (error) throw error;

    res.json({
      success: true,
      message: 'Portfolio item deleted successfully'
    });
  } catch (error) {
    handleDatabaseError(error, res);
  }
}));

export default router;
