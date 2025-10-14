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

export async function PATCH(request) {
  try {
    const token = extractToken(request);
    if (!token) {
      return errorResponse('Unauthorized', 401);
    }

    const payload = verifyToken(token);
    if (!payload) {
      return errorResponse('Invalid token', 401);
    }

    const body = await request.json();
    const { id, items } = body;

    if (!id) {
      return errorResponse('Section id is required', 400);
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid section id', 400);
    }

    if (items !== undefined && !Array.isArray(items)) {
      return errorResponse('Items must be an array', 400);
    }

    await connectDB();

    const section = await Section.findOne({
      _id: id,
      userId: payload.userId,
    });

    if (!section) {
      return errorResponse('Section not found', 404);
    }

    if (items !== undefined) {
      section.items = items;
    }

    await section.save();

    return successResponse(
      {
        _id: section._id.toString(),
        userId: section.userId.toString(),
        type: section.type,
        title: section.title,
        items: Array.isArray(section.items) ? section.items : [],
        createdAt: section.createdAt,
        updatedAt: section.updatedAt,
      },
      'Section updated successfully'
    );
  } catch (error) {
    console.error('Section update error:', error);
    return errorResponse('Internal server error', 500);
  }
}
