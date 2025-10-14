const mongoose = require('mongoose');
const { Schema } = mongoose;

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

module.exports = mongoose.models.Section || mongoose.model('Section', SectionSchema);
