import express from 'express';
import { db } from '../firebase.js';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, query, orderBy } from "firebase/firestore";
import asyncHandler from '../middleware/asyncHandler.js';
import { handleFirestoreError } from '../middleware/errorHandler.js';

const router = express.Router();

// Get all contact messages
router.get('/', asyncHandler(async (req, res) => {
  try {
    const contactsRef = collection(db, 'contacts');
    const q = query(contactsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const contacts = [];
    
    snapshot.forEach((doc) => {
      contacts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json({
      success: true,
      data: contacts
    });
  } catch (error) {
    handleFirestoreError(error, res);
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
    
    const contactData = {
      name,
      email,
      phone: phone || '',
      service: service || '',
      message,
      status: 'unread',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const contactsRef = collection(db, 'contacts');
    const docRef = await addDoc(contactsRef, contactData);
    
    res.status(201).json({
      success: true,
      message: 'Message sent successfully! We will get back to you soon.',
      data: {
        id: docRef.id,
        ...contactData
      }
    });
  } catch (error) {
    handleFirestoreError(error, res);
  }
}));

// Update contact status (mark as read/unread)
router.patch('/:id/status', asyncHandler(async (req, res) => {
  try {
    const contactId = req.params.id;
    const { status } = req.body;
    
    if (!status || !['read', 'unread'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required (read or unread)'
      });
    }
    
    await updateDoc(doc(db, 'contacts', contactId), {
      status,
      updatedAt: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Contact status updated successfully'
    });
  } catch (error) {
    handleFirestoreError(error, res);
  }
}));

// Delete contact message
router.delete('/:id', asyncHandler(async (req, res) => {
  try {
    const contactId = req.params.id;
    
    await deleteDoc(doc(db, 'contacts', contactId));
    
    res.json({
      success: true,
      message: 'Contact message deleted successfully'
    });
  } catch (error) {
    handleFirestoreError(error, res);
  }
}));

export default router;