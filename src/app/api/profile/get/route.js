import { connectDB } from '@/lib/db/mongodb';
import Profile from '@/models/Profile';
import { verifyToken } from '@/lib/auth/jwt';
import { successResponse, errorResponse } from '@/lib/utils/api';

function extractToken(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

export async function GET(request) {
  try {
    const token = extractToken(request);
    if (!token) {
      return errorResponse('Unauthorized', 401);
    }

    const payload = verifyToken(token);
    if (!payload) {
      return errorResponse('Invalid token', 401);
    }

    await connectDB();

    const profile = await Profile.findOne({ userId: payload.userId }).lean();
    if (!profile) {
      return errorResponse('Profile not found', 404);
    }

    const profileData = {
      id: profile._id.toString(),
      userId: profile.userId.toString(),
      username: profile.username,
      fullName: profile.fullName,
      title: profile.title,
      bio: profile.bio,
      location: profile.location,
      avatar: profile.avatar,
      socialLinks: profile.socialLinks ?? {},
      theme: profile.theme,
      layout: profile.layout,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };

    return successResponse(profileData, 'Profile fetched successfully');
  } catch (error) {
    console.error('Profile fetch error:', error);
    return errorResponse('Internal server error', 500);
  }
}
