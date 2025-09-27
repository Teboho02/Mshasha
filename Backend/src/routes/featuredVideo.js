import express from 'express';
import { db } from '../firebase.js';
import { doc, getDoc, updateDoc, addDoc, collection } from "firebase/firestore";
import asyncHandler from '../middleware/asyncHandler.js';
import { handleFirestoreError } from '../middleware/errorHandler.js';

const router = express.Router();

// Get featured video
router.get('/', asyncHandler(async (req, res) => {
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
router.put('/', asyncHandler(async (req, res) => {
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
          id: 'featured-video',
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

export default router;  