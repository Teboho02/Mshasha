import express from 'express';
import { supabase } from '../supabase.js';
import { requireAdmin } from '../auth.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { handleDatabaseError } from '../middleware/errorHandler.js';

const router = express.Router();

const FEATURED_VIDEO_KEY = 'featured-video';

// Get featured video
router.get('/', asyncHandler(async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', FEATURED_VIDEO_KEY)
      .maybeSingle();
    if (error) throw error;

    if (!data) {
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
      data: data.value
    });
  } catch (error) {
    handleDatabaseError(error, res);
  }
}));

// Create or update featured video
router.put('/', requireAdmin, asyncHandler(async (req, res) => {
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

    const { error } = await supabase
      .from('settings')
      .upsert({ key: FEATURED_VIDEO_KEY, value: videoData, updated_at: videoData.updatedAt });
    if (error) throw error;

    res.json({
      success: true,
      message: 'Featured video updated successfully',
      data: videoData
    });
  } catch (error) {
    handleDatabaseError(error, res);
  }
}));

export default router;
