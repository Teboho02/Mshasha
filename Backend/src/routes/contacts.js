import express from 'express';
import { supabase } from '../supabase.js';
import { requireAdmin } from '../auth.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { handleDatabaseError } from '../middleware/errorHandler.js';

const router = express.Router();

const toContact = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  service: row.service,
  message: row.message,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

// Get all contact messages
router.get('/', requireAdmin, asyncHandler(async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    res.json({
      success: true,
      data: data.map(toContact)
    });
  } catch (error) {
    handleDatabaseError(error, res);
  }
}));

// Submit contact form
router.post('/', asyncHandler(async (req, res) => {
  try {
    const { name, email, phone, service, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    const { data, error } = await supabase
      .from('contacts')
      .insert({
        name,
        email,
        phone: phone || '',
        service: service || '',
        message,
        status: 'unread'
      })
      .select()
      .single();
    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Message sent successfully! We will get back to you soon.',
      data: toContact(data)
    });
  } catch (error) {
    handleDatabaseError(error, res);
  }
}));

// Update contact status (mark as read/unread)
router.patch('/:id/status', requireAdmin, asyncHandler(async (req, res) => {
  try {
    const contactId = req.params.id;
    const { status } = req.body;

    if (!status || !['read', 'unread'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required (read or unread)'
      });
    }

    const { error } = await supabase
      .from('contacts')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', contactId);
    if (error) throw error;

    res.json({
      success: true,
      message: 'Contact status updated successfully'
    });
  } catch (error) {
    handleDatabaseError(error, res);
  }
}));

// Delete contact message
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  try {
    const contactId = req.params.id;

    const { error } = await supabase.from('contacts').delete().eq('id', contactId);
    if (error) throw error;

    res.json({
      success: true,
      message: 'Contact message deleted successfully'
    });
  } catch (error) {
    handleDatabaseError(error, res);
  }
}));

export default router;
