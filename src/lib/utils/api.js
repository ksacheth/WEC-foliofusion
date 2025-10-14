const { NextResponse } = require('next/server');

function successResponse(data, message) {
  return NextResponse.json({
    success: true,
    data,
    message,
  });
}

function errorResponse(error, statusCode = 400) {
  return NextResponse.json({
    success: false,
    error,
  }, { status: statusCode });
}

function validateUsername(username) {
  const usernameRegex = /^[a-z0-9_-]{3,30}$/;
  return usernameRegex.test(username);
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') {
    return '';
  }
  
  const trimmedUrl = url.trim();
  
  // Only allow safe protocols (whitelist approach)
  const safeProtocols = /^(https?:|mailto:)/i;
  
  // If URL has a protocol, ensure it's safe
  if (trimmedUrl.includes(':')) {
    if (!safeProtocols.test(trimmedUrl)) {
      return '';
    }
  }
  
  return trimmedUrl;
}

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

module.exports = {
  successResponse,
  errorResponse,
  validateUsername,
  validateEmail,
  sanitizeUrl,
  extractToken,
};