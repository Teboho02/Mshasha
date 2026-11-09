import express from 'express';
import { supabase } from '../supabase.js';
import { requireAdmin } from '../auth.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { handleDatabaseError } from '../middleware/errorHandler.js';

const router = express.Router();

// Count rows without fetching them
const countRows = async (table, filter) => {
  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  if (filter) query = filter(query);

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
};

// Get dashboard statistics
router.get('/', requireAdmin, asyncHandler(async (req, res) => {
  try {
    const [
      categoriesCount,
      portfolioCount,
      homePortfolioCount,
      featuredVideoCount,
      contactsCount,
      unreadCount
    ] = await Promise.all([
      countRows('categories'),
      countRows('portfolio'),
      countRows('home_portfolio'),
      countRows('settings', (q) => q.eq('key', 'featured-video')),
      countRows('contacts'),
      countRows('contacts', (q) => q.eq('status', 'unread'))
    ]);

    res.json({
      success: true,
      data: {
        categories: categoriesCount,
        portfolioItems: portfolioCount,
        homePortfolioItems: homePortfolioCount,
        featuredVideos: featuredVideoCount > 0 ? 1 : 0,
        totalMessages: contactsCount,
        unreadMessages: unreadCount
      }
    });
  } catch (error) {
    handleDatabaseError(error, res);
  }
}));

export default router;
