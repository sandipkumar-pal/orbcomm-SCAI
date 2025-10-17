import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { User } from '../models/index.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const TOKEN_TTL = '12h';

export const registerUser = async ({ email, password, role = 'business' }) => {
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw new Error('User already exists');
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password_hash: passwordHash, role });
  return {
    id: user.id,
    email: user.email,
    role: user.role
  };
};

export const authenticateUser = async ({ email, password }) => {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new Error('Invalid credentials');
  }
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw new Error('Invalid credentials');
  }
  const token = jwt.sign({ sub: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: TOKEN_TTL });
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    }
  };
};
