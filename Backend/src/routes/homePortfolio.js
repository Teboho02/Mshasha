import express from 'express';
import { db } from '../firebase.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import asyncHandler from '../middleware/asyncHandler.js';
import { handleFirestoreError } from '../middleware/errorHandler.js';

const router = express.Router();

// Get home portfolio items
router.get('/', asyncHandler(async (req, res) => {
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
router.post('/', asyncHandler(async (req, res) => {
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
router.put('/:id', asyncHandler(async (req, res) => {
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
router.delete('/:id', asyncHandler(async (req, res) => {
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

export default router;