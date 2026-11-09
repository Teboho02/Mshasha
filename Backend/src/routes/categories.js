import express from 'express';
import { supabase } from '../supabase.js';
import { requireAdmin } from '../auth.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { handleDatabaseError } from '../middleware/errorHandler.js';

const router = express.Router();

const toCategory = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  createdAt: row.created_at
});

// Get all categories
router.get('/', asyncHandler(async (req, res) => {
  try {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) throw error;

    const categories = {};

    data.forEach((row) => {
      categories[row.id] = toCategory(row);
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    handleDatabaseError(error, res);
  }
}));

// Create new category
router.post('/', requireAdmin, asyncHandler(async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: 'Name and description are required'
      });
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({ name, description })
      .select()
      .single();
    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: toCategory(data)
    });
  } catch (error) {
    handleDatabaseError(error, res);
  }
}));

// Delete category
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Portfolio items in this category are removed by the ON DELETE CASCADE foreign key
    const { error } = await supabase.from('categories').delete().eq('id', categoryId);
    if (error) throw error;

    res.json({
      success: true,
      message: 'Category and associated portfolio items deleted successfully'
    });
  } catch (error) {
    handleDatabaseError(error, res);
  }
}));

export default router;
