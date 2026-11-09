import express from 'express';
import { supabase } from '../supabase.js';
import { requireAdmin } from '../auth.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { handleDatabaseError } from '../middleware/errorHandler.js';

const router = express.Router();

const toHomePortfolioItem = (row) => ({
  id: row.id,
  category: row.category,
  title: row.title,
  description: row.description,
  image: row.image,
  galleryType: row.gallery_type,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

// Get home portfolio items
router.get('/', asyncHandler(async (req, res) => {
  try {
    // Newest first
    const { data, error } = await supabase
      .from('home_portfolio')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    res.json({
      success: true,
      data: data.map(toHomePortfolioItem)
    });
  } catch (error) {
    handleDatabaseError(error, res);
  }
}));

// Add home portfolio item
router.post('/', requireAdmin, asyncHandler(async (req, res) => {
  try {
    const { category, title, description, image, galleryType } = req.body;

    if (!category || !title || !description || !image) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const { data, error } = await supabase
      .from('home_portfolio')
      .insert({
        category,
        title,
        description,
        image,
        gallery_type: galleryType || category.toLowerCase().replace(/\s+/g, '-')
      })
      .select()
      .single();
    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Home portfolio item added successfully',
      data: toHomePortfolioItem(data)
    });
  } catch (error) {
    handleDatabaseError(error, res);
  }
}));

// Update home portfolio item
router.put('/:id', requireAdmin, asyncHandler(async (req, res) => {
  try {
    const itemId = req.params.id;
    const { category, title, description, image, galleryType } = req.body;

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (category) updateData.category = category;
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (image) updateData.image = image;
    if (galleryType) updateData.gallery_type = galleryType;

    const { error } = await supabase.from('home_portfolio').update(updateData).eq('id', itemId);
    if (error) throw error;

    res.json({
      success: true,
      message: 'Home portfolio item updated successfully'
    });
  } catch (error) {
    handleDatabaseError(error, res);
  }
}));

// Delete home portfolio item
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  try {
    const itemId = req.params.id;

    const { error } = await supabase.from('home_portfolio').delete().eq('id', itemId);
    if (error) throw error;

    res.json({
      success: true,
      message: 'Home portfolio item deleted successfully'
    });
  } catch (error) {
    handleDatabaseError(error, res);
  }
}));

export default router;
