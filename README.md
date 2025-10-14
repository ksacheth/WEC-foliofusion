# FolioFusion

A modern portfolio builder powered by Next.js 15, React 19, and MongoDB. Create and customize your professional portfolio with ease.

## Features

- 🚀 Built with Next.js 15 and React 19
- 💾 MongoDB database integration
- 🔐 JWT-based authentication
- 🎨 Multiple themes and layouts
- 📱 Responsive design
- ✨ Dynamic sections (Projects, Experience, Education, Skills, etc.)
- 🔗 Social media integration

## Prerequisites

- Node.js 18.x or higher
- MongoDB instance (local or cloud)

## Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Configure the required environment variables in `.env`:

   - **MONGODB_URI**: Your MongoDB connection string
     - Local: `mongodb://localhost:27017/portfolio`
     - Cloud: Use MongoDB Atlas or your hosted instance URL
   
   - **JWT_SECRET**: A strong secret key for JWT token signing
     - Generate a secure secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
     - **IMPORTANT**: Never commit this to version control

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Ensure MongoDB is running (if using local instance):
   ```bash
   # For local MongoDB installation
   mongod
   ```

## Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/              # Next.js app directory
│   ├── api/         # API routes
│   ├── auth/        # Authentication pages
│   ├── dashboard/   # User dashboard
│   └── profile/     # Public portfolio pages
├── lib/             # Utility libraries
│   ├── auth/        # Authentication utilities
│   ├── db/          # Database connection
│   └── utils/       # Helper functions
└── models/          # MongoDB models
```

## API Routes

- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/profile/get` - Get user profile
- `POST /api/profile/update` - Update profile
- `GET /api/sections/list` - List all sections
- `POST /api/sections/create` - Create new section
- `PATCH /api/sections/update` - Update section
- `DELETE /api/sections/delete` - Delete section

## Security Notes

- JWT tokens are required for protected routes
- Environment variables are validated on startup
- URL sanitization prevents XSS attacks
- Social links are validated before storage

## Technology Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with bcryptjs

## License

This project is private and proprietary.
