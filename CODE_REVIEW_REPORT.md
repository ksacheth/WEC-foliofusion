# Comprehensive Code Review Report - FolioFusion

**Date:** 2025-10-14  
**Repository:** ksacheth/WEC-foliofusion  
**Reviewer:** Senior Software Engineer  

---

## Executive Summary

**FolioFusion** is a Next.js 15-based web application that enables users to create and share professional portfolio websites. The tech stack includes React 19, MongoDB with Mongoose for persistence, JWT authentication, bcryptjs for password hashing, and Tailwind CSS for styling. The architecture follows Next.js App Router conventions with API routes for backend logic, Mongoose models for data schemas, and client components for interactive UI. While the foundational code is functional, the application exhibits several critical security vulnerabilities, missing documentation, no test coverage, and maintainability concerns that need immediate attention before any production deployment.

---

## 1. Security Issues

### 1.1 Hardcoded JWT Secret (P0 - Critical)
**Affected Files:** `src/lib/auth/jwt.js`  
**Issue:** JWT secret defaults to `'your-secret-key'` when `JWT_SECRET` environment variable is not set.

```javascript
// Line 3 in src/lib/auth/jwt.js
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
```

**Impact:** If deployed without proper environment configuration, authentication tokens can be forged by attackers, leading to complete account compromise.

**Reproduction:**
1. Deploy application without JWT_SECRET environment variable
2. Generate token with `'your-secret-key'` as the secret
3. Access any user's account

**Fix:**
```javascript
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
```

**Severity:** P0 (Critical)  
**Effort:** Tiny  

---

### 1.2 Hardcoded MongoDB Connection String (P0 - Critical)
**Affected Files:** `src/lib/db/mongodb.js`  
**Issue:** MongoDB URI defaults to `'mongodb://localhost:27017/portfolio'` when environment variable is not set.

```javascript
// Line 3 in src/lib/db/mongodb.js
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/portfolio';
```

**Impact:** Application may silently connect to wrong database in production, causing data loss or exposure.

**Fix:**
```javascript
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is required');
}
```

**Severity:** P0 (Critical)  
**Effort:** Tiny  

---

### 1.3 Client-Side Token Storage (P1 - High)
**Affected Files:** `src/app/dashboard/page.jsx`, `src/app/auth/login/page.jsx`  
**Issue:** JWT tokens stored in localStorage are vulnerable to XSS attacks.

```javascript
// Lines 16, 30, 49 in dashboard/page.jsx
localStorage.getItem('token')
localStorage.setItem('token', data.data.token);
localStorage.removeItem('token');
```

**Impact:** Any XSS vulnerability in the application can lead to token theft and account compromise.

**Fix:** Consider using httpOnly cookies for token storage:
```javascript
// In login route.js - set cookie instead of returning token
export async function POST(request) {
  // ... authentication logic ...
  
  const response = NextResponse.json({
    success: true,
    user: { id: user._id, username: user.username, email: user.email }
  });
  
  response.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 // 7 days
  });
  
  return response;
}
```

**Severity:** P1 (High)  
**Effort:** Medium  

---

### 1.4 Missing Input Sanitization for URLs (P1 - High)
**Affected Files:** `src/app/dashboard/page.jsx`, `src/app/profile/[username]/page.jsx`  
**Issue:** Social links and avatar URLs are not validated, allowing potential XSS via javascript: URLs.

```javascript
// Lines 246-280 in dashboard/page.jsx
<input
  type="url"
  placeholder="GitHub URL"
  value={profile.socialLinks?.github || ''}
  onChange={(e) => setProfile({
    ...profile,
    socialLinks: { ...profile.socialLinks, github: e.target.value }
  })}
/>
```

**Impact:** Users could inject malicious URLs like `javascript:alert(document.cookie)` that execute when clicked.

**Fix:** Add URL validation in `src/lib/utils/api.js`:
```javascript
function validateURL(url) {
  if (!url || url.trim() === '') return true; // Empty is OK
  
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

module.exports = {
  successResponse,
  errorResponse,
  validateUsername,
  validateEmail,
  validateURL,
};
```

Then validate in profile update route:
```javascript
// In src/app/api/profile/update/route.js
if (key === 'socialLinks') {
  const sanitized = sanitizeSocialLinks(value);
  // Validate each URL
  for (const [linkKey, linkValue] of Object.entries(sanitized)) {
    if (linkValue && !validateURL(linkValue)) {
      return errorResponse(`Invalid URL for ${linkKey}`, 400);
    }
  }
  updates.socialLinks = sanitized;
}
```

**Severity:** P1 (High)  
**Effort:** Small  

---

### 1.5 No Rate Limiting on Authentication Endpoints (P1 - High)
**Affected Files:** `src/app/api/auth/login/route.js`, `src/app/api/auth/signup/route.js`  
**Issue:** Authentication endpoints lack rate limiting, enabling brute force attacks.

**Impact:** Attackers can attempt unlimited login attempts to guess passwords.

**Fix:** Implement rate limiting middleware. Add package:
```bash
npm install express-rate-limit
```

Create middleware in `src/lib/middleware/rateLimiter.js`:
```javascript
import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
```

Apply in route handlers (note: Next.js 15 doesn't support Express middleware directly, need custom implementation):
```javascript
// Alternative: Track attempts in MongoDB
const LoginAttempt = new Schema({
  ip: String,
  attempts: Number,
  lastAttempt: Date,
});

// Check attempts before processing login
```

**Severity:** P1 (High)  
**Effort:** Medium  

---

### 1.6 Section Item Injection Vulnerability (P2 - Medium)
**Affected Files:** `src/app/api/sections/create/route.js`, `src/app/api/sections/update/route.js`  
**Issue:** Section items accept arbitrary data without validation or sanitization.

```javascript
// Lines 38-42 in sections/create/route.js
const section = await Section.create({
  userId: payload.userId,
  type,
  title,
  items, // No validation of items content
});
```

**Impact:** Users could inject malicious content into items that gets rendered on portfolio pages.

**Fix:** Add validation for item fields:
```javascript
function validateSectionItem(item, sectionType) {
  if (!item || typeof item !== 'object') {
    return { valid: false, error: 'Item must be an object' };
  }
  
  const allowedFields = ['title', 'company', 'date', 'location', 'description', 'technologies', 'link'];
  const hasUnknownFields = Object.keys(item).some(key => !allowedFields.includes(key));
  
  if (hasUnknownFields) {
    return { valid: false, error: 'Item contains invalid fields' };
  }
  
  // Validate link if present
  if (item.link && !validateURL(item.link)) {
    return { valid: false, error: 'Invalid URL in link field' };
  }
  
  return { valid: true };
}

// In route handler
if (!Array.isArray(items)) {
  return errorResponse('Items must be an array');
}

for (const item of items) {
  const validation = validateSectionItem(item, type);
  if (!validation.valid) {
    return errorResponse(validation.error, 400);
  }
}
```

**Severity:** P2 (Medium)  
**Effort:** Small  

---

### 1.7 No CSRF Protection (P2 - Medium)
**Affected Files:** All API routes  
**Issue:** State-changing operations lack CSRF protection.

**Impact:** Attackers could trick authenticated users into performing unwanted actions.

**Fix:** Implement CSRF tokens or rely on SameSite cookies (already partially addressed if implementing httpOnly cookies with SameSite=strict).

**Severity:** P2 (Medium)  
**Effort:** Medium  

---

## 2. Correctness & Bug Issues

### 2.1 Profile Query Mismatch (P1 - High)
**Affected Files:** `src/app/profile/[username]/page.jsx`  
**Issue:** Line 12 queries for `profileId` field in Section model, but the schema uses `userId`.

```javascript
// Line 12 in profile/[username]/page.jsx
const sections = await Section.find({ profileId: profile._id, visible: true })
```

But Section schema (src/models/Section.js) has:
```javascript
userId: {
  type: Schema.Types.ObjectId,
  ref: 'User',
  required: true,
}
```

**Impact:** Portfolio pages will never display sections, rendering the core feature broken.

**Fix:**
```javascript
// Option 1: Fix the query
const sections = await Section.find({ userId: profile.userId })
  .sort({ createdAt: 1 })
  .lean();

// Option 2: If sections should be queryable by profile, update Section schema
// Add profileId field to Section model
```

**Severity:** P1 (High)  
**Effort:** Tiny  

---

### 2.2 Missing `visible` Field in Section Schema (P1 - High)
**Affected Files:** `src/models/Section.js`, `src/app/profile/[username]/page.jsx`  
**Issue:** Portfolio page queries for `visible: true` but Section model doesn't have this field.

**Fix:** Add visible field to Section schema:
```javascript
const SectionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['projects', 'experience', 'education', 'skills', 'certifications', 'custom'],
  },
  title: {
    type: String,
    required: true,
  },
  items: {
    type: [Schema.Types.Mixed],
    default: [],
  },
  visible: {
    type: Boolean,
    default: true,
  },
  order: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});
```

**Severity:** P1 (High)  
**Effort:** Tiny  

---

### 2.3 Token Not Returned on Signup (P2 - Medium)
**Affected Files:** `src/app/api/auth/signup/route.js`  
**Issue:** Token generation is commented out, requiring users to log in after registration.

```javascript
// Lines 58-62 are commented
// const token = generateToken({
//   userId: user._id.toString(),
//   username: user.username,
//   email: user.email,
// });
```

**Impact:** Extra friction in user onboarding flow.

**Fix:** Uncomment token generation or document this as intentional design choice:
```javascript
const token = generateToken({
  userId: user._id.toString(),
  username: user.username,
  email: user.email,
});

return successResponse({
  user: {
    id: user._id,
    username: user.username,
    email: user.email,
  },
  token,
}, 'User registered successfully');
```

**Severity:** P2 (Medium)  
**Effort:** Tiny  

---

### 2.4 Inconsistent Module System (P2 - Medium)
**Affected Files:** Multiple files  
**Issue:** Mix of CommonJS (`module.exports`) and ES modules (`export`) throughout the codebase.

Example:
- `src/lib/utils/api.js` uses `module.exports`
- `src/models/*.js` use `module.exports`
- API routes use `export`

**Impact:** Potential compatibility issues and confusion.

**Fix:** Standardize on ES modules:
```javascript
// Convert src/lib/utils/api.js
export function successResponse(data, message) {
  return NextResponse.json({
    success: true,
    data,
    message,
  });
}

export function errorResponse(error, statusCode = 400) {
  return NextResponse.json({
    success: false,
    error,
  }, { status: statusCode });
}

// ... rest of exports
```

**Severity:** P2 (Medium)  
**Effort:** Small  

---

### 2.5 Unused Import (P2 - Low)
**Affected Files:** `src/app/page.js`  
**Issue:** `Image` imported but never used.

```javascript
// Line 1
import Image from "next/image";
```

**Fix:** Remove unused import:
```javascript
import HomePage from "./pages/HomePage";

export default function Home() {
  return <HomePage />;
}
```

**Severity:** P2 (Low)  
**Effort:** Tiny  

---

### 2.6 Missing Error Handling for Axios (P2 - Medium)
**Affected Files:** `src/app/auth/login/page.jsx`, `src/app/auth/signup/page.jsx`  
**Issue:** While axios errors are caught, the dependency adds weight when fetch API would suffice.

**Fix:** Replace axios with native fetch (already used elsewhere):
```javascript
// Remove axios dependency and use fetch consistently
try {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });
  
  const data = await response.json();
  
  if (!response.ok || !data.success) {
    setError(data.error || 'Login failed');
    return;
  }
  
  localStorage.setItem('token', data.data.token);
  localStorage.setItem('username', data.data.user.username);
  router.push('/dashboard');
} catch (err) {
  setError('An error occurred. Please try again.');
} finally {
  setLoading(false);
}
```

**Severity:** P2 (Low)  
**Effort:** Small  

---

## 3. Code Quality & Maintainability

### 3.1 Duplicated `extractToken` Function (P2 - Medium)
**Affected Files:** Multiple API route files  
**Issue:** Same `extractToken` function duplicated across 5 files:
- `src/app/api/profile/update/route.js`
- `src/app/api/profile/get/route.js`
- `src/app/api/sections/create/route.js`
- `src/app/api/sections/update/route.js`
- `src/app/api/sections/delete/route.js`
- `src/app/api/sections/list/route.js`

**Fix:** Extract to shared utility:
```javascript
// Create src/lib/auth/token.js
export function extractToken(request) {
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

// Use in routes
import { extractToken } from '@/lib/auth/token';
```

**Severity:** P2 (Medium)  
**Effort:** Small  

---

### 3.2 Magic Strings and Hardcoded Values (P2 - Medium)
**Affected Files:** Multiple  
**Issue:** Section types, theme colors, layouts hardcoded in multiple places.

**Fix:** Create constants file:
```javascript
// src/lib/constants.js
export const SECTION_TYPES = [
  'projects',
  'experience', 
  'education',
  'skills',
  'certifications',
  'custom'
];

export const THEME_OPTIONS = ['blue', 'green', 'purple', 'orange', 'dark'];
export const LAYOUT_OPTIONS = ['modern', 'classic', 'minimal', 'creative'];

export const SOCIAL_LINK_TYPES = [
  'github',
  'linkedin', 
  'twitter',
  'instagram',
  'website',
  'email'
];
```

Use throughout codebase instead of repeating values.

**Severity:** P2 (Medium)  
**Effort:** Small  

---

### 3.3 Poor User Experience with `prompt()` (P1 - High)
**Affected Files:** `src/app/dashboard/page.jsx`  
**Issue:** Using native `prompt()` for section creation is not user-friendly and inconsistent with the rest of the UI.

```javascript
// Lines 82-83
const type = prompt('Section type (projects, experience, education, skills, certifications, custom):');
const title = prompt('Section title:');
```

**Fix:** Implement modal dialog component:
```jsx
// Create AddSectionModal component
const AddSectionModal = ({ isOpen, onClose, onSubmit }) => {
  const [type, setType] = useState('');
  const [title, setTitle] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ type, title });
    setType('');
    setTitle('');
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Add New Section</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Section Type</label>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              required
            >
              <option value="">Select type...</option>
              <option value="projects">Projects</option>
              <option value="experience">Experience</option>
              <option value="education">Education</option>
              <option value="skills">Skills</option>
              <option value="certifications">Certifications</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Section Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="e.g., My Projects"
              required
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded">
              Add Section
            </button>
            <button type="button" onClick={onClose} className="flex-1 border py-2 rounded">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

**Severity:** P1 (High)  
**Effort:** Medium  

---

### 3.4 No Loading States (P2 - Medium)
**Affected Files:** `src/app/dashboard/page.jsx`  
**Issue:** While initial page has loading state, individual operations (profile update, section operations) don't show loading indicators.

**Fix:** Add loading states for all async operations:
```javascript
const [updateLoading, setUpdateLoading] = useState({
  profile: false,
  sections: {},
});

// Usage
setUpdateLoading(prev => ({ ...prev, profile: true }));
// ... API call
setUpdateLoading(prev => ({ ...prev, profile: false }));
```

**Severity:** P2 (Medium)  
**Effort:** Small  

---

### 3.5 Missing Error Boundaries (P2 - Medium)
**Affected Files:** All React components  
**Issue:** No error boundaries to catch and handle component errors gracefully.

**Fix:** Add error boundary:
```jsx
// src/app/components/ErrorBoundary.jsx
'use client';

import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
            <p className="text-gray-700 mb-4">We're sorry, but something unexpected happened.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

Wrap app in layout.js:
```jsx
import { ErrorBoundary } from './components/ErrorBoundary';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

**Severity:** P2 (Medium)  
**Effort:** Small  

---

## 4. Testing Issues

### 4.1 Zero Test Coverage (P0 - Critical)
**Affected Files:** Entire codebase  
**Issue:** No test files, no test framework configured, no CI/CD testing.

**Impact:** Cannot verify correctness, regression prevention impossible, deployment risk extremely high.

**Fix:** Set up Jest and React Testing Library:

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
```

Create `jest.config.js`:
```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.stories.{js,jsx}',
    '!src/**/__tests__/**',
  ],
  coverageThresholds: {
    global: {
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
```

Create `jest.setup.js`:
```javascript
import '@testing-library/jest-dom';
```

Example test for validation utilities:
```javascript
// src/lib/utils/__tests__/api.test.js
import { validateUsername, validateEmail } from '../api';

describe('Validation utilities', () => {
  describe('validateUsername', () => {
    it('should accept valid usernames', () => {
      expect(validateUsername('john_doe')).toBe(true);
      expect(validateUsername('user123')).toBe(true);
      expect(validateUsername('my-name')).toBe(true);
    });

    it('should reject invalid usernames', () => {
      expect(validateUsername('ab')).toBe(false); // too short
      expect(validateUsername('USER')).toBe(false); // uppercase
      expect(validateUsername('user@name')).toBe(false); // invalid char
      expect(validateUsername('a'.repeat(31))).toBe(false); // too long
    });
  });

  describe('validateEmail', () => {
    it('should accept valid emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user+tag@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('notanemail')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
    });
  });
});
```

Add to package.json:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage"
}
```

**Priority tests to write:**
1. Authentication flow (signup, login, token generation)
2. Profile CRUD operations
3. Section CRUD operations
4. Input validation functions
5. Token extraction and verification
6. Component rendering tests
7. API route integration tests

**Severity:** P0 (Critical)  
**Effort:** Large  

---

### 4.2 No API Testing (P0 - Critical)
**Affected Files:** All API routes  
**Issue:** No integration tests for API endpoints.

**Fix:** Add API testing with supertest:

```bash
npm install --save-dev supertest
```

Example test:
```javascript
// src/app/api/auth/__tests__/signup.test.js
import { POST } from '../signup/route';

describe('POST /api/auth/signup', () => {
  it('should create a new user with valid data', async () => {
    const request = {
      json: async () => ({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      }),
    };

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.user.username).toBe('testuser');
  });

  it('should reject duplicate username', async () => {
    // Test duplicate handling
  });

  it('should validate email format', async () => {
    // Test email validation
  });
});
```

**Severity:** P0 (Critical)  
**Effort:** Large  

---

### 4.3 No E2E Testing (P1 - High)
**Affected Files:** N/A  
**Issue:** No end-to-end testing for critical user flows.

**Fix:** Set up Playwright or Cypress:

```bash
npm install --save-dev @playwright/test
npx playwright install
```

Create `playwright.config.js` and test critical flows:
- User registration → login → create portfolio → view public portfolio
- Dashboard operations
- Authentication flows

**Severity:** P1 (High)  
**Effort:** Large  

---

## 5. Documentation Issues

### 5.1 Generic README (P1 - High)
**Affected Files:** `README.md`  
**Issue:** README is still the default Next.js template and doesn't describe the project.

**Fix:** Replace with comprehensive README:

```markdown
# FolioFusion

A modern portfolio builder that lets you create and share professional portfolios in minutes.

## Features

- 🚀 Quick portfolio creation
- 🎨 Multiple themes and layouts
- 📱 Responsive design
- 🔒 Secure authentication
- 📊 Organized sections (Projects, Experience, Education, Skills, etc.)
- 🔗 Social media integration

## Tech Stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS
- **Backend:** Next.js API Routes, MongoDB, Mongoose
- **Authentication:** JWT with bcrypt
- **Deployment:** Vercel (recommended)

## Prerequisites

- Node.js 18+ or Bun
- MongoDB instance (local or cloud)

## Environment Variables

Create a `.env.local` file in the root directory:

```bash
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
```

**⚠️ IMPORTANT:** Never commit `.env.local` to version control.

## Getting Started

### Installation

```bash
npm install
# or
bun install
```

### Run Development Server

```bash
npm run dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm run start
```

## Project Structure

```
src/
├── app/
│   ├── api/          # API routes
│   ├── auth/         # Authentication pages
│   ├── components/   # Reusable components
│   ├── dashboard/    # User dashboard
│   ├── pages/        # Page components
│   └── profile/      # Public portfolio pages
├── lib/
│   ├── auth/         # Authentication utilities
│   ├── db/           # Database connection
│   └── utils/        # Utility functions
└── models/           # Mongoose schemas
```

## API Routes

- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/profile/get` - Get user profile
- `POST /api/profile/update` - Update profile
- `POST /api/sections/create` - Create section
- `PATCH /api/sections/update` - Update section
- `DELETE /api/sections/delete` - Delete section
- `GET /api/sections/list` - List user sections

## Testing

```bash
npm run test
npm run test:coverage
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@foliofusion.com or open an issue on GitHub.
```

**Severity:** P1 (High)  
**Effort:** Small  

---

### 5.2 Missing CONTRIBUTING.md (P2 - Medium)
**Affected Files:** N/A  
**Issue:** No contribution guidelines.

**Fix:** Create `CONTRIBUTING.md`:

```markdown
# Contributing to FolioFusion

Thank you for your interest in contributing! 

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/WEC-foliofusion.git`
3. Create a branch: `git checkout -b feature/my-feature`
4. Install dependencies: `npm install`
5. Set up environment variables (see README.md)
6. Make your changes
7. Run tests: `npm test`
8. Run linter: `npm run lint`
9. Commit changes: `git commit -m "feat: add my feature"`
10. Push to your fork: `git push origin feature/my-feature`
11. Open a Pull Request

## Commit Convention

We follow Conventional Commits:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## Code Style

- Use ESLint configuration provided
- Write meaningful variable names
- Comment complex logic
- Keep functions small and focused

## Pull Request Process

1. Update README.md with any new environment variables or setup steps
2. Ensure all tests pass
3. Update documentation as needed
4. Request review from maintainers
5. Address review comments
6. Once approved, maintainers will merge

## Bug Reports

Use GitHub Issues and include:

- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Your environment (OS, browser, Node version)

## Feature Requests

Open an issue with:

- Clear description of the feature
- Use cases
- Any implementation ideas

Thank you for contributing! 🎉
```

**Severity:** P2 (Medium)  
**Effort:** Small  

---

### 5.3 Missing Environment Variable Documentation (P1 - High)
**Affected Files:** N/A  
**Issue:** No `.env.example` file to guide users on required environment variables.

**Fix:** Create `.env.example`:

```bash
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/foliofusion

# JWT Secret (use a long random string in production)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters_long

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Email configuration for password reset (future feature)
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=your_email@example.com
# SMTP_PASS=your_password
```

**Severity:** P1 (High)  
**Effort:** Tiny  

---

### 5.4 No API Documentation (P1 - High)
**Affected Files:** N/A  
**Issue:** No documentation for API endpoints.

**Fix:** Add API.md or use Swagger/OpenAPI:

```markdown
# API Documentation

Base URL: `http://localhost:3000/api`

## Authentication

### Register User
```
POST /api/auth/signup
Content-Type: application/json

{
  "username": "string (3-30 chars, lowercase, alphanumeric, -, _)",
  "email": "string (valid email)",
  "password": "string (min 6 chars)"
}

Response 200:
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "username": "string",
      "email": "string"
    }
  },
  "message": "User registered successfully"
}
```

### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "string",
  "password": "string"
}

Response 200:
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "string (JWT)"
  }
}
```

## Profile

All profile endpoints require Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Get Profile
```
GET /api/profile/get

Response 200:
{
  "success": true,
  "data": {
    "id": "string",
    "userId": "string",
    "username": "string",
    "fullName": "string",
    "title": "string",
    "bio": "string",
    "location": "string",
    "avatar": "string (url)",
    "socialLinks": {
      "github": "string (url)",
      "linkedin": "string (url)",
      ...
    },
    "theme": "string (blue|green|purple|orange|dark)",
    "layout": "string (modern|classic|minimal|creative)"
  }
}
```

... (continue for all endpoints)
```

**Severity:** P1 (High)  
**Effort:** Medium  

---

### 5.5 Missing Code Comments (P2 - Medium)
**Affected Files:** Most files  
**Issue:** Complex logic lacks explanatory comments.

**Fix:** Add JSDoc comments:

```javascript
/**
 * Extracts and validates JWT token from Authorization header
 * @param {Request} request - Next.js request object
 * @returns {string|null} JWT token if valid format, null otherwise
 */
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
```

**Severity:** P2 (Medium)  
**Effort:** Medium  

---

## 6. Configuration & Infrastructure Issues

### 6.1 No CI/CD Pipeline (P1 - High)
**Affected Files:** N/A  
**Issue:** No GitHub Actions or CI/CD configuration.

**Fix:** Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:7
        ports:
          - 27017:27017
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
        env:
          MONGODB_URI: mongodb://localhost:27017/test
          JWT_SECRET: test-secret-key-32-chars-long-minimum

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
        env:
          MONGODB_URI: mongodb://localhost:27017/test
          JWT_SECRET: test-secret-key-32-chars-long-minimum
```

**Severity:** P1 (High)  
**Effort:** Small  

---

### 6.2 No Docker Support (P2 - Medium)
**Affected Files:** N/A  
**Issue:** No Dockerfile for containerized deployment.

**Fix:** Create `Dockerfile`:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

And `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/foliofusion
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - mongo

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

**Severity:** P2 (Medium)  
**Effort:** Small  

---

### 6.3 No Logging Strategy (P2 - Medium)
**Affected Files:** All API routes  
**Issue:** Only `console.error` for logging, no structured logging or log levels.

**Fix:** Implement logging utility:

```javascript
// src/lib/utils/logger.js
const isDev = process.env.NODE_ENV !== 'production';

const logger = {
  info: (message, meta = {}) => {
    if (isDev) {
      console.log(`[INFO] ${message}`, meta);
    }
  },
  error: (message, error = null, meta = {}) => {
    console.error(`[ERROR] ${message}`, { error: error?.message, stack: error?.stack, ...meta });
  },
  warn: (message, meta = {}) => {
    console.warn(`[WARN] ${message}`, meta);
  },
  debug: (message, meta = {}) => {
    if (isDev) {
      console.debug(`[DEBUG] ${message}`, meta);
    }
  },
};

export default logger;

// Usage in routes
import logger from '@/lib/utils/logger';

// Instead of console.error
logger.error('Login error', error, { email: requestData.email });
```

**Severity:** P2 (Medium)  
**Effort:** Small  

---

### 6.4 No Database Indexing (P1 - High)
**Affected Files:** `src/models/*.js`  
**Issue:** No database indexes defined, leading to slow queries.

**Fix:** Add indexes to models:

```javascript
// src/models/User.js
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });

// src/models/Profile.js
ProfileSchema.index({ userId: 1 });
ProfileSchema.index({ username: 1 });

// src/models/Section.js
SectionSchema.index({ userId: 1 });
SectionSchema.index({ userId: 1, createdAt: 1 });
```

**Severity:** P1 (High)  
**Effort:** Tiny  

---

## 7. Performance Issues

### 7.1 No Database Connection Pooling Configuration (P2 - Medium)
**Affected Files:** `src/lib/db/mongodb.js`  
**Issue:** MongoDB connection doesn't specify pool size or timeout options.

**Fix:**
```javascript
const opts = {
  bufferCommands: false,
  maxPoolSize: 10,
  minPoolSize: 2,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000,
};
```

**Severity:** P2 (Medium)  
**Effort:** Tiny  

---

### 7.2 No Image Optimization (P2 - Medium)
**Affected Files:** `src/app/profile/[username]/page.jsx`  
**Issue:** Using `<img>` tag instead of Next.js `<Image>` component for avatar.

**Fix:**
```jsx
import Image from 'next/image';

// Replace line 46-50
{profile.avatar && (
  <Image
    src={profile.avatar}
    alt={profile.fullName}
    width={128}
    height={128}
    className="rounded-full mx-auto mb-6 object-cover border-4 border-white shadow-lg"
  />
)}
```

**Severity:** P2 (Medium)  
**Effort:** Tiny  

---

### 7.3 No Caching Strategy (P2 - Medium)
**Affected Files:** Portfolio pages  
**Issue:** Public portfolio pages are dynamically generated on every request.

**Fix:** Implement ISR (Incremental Static Regeneration):

```javascript
// src/app/profile/[username]/page.jsx
export const revalidate = 3600; // Revalidate every hour

export async function generateStaticParams() {
  // Generate static pages for popular profiles at build time
  const profiles = await Profile.find().limit(100).lean();
  return profiles.map((profile) => ({
    username: profile.username,
  }));
}
```

**Severity:** P2 (Medium)  
**Effort:** Small  

---

## 8. Dependency Issues

### 8.1 Unused Supabase Dependency (P2 - Low)
**Affected Files:** `package.json`  
**Issue:** Supabase package installed but never used.

```json
"supabase": "^2.51.0"
```

**Fix:** Remove if not planned for use:
```bash
npm uninstall supabase
```

**Severity:** P2 (Low)  
**Effort:** Tiny  

---

### 8.2 Unnecessary React Router Dom (P2 - Low)
**Affected Files:** `package.json`  
**Issue:** `react-router-dom` installed but Next.js has built-in routing.

```json
"react-router-dom": "^7.9.4"
```

**Fix:** Remove unused dependency:
```bash
npm uninstall react-router-dom
```

**Severity:** P2 (Low)  
**Effort:** Tiny  

---

### 8.3 Can Replace Axios with Fetch (P2 - Low)
**Affected Files:** Auth pages  
**Issue:** Axios adds 12KB for functionality already available in fetch.

**Fix:** Remove axios and use fetch (already covered in 2.6).

**Severity:** P2 (Low)  
**Effort:** Small  

---

## 9. Accessibility Issues

### 9.1 Missing Alt Text Enforcement (P2 - Medium)
**Affected Files:** `src/app/profile/[username]/page.jsx`  
**Issue:** While current avatar has alt text, there's no validation to ensure it's always present.

**Fix:** Add validation in profile update route to ensure avatar URLs are accompanied by descriptions.

**Severity:** P2 (Medium)  
**Effort:** Small  

---

### 9.2 No ARIA Labels on Interactive Elements (P2 - Medium)
**Affected Files:** Dashboard, auth pages  
**Issue:** Buttons and forms lack ARIA labels for screen readers.

**Fix:** Add aria-labels:
```jsx
<button
  type="submit"
  disabled={loading}
  aria-label="Sign in to your account"
  className="..."
>
  {loading ? 'Signing in...' : 'Sign in'}
</button>
```

**Severity:** P2 (Medium)  
**Effort:** Small  

---

### 9.3 Color Contrast Issues (P2 - Medium)
**Affected Files:** Various  
**Issue:** Some text color combinations may not meet WCAG AA standards.

**Fix:** Audit with accessibility tools and adjust colors:
```jsx
// Ensure text on colored backgrounds has sufficient contrast
className="text-gray-700" // Instead of text-gray-500 on white
```

**Severity:** P2 (Medium)  
**Effort:** Small  

---

## 10. Commands to Run

### Linting
```bash
npm run lint
```
**Expected:** No errors (current state: passes)

### Build
```bash
npm run build
```
**Expected:** Build failure due to Google Fonts (needs network access or local font files)

### Test (after setup)
```bash
npm test
```
**Expected:** Currently N/A - needs test infrastructure

### Audit Dependencies
```bash
npm audit
```
**Expected:** 0 vulnerabilities (current state: clean)

### Check for Outdated Packages
```bash
npm outdated
```

---

## Prioritized 7-Day Action Plan

### Day 1 (P0 Issues - Critical Security)
1. ✅ **Remove hardcoded JWT secret** - throw error if not set (Effort: Tiny)
2. ✅ **Remove hardcoded MongoDB URI** - throw error if not set (Effort: Tiny)
3. ✅ **Create .env.example file** with required variables (Effort: Tiny)
4. ✅ **Update README.md** with project-specific information (Effort: Small)

### Day 2 (P0 Issues - Testing Foundation)
5. ✅ **Set up Jest testing framework** (Effort: Medium)
6. ✅ **Write tests for validation utilities** (Effort: Small)
7. ✅ **Write tests for JWT functions** (Effort: Small)
8. ✅ **Set up CI/CD with GitHub Actions** (Effort: Small)

### Day 3 (P1 Issues - Critical Bugs)
9. ✅ **Fix profile query mismatch** in portfolio page (Effort: Tiny)
10. ✅ **Add visible and order fields** to Section schema (Effort: Tiny)
11. ✅ **Add database indexes** to all models (Effort: Tiny)
12. ✅ **Add URL validation** to prevent XSS (Effort: Small)

### Day 4 (P1 Issues - Security & UX)
13. ✅ **Implement httpOnly cookies** for token storage (Effort: Medium)
14. ✅ **Replace prompt() with modal** for section creation (Effort: Medium)
15. ✅ **Add rate limiting** to auth endpoints (Effort: Medium)

### Day 5 (P2 Issues - Code Quality)
16. ✅ **Extract duplicated extractToken function** (Effort: Small)
17. ✅ **Create constants file** for magic strings (Effort: Small)
18. ✅ **Add section item validation** (Effort: Small)
19. ✅ **Add error boundary component** (Effort: Small)

### Day 6 (Documentation & Cleanup)
20. ✅ **Create CONTRIBUTING.md** (Effort: Small)
21. ✅ **Create API documentation** (Effort: Medium)
22. ✅ **Remove unused dependencies** (axios, supabase, react-router-dom) (Effort: Tiny)
23. ✅ **Standardize module system** to ES modules (Effort: Small)

### Day 7 (Testing & Polish)
24. ✅ **Write API route tests** (Effort: Large - start with critical paths)
25. ✅ **Add logging utility** (Effort: Small)
26. ✅ **Add loading states** to all async operations (Effort: Small)
27. ✅ **Run full audit** and fix remaining issues

---

## Release Risk Summary

**Current release risk: HIGH (DO NOT DEPLOY TO PRODUCTION)**

The application contains multiple critical security vulnerabilities that make it unsuitable for production deployment. The most severe issues are: (1) hardcoded authentication secret that would allow any attacker to forge user sessions, (2) hardcoded database connection that could lead to data loss, (3) client-side token storage vulnerable to XSS attacks, and (4) complete absence of test coverage preventing verification of correctness. Additionally, there are critical functional bugs including broken portfolio display due to schema mismatches, and missing input validation that exposes the application to injection attacks. The codebase lacks basic production requirements including CI/CD, proper documentation, rate limiting, and error handling. Before any production deployment, at minimum the P0 security issues must be resolved, comprehensive test coverage must be added, the schema bugs must be fixed, and proper environment variable management must be implemented. Estimated time to reach production-ready state: 2-3 weeks of focused development effort.

---

**End of Report**
