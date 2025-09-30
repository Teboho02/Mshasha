import express from 'express';
import multer from 'multer';
import { db, storage } from '../firebase.js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import asyncHandler from '../middleware/asyncHandler.js';
import { handleFirestoreError } from '../middleware/errorHandler.js';

const router = express.Router();

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
router.post('/upload', upload.array('media', 10), handleMulterError, asyncHandler(async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No media files uploaded'
      });
    }

    const uploadPromises = req.files.map(async (file) => {
      try {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileExtension = file.originalname.split('.').pop();
        const mediaType = file.mimetype.startsWith('image/') ? 'images' : 'videos';
        const filename = `portfolio/${mediaType}/${timestamp}_${randomString}.${fileExtension}`;
        
        const storageRef = ref(storage, filename);
        
        const snapshot = await uploadBytes(storageRef, file.buffer, {
          contentType: file.mimetype
        });

        const downloadURL = await getDownloadURL(snapshot.ref);

        return {
          success: true,
          originalName: file.originalname,
          filename: filename,
          url: downloadURL,
          size: file.size,
          contentType: file.mimetype,
          mediaType: mediaType,
          uploadedAt: new Date().toISOString()
        };
      } catch (fileError) {
        return {
          success: false,
          originalName: file.originalname,
          error: fileError.message
        };
      }
    });

    const uploadResults = await Promise.all(uploadPromises);
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
router.post('/upload-single', upload.single('media'), handleMulterError, asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No media file uploaded'
      });
    }

    const file = req.file;
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.originalname.split('.').pop();
    const mediaType = file.mimetype.startsWith('image/') ? 'images' : 'videos';
    const filename = `portfolio/${mediaType}/${timestamp}_${randomString}.${fileExtension}`;
    
    const storageRef = ref(storage, filename);
    
    const snapshot = await uploadBytes(storageRef, file.buffer, {
      contentType: file.mimetype
    });

    const downloadURL = await getDownloadURL(snapshot.ref);
    
    const uploadResult = {
      originalName: file.originalname,
      filename: filename,
      url: downloadURL,
      size: file.size,
      contentType: file.mimetype,
      mediaType: mediaType,
      uploadedAt: new Date().toISOString()
    };

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
    
    const portfolioRef = collection(db, 'portfolio');
    const snapshot = await getDocs(portfolioRef);
    const portfolio = [];
    
    snapshot.forEach((doc) => {
      const data = {
        id: doc.id,
        ...doc.data()
      };
      
      if (!category || data.categoryId === category) {
        portfolio.push(data);
      }
    });
    
    portfolio.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({
      success: true,
      data: portfolio
    });
  } catch (error) {
    handleFirestoreError(error, res);
  }
}));

// Add portfolio item with media (images, videos, and YouTube URLs)
router.post('/', asyncHandler(async (req, res) => {
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
    const categoryDoc = await getDoc(doc(db, 'categories', categoryId));
    if (!categoryDoc.exists()) {
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
    
    const portfolioData = {
      categoryId,
      categoryName: categoryDoc.data().name,
      title,
      description,
      images: Array.isArray(images) ? images : (images ? [images] : []),
      videos: Array.isArray(videos) ? videos : (videos ? [videos] : []),
      youtubeUrls: processedYoutubeUrls,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const portfolioRef = collection(db, 'portfolio');
    const docRef = await addDoc(portfolioRef, portfolioData);
    
    res.status(201).json({
      success: true,
      message: 'Portfolio item added successfully',
      data: {
        id: docRef.id,
        ...portfolioData
      }
    });
  } catch (error) {
    handleFirestoreError(error, res);
  }
}));

// Update portfolio item
router.put('/:id', asyncHandler(async (req, res) => {
  try {
    const portfolioId = req.params.id;
    const { title, description, images, videos, youtubeUrls } = req.body;
    
    const updateData = {
      updatedAt: new Date().toISOString()
    };
    
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (images) updateData.images = images;
    if (videos) updateData.videos = videos;
    if (youtubeUrls) {
      updateData.youtubeUrls = youtubeUrls.map(url => ({
        originalUrl: url,
        embedUrl: convertToEmbedUrl(url)
      }));
    }
    
    await updateDoc(doc(db, 'portfolio', portfolioId), updateData);
    
    res.json({
      success: true,
      message: 'Portfolio item updated successfully'
    });
  } catch (error) {
    handleFirestoreError(error, res);
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
    
    const portfolioRef = doc(db, 'portfolio', portfolioId);
    const portfolioDoc = await getDoc(portfolioRef);
    
    if (!portfolioDoc.exists()) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio item not found'
      });
    }
    
    const portfolioData = {
      id: portfolioDoc.id,
      ...portfolioDoc.data()
    };
    
    res.json({
      success: true,
      data: portfolioData
    });
  } catch (error) {
    handleFirestoreError(error, res);
  }
}));

// Delete specific media item from portfolio
router.delete('/:id/media/:type/:index', asyncHandler(async (req, res) => {
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
    
    if (!['images', 'videos', 'youtubeUrls'].includes(mediaType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid media type. Must be images, videos, or youtubeUrls'
      });
    }
    
    const portfolioRef = doc(db, 'portfolio', portfolioId);
    const portfolioDoc = await getDoc(portfolioRef);
    
    if (!portfolioDoc.exists()) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio item not found'
      });
    }
    
    const portfolioData = portfolioDoc.data();
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
      await deleteDoc(portfolioRef);
      return res.json({
        success: true,
        message: 'Last media deleted. Portfolio item removed.',
        deletedItem: true
      });
    }
    
    await updateDoc(portfolioRef, {
      [mediaType]: mediaArray,
      updatedAt: new Date().toISOString()
    });
    
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
    handleFirestoreError(error, res);
  }
}));

// Delete portfolio item
router.delete('/:id', asyncHandler(async (req, res) => {
  try {
    const portfolioId = req.params.id;
    
    await deleteDoc(doc(db, 'portfolio', portfolioId));
    
    res.json({
      success: true,
      message: 'Portfolio item deleted successfully'
    });
  } catch (error) {
    handleFirestoreError(error, res);
  }
}));

export default router;