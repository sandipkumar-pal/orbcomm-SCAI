import { Router } from 'express';
import { authenticateUser, registerUser } from '../services/authService.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authenticateUser({ email, password });
    res.json(result);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});

router.post('/register', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    if (role && !['admin', 'analyst', 'business'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const user = await registerUser({ email, password, role });
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
