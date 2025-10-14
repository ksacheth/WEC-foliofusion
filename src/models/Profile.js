const mongoose = require('mongoose');
const { Schema } = mongoose;

const ProfileSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    default: '',
  },
  bio: {
    type: String,
    default: '',
  },
  location: {
    type: String,
    default: '',
  },
  avatar: {
    type: String,
    default: '',
  },
  socialLinks: {
    github: String,
    linkedin: String,
    twitter: String,
    instagram: String,
    website: String,
    email: String,
  },
  theme: {
    type: String,
    default: 'blue',
    enum: ['blue', 'green', 'purple', 'orange', 'dark'],
  },
  layout: {
    type: String,
    default: 'modern',
    enum: ['modern', 'classic', 'minimal', 'creative'],
  },
}, {
  timestamps: true,
});

module.exports = mongoose.models.Profile || mongoose.model('Profile', ProfileSchema);