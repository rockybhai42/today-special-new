const mongoose = require('mongoose');

const specialSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: 120,
    },
    dishName: {
      type: String,
      required: [true, 'Dish name is required'],
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    mediaType: {
      type: String,
      required: true,
      enum: {
        values: ['image', 'video'],
        message: 'mediaType must be either "image" or "video"',
      },
    },
    mediaUrl: {
      type: String,
      required: [true, 'mediaUrl is required'],
    },
    duration: {
      type: Number,
      required: [true, 'duration is required'],
      min: [1, 'duration must be at least 1 second'],
      default: 10,
    },
    displayOrder: {
      type: Number,
      required: true,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

specialSchema.index({ isActive: 1 });
specialSchema.index({ displayOrder: 1 });
specialSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Special', specialSchema);
