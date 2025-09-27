import express from 'express';
import { db } from '../firebase.js';
import { collection, addDoc, getDocs, doc, deleteDoc, getDoc } from "firebase/firestore";
import asyncHandler from '../middleware/asyncHandler.js';
import { handleFirestoreError } from '../middleware/errorHandler.js';

const router = express.Router();

// Get all categories
router.get('/', asyncHandler(async (req, res) => {
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
router.post('/', asyncHandler(async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: 'Name and description are required'
      });
    }
    
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
router.delete('/:id', asyncHandler(async (req, res) => {
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

export default router;