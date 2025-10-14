import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/models/User';
import Profile from '@/models/Profile';
import { hashPassword } from '@/lib/auth/hash';
import { generateToken } from '@/lib/auth/jwt';
import { successResponse, errorResponse, validateUsername, validateEmail } from '@/lib/utils/api';

export async function POST(request) {
  try {
    const { username, email, password } = await request.json();

    // Validation
    if (!username || !email || !password) {
      return errorResponse('All fields are required');
    }

    if (!validateUsername(username)) {
      return errorResponse('Username must be 3-30 characters and can only contain lowercase letters, numbers, hyphens, and underscores');
    }

    if (!validateEmail(email)) {
      return errorResponse('Invalid email format');
    }

    if (password.length < 6) {
      return errorResponse('Password must be at least 6 characters');
    }

    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return errorResponse('User with this email or username already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    // Create profile
    await Profile.create({
      userId: user._id,
      username: user.username,
      fullName: user.username,
      title: '',
      bio: '',
    });

    // Generate token
    // const token = generateToken({
    //   userId: user._id.toString(),
    //   username: user.username,
    //   email: user.email,
    // });

    return successResponse({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
      // token,
    }, 'User registered successfully');
  } catch (error) {
    console.error('Registration error:', error);
    return errorResponse('Internal server error', 500);
  }
}