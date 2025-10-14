import { connectDB } from '@/lib/db/mongodb';
import Profile from '@/models/Profile';
import { verifyToken } from '@/lib/auth/jwt';
import { successResponse, errorResponse, sanitizeUrl, extractToken } from '@/lib/utils/api';

const ALLOWED_FIELDS = new Set([
  'fullName',
  'title',
  'bio',
  'location',
  'avatar',
  'socialLinks',
  'theme',
  'layout',
]);

function sanitizeSocialLinks(links) {
  if (!links || typeof links !== 'object') {
    return {};
  }

  const allowedLinks = ['github', 'linkedin', 'twitter', 'instagram', 'website', 'email'];
  return allowedLinks.reduce((acc, key) => {
    if (key in links && links[key] && typeof links[key] === 'string') {
      // Sanitize URLs to prevent XSS via javascript: protocol
      acc[key] = sanitizeUrl(links[key]);
    }
    return acc;
  }, {});
}

export async function POST(request) {
  try {
    const token = extractToken(request);
    if (!token) {
      return errorResponse('Unauthorized', 401);
    }

    const payload = verifyToken(token);
    if (!payload) {
      return errorResponse('Invalid token', 401);
    }

    const incomingData = await request.json();
    const updates = {};

    for (const [key, value] of Object.entries(incomingData)) {
      if (!ALLOWED_FIELDS.has(key)) {
        continue;
      }

      if (key === 'socialLinks') {
        updates.socialLinks = sanitizeSocialLinks(value);
      } else if (value !== undefined) {
        updates[key] = value;
      }
    }

    await connectDB();

    const updatedProfile = await Profile.findOneAndUpdate(
      { userId: payload.userId },
      { $set: updates },
      { new: true, lean: true }
    );

    if (!updatedProfile) {
      return errorResponse('Profile not found', 404);
    }

    return successResponse(
      {
        id: updatedProfile._id.toString(),
        userId: updatedProfile.userId.toString(),
        username: updatedProfile.username,
        fullName: updatedProfile.fullName,
        title: updatedProfile.title,
        bio: updatedProfile.bio,
        location: updatedProfile.location,
        avatar: updatedProfile.avatar,
        socialLinks: updatedProfile.socialLinks ?? {},
        theme: updatedProfile.theme,
        layout: updatedProfile.layout,
        createdAt: updatedProfile.createdAt,
        updatedAt: updatedProfile.updatedAt,
      },
      'Profile updated successfully'
    );
  } catch (error) {
    console.error('Profile update error:', error);
    return errorResponse('Internal server error', 500);
  }
}
