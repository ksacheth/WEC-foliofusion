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

    const { type, title, items = [] } = await request.json();

    if (!type || !title) {
      return errorResponse('Section type and title are required');
    }

    if (!Array.isArray(items)) {
      return errorResponse('Items must be an array');
    }

    await connectDB();

    const section = await Section.create({
      userId: payload.userId,
      type,
      title,
      items,
    });

    return successResponse(
      {
        _id: section._id.toString(),
        userId: section.userId.toString(),
        type: section.type,
        title: section.title,
        items: section.items,
        visible: section.visible,
        createdAt: section.createdAt,
        updatedAt: section.updatedAt,
      },
      'Section created successfully'
    );
  } catch (error) {
    console.error('Section create error:', error);
    return errorResponse('Internal server error', 500);
  }
}
