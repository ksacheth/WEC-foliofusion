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

module.exports = {
  successResponse,
  errorResponse,
  validateUsername,
  validateEmail,
};