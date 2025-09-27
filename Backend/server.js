import express from 'express';
import cors from 'cors';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";

const app = express();
const PORT = process.env.PORT || 3000;

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBRq8lvXWDQLpdeXL3oz59TBx38LvUPGRk",
  authDomain: "mshashazwinepe-8489d.firebaseapp.com",
  projectId: "mshashazwinepe-8489d",
  storageBucket: "mshashazwinepe-8489d.firebasestorage.app",
  messagingSenderId: "1020679564289",
  appId: "1:1020679564289:web:93a9c669415deeaf42a400"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Error handling middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Helper function to handle Firestore errors
const handleFirestoreError = (error, res) => {
  console.error('Firestore error:', error);
  res.status(500).json({ 
    success: false, 
    message: 'Database operation failed', 
    error: error.message 
  });
};

// ========================
// CATEGORY ROUTES
// ========================

// Get all categories
app.get('/api/categories', asyncHandler(async (req, res) => {
  try {
    const categoriesRef = collection(db, 'categories');
    const snapshot = await getDocs(categoriesRef);
    const categories = {};
    
    snapshot.forEach((doc) => {
      categories[doc.id] = {
        id: doc.id,
        ...doc.data()
      };
    });
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    handleFirestoreError(error, res);
  }
}));

// Create new category
app.post('/api/categories', asyncHandler(async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: 'Name and description are required'
      });
    }
    
    const categoryKey = name.toLowerCase().replace(/\s+/g, '-');
    const categoryData = {
      name,
      description,
      createdAt: new Date().toISOString()
    };
    
    const categoriesRef = collection(db, 'categories');
    const docRef = await addDoc(categoriesRef, categoryData);
    
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: {
        id: docRef.id,
        ...categoryData
      }
    });
  } catch (error) {
    handleFirestoreError(error, res);
  }
}));

// Delete category
app.delete('/api/categories/:id', asyncHandler(async (req, res) => {
  try {
    const categoryId = req.params.id;
    
    // Delete all portfolio items in this category first
    const portfolioRef = collection(db, 'portfolio');
    const portfolioSnapshot = await getDocs(portfolioRef);
    
    const deletePromises = [];
    portfolioSnapshot.forEach((doc) => {
      if (doc.data().categoryId === categoryId) {
        deletePromises.push(deleteDoc(doc.ref));
      }
    });
    
    await Promise.all(deletePromises);
    
    // Delete the category
    await deleteDoc(doc(db, 'categories', categoryId));
    
    res.json({
      success: true,
      message: 'Category and associated portfolio items deleted successfully'
    });
  } catch (error) {
    handleFirestoreError(error, res);
  }
}));

// ========================
// PORTFOLIO ROUTES
// ========================

// Get all portfolio items
app.get('/api/portfolio', asyncHandler(async (req, res) => {
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

// Add portfolio item
app.post('/api/portfolio', asyncHandler(async (req, res) => {
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
      images, // Array of base64 image strings
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
app.put('/api/portfolio/:id', asyncHandler(async (req, res) => {
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

// Delete portfolio item
app.delete('/api/portfolio/:id', asyncHandler(async (req, res) => {
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

// ========================
// FEATURED VIDEO ROUTES
// ========================

// Get featured video
app.get('/api/featured-video', asyncHandler(async (req, res) => {
  try {
    const videoDoc = await getDoc(doc(db, 'settings', 'featured-video'));
    
    if (!videoDoc.exists()) {
      // Return default video if none exists
      return res.json({
        success: true,
        data: {
          title: 'Featured Wedding Videography',
          url: 'https://www.youtube.com/embed/gEIzxwlfcAk',
          description: 'Experience the magic of our cinematography. We don\'t just capture moments, we create cinematic stories that you\'ll treasure forever.'
        }
      });
    }
    
    res.json({
      success: true,
      data: videoDoc.data()
    });
  } catch (error) {
    handleFirestoreError(error, res);
  }
}));

// Update featured video
app.put('/api/featured-video', asyncHandler(async (req, res) => {
  try {
    const { title, url, description } = req.body;
    
    if (!title || !url || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title, URL, and description are required'
      });
    }
    
    // Convert YouTube URL to embed format if needed
    let embedUrl = url;
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1].split('&')[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    }
    
    const videoData = {
      title,
      url: embedUrl,
      description,
      updatedAt: new Date().toISOString()
    };
    
    await updateDoc(doc(db, 'settings', 'featured-video'), videoData);
    
    res.json({
      success: true,
      message: 'Featured video updated successfully',
      data: videoData
    });
  } catch (error) {
    // If document doesn't exist, create it
    if (error.code === 'not-found') {
      try {
        await addDoc(collection(db, 'settings'), {
          ...videoData,
          createdAt: new Date().toISOString()
        });
        
        res.json({
          success: true,
          message: 'Featured video created successfully',
          data: videoData
        });
      } catch (createError) {
        handleFirestoreError(createError, res);
      }
    } else {
      handleFirestoreError(error, res);
    }
  }
}));

// ========================
// HOME PORTFOLIO ROUTES
// ========================

// Get home portfolio items
app.get('/api/home-portfolio', asyncHandler(async (req, res) => {
  try {
    const homePortfolioRef = collection(db, 'home-portfolio');
    const snapshot = await getDocs(homePortfolioRef);
    const items = [];
    
    snapshot.forEach((doc) => {
      items.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Sort by creation date (newest first)
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    handleFirestoreError(error, res);
  }
}));

// Add home portfolio item
app.post('/api/home-portfolio', asyncHandler(async (req, res) => {
  try {
    const { category, title, description, image, galleryType } = req.body;
    
    if (!category || !title || !description || !image) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
    const homePortfolioData = {
      category,
      title,
      description,
      image,
      galleryType: galleryType || category.toLowerCase().replace(/\s+/g, '-'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const homePortfolioRef = collection(db, 'home-portfolio');
    const docRef = await addDoc(homePortfolioRef, homePortfolioData);
    
    res.status(201).json({
      success: true,
      message: 'Home portfolio item added successfully',
      data: {
        id: docRef.id,
        ...homePortfolioData
      }
    });
  } catch (error) {
    handleFirestoreError(error, res);
  }
}));

// Update home portfolio item
app.put('/api/home-portfolio/:id', asyncHandler(async (req, res) => {
  try {
    const itemId = req.params.id;
    const { category, title, description, image, galleryType } = req.body;
    
    const updateData = {
      updatedAt: new Date().toISOString()
    };
    
    if (category) updateData.category = category;
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (image) updateData.image = image;
    if (galleryType) updateData.galleryType = galleryType;
    
    await updateDoc(doc(db, 'home-portfolio', itemId), updateData);
    
    res.json({
      success: true,
      message: 'Home portfolio item updated successfully'
    });
  } catch (error) {
    handleFirestoreError(error, res);
  }
}));

// Delete home portfolio item
app.delete('/api/home-portfolio/:id', asyncHandler(async (req, res) => {
  try {
    const itemId = req.params.id;
    
    await deleteDoc(doc(db, 'home-portfolio', itemId));
    
    res.json({
      success: true,
      message: 'Home portfolio item deleted successfully'
    });
  } catch (error) {
    handleFirestoreError(error, res);
  }
}));

// ========================
// STATS ROUTE
// ========================

// Get dashboard statistics
app.get('/api/stats', asyncHandler(async (req, res) => {
  try {
    // Get categories count
    const categoriesSnapshot = await getDocs(collection(db, 'categories'));
    const categoriesCount = categoriesSnapshot.size;
    
    // Get portfolio items count
    const portfolioSnapshot = await getDocs(collection(db, 'portfolio'));
    const portfolioCount = portfolioSnapshot.size;
    
    // Get home portfolio items count
    const homePortfolioSnapshot = await getDocs(collection(db, 'home-portfolio'));
    const homePortfolioCount = homePortfolioSnapshot.size;
    
    // Check if featured video exists
    const videoDoc = await getDoc(doc(db, 'settings', 'featured-video'));
    const hasFeaturedVideo = videoDoc.exists();
    
    res.json({
      success: true,
      data: {
        categories: categoriesCount,
        portfolioItems: portfolioCount,
        homePortfolioItems: homePortfolioCount,
        featuredVideos: hasFeaturedVideo ? 1 : 0
      }
    });
  } catch (error) {
    handleFirestoreError(error, res);
  }
}));

// ========================
// HEALTH CHECK ROUTE
// ========================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Mshasha Zwinepe Photography API is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString()
  });
});

// ========================
// ERROR HANDLING MIDDLEWARE
// ========================

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Mshasha Zwinepe Photography API is listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

export default app;