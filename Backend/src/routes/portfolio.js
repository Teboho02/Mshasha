import express from 'express';
import multer from 'multer';
import { db, storage } from '../firebase.js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import asyncHandler from '../middleware/asyncHandler.js';
import { handleFirestoreError } from '../middleware/errorHandler.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }
  }
  next(error);
};

// Image upload route
router.post('/upload', upload.array('images', 10), handleMulterError, asyncHandler(async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images uploaded'
      });
    }

    const uploadPromises = req.files.map(async (file) => {
      try {
        // Create a unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileExtension = file.originalname.split('.').pop();
        const filename = `portfolio/${timestamp}_${randomString}.${fileExtension}`;
        
        // Create storage reference
        const storageRef = ref(storage, filename);
        
        // Upload file to Firebase Storage
        const snapshot = await uploadBytes(storageRef, file.buffer, {
          contentType: file.mimetype
        });

        // Get the download URL
        const downloadURL = await getDownloadURL(snapshot.ref);

        return {
          success: true,
          originalName: file.originalname,
          filename: filename,
          url: downloadURL,
          size: file.size,
          contentType: file.mimetype,
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

    // Wait for all uploads to complete
    const uploadResults = await Promise.all(uploadPromises);

    // Separate successful and failed uploads
    const successfulUploads = uploadResults.filter(result => result.success);
    const failedUploads = uploadResults.filter(result => !result.success);

    if (successfulUploads.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'All image uploads failed',
        errors: failedUploads
      });
    }

    res.json({
      success: true,
      message: `Successfully uploaded ${successfulUploads.length} image(s)`,
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
      message: 'Error uploading images',
      error: error.message
    });
  }
}));

// Single image upload route
router.post('/upload-single', upload.single('image'), handleMulterError, asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image uploaded'
      });
    }

    const file = req.file;
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.originalname.split('.').pop();
    const filename = `portfolio/${timestamp}_${randomString}.${fileExtension}`;
    
    // Create storage reference
    const storageRef = ref(storage, filename);
    
    // Upload file to Firebase Storage
    const snapshot = await uploadBytes(storageRef, file.buffer, {
      contentType: file.mimetype
    });

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    const uploadResult = {
      originalName: file.originalname,
      filename: filename,
      url: downloadURL,
      size: file.size,
      contentType: file.mimetype,
      uploadedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: uploadResult
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading image',
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
      
      // Filter by category if specified
      if (!category || data.categoryId === category) {
        portfolio.push(data);
      }
    });
    
    // Sort by creation date (newest first)
    portfolio.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({
      success: true,
      data: portfolio
    });
  } catch (error) {
    handleFirestoreError(error, res);
  }
}));

// Add portfolio item (updated to handle image URLs from upload)
router.post('/', asyncHandler(async (req, res) => {
  try {
    const { categoryId, title, description, images } = req.body;
    
    if (!categoryId || !title || !description || !images || images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required and at least one image must be provided'
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
    
    const portfolioData = {
      categoryId,
      categoryName: categoryDoc.data().name,
      title,
      description,
      images: Array.isArray(images) ? images : [images], // Ensure images is an array
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
    const { title, description, images } = req.body;
    
    const updateData = {
      updatedAt: new Date().toISOString()
    };
    
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (images) updateData.images = images;
    
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