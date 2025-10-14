import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/models/User';
import { verifyPassword } from '@/lib/auth/hash';
import { generateToken } from '@/lib/auth/jwt';
import { successResponse, errorResponse } from '@/lib/utils/api';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return errorResponse('Email and password are required');
    }

    await connectDB();

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return errorResponse('Invalid credentials', 401);
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return errorResponse('Invalid credentials', 401);
    }

    // Generate token
    const token = generateToken({
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
    });

    return successResponse({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
      token,
    }, 'Login successful');
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('Internal server error', 500);
  }
}