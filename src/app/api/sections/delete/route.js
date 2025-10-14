import mongoose from 'mongoose';
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

export async function DELETE(request) {
  try {
    const token = extractToken(request);
    if (!token) {
      return errorResponse('Unauthorized', 401);
    }

    const payload = verifyToken(token);
    if (!payload) {
      return errorResponse('Invalid token', 401);
    }

    const { searchParams } = request.nextUrl;
    const sectionId = searchParams.get('id');

    if (!sectionId) {
      return errorResponse('Section id is required', 400);
    }

    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      return errorResponse('Invalid section id', 400);
    }

    await connectDB();

    const section = await Section.findOneAndDelete({
      _id: sectionId,
      userId: payload.userId,
    });

    if (!section) {
      return errorResponse('Section not found', 404);
    }

    return successResponse(
      {
        _id: section._id.toString(),
        userId: section.userId.toString(),
        type: section.type,
        title: section.title,
        items: section.items,
      },
      'Section deleted successfully'
    );
  } catch (error) {
    console.error('Section delete error:', error);
    return errorResponse('Internal server error', 500);
  }
}
