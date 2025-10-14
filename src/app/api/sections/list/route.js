import { connectDB } from '@/lib/db/mongodb';
import Section from '@/models/Section';
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

    const sections = await Section.find({ userId: payload.userId })
      .sort({ createdAt: 1 })
      .lean();

    const data = sections.map((section) => ({
      _id: section._id.toString(),
      userId: section.userId.toString(),
      type: section.type,
      title: section.title,
      items: Array.isArray(section.items) ? section.items : [],
      createdAt: section.createdAt,
      updatedAt: section.updatedAt,
    }));

    return successResponse(data, 'Sections fetched successfully');
  } catch (error) {
    console.error('Sections list error:', error);
    return errorResponse('Internal server error', 500);
  }
}
