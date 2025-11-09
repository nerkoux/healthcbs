import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFile extends Document {
  name: string;
  originalName: string;
  r2Key: string; // Key in R2 storage
  
  repositoryId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  
  // File metadata
  size: number; // in bytes
  mimeType: string;
  fileType: 'blood-test' | 'x-ray' | 'mri' | 'ct-scan' | 'prescription' | 'vaccination' | 'report' | 'lab-result' | 'scan' | 'other';
  
  // File details
  description?: string;
  tags?: string[];
  
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FileSchema = new Schema<IFile>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    r2Key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    repositoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Repository',
      required: true,
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ['blood-test', 'x-ray', 'mri', 'ct-scan', 'prescription', 'vaccination', 'report', 'lab-result', 'scan', 'other'],
      default: 'other',
    },
    description: {
      type: String,
      maxlength: 500,
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
FileSchema.index({ repositoryId: 1, createdAt: -1 });
FileSchema.index({ ownerId: 1, createdAt: -1 });
FileSchema.index({ tags: 1 });

const File: Model<IFile> = 
  mongoose.models.File || mongoose.model<IFile>('File', FileSchema);

export default File;
