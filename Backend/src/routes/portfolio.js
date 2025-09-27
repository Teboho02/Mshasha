import express from 'express';
import { db } from '../firebase.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import asyncHandler from '../middleware/asyncHandler.js';
import { handleFirestoreError } from '../middleware/errorHandler.js';

const router = express.Router();

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

// Add portfolio item
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
      images,
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