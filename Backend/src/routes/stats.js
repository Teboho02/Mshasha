import express from 'express';
import { db } from '../firebase.js';
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import asyncHandler from '../middleware/asyncHandler.js';
import { handleFirestoreError } from '../middleware/errorHandler.js';

const router = express.Router();

// Get dashboard statistics
router.get('/', asyncHandler(async (req, res) => {
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

export default router;