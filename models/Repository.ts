import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRepository extends Document {
  name: string;
  description?: string;
  ownerId: mongoose.Types.ObjectId;
  ownerUsername: string;
  
  // Privacy settings
  isPrivate: boolean;
  
  // Metadata
  filesCount: number;
  totalSize: number; // in bytes
  
  createdAt: Date;
  updatedAt: Date;
}

const RepositorySchema = new Schema<IRepository>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ownerUsername: {
      type: String,
      required: true,
      index: true,
    },
    isPrivate: {
      type: Boolean,
      default: true,
    },
    filesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSize: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for owner queries
RepositorySchema.index({ ownerId: 1, name: 1 }, { unique: true });
RepositorySchema.index({ ownerId: 1, createdAt: -1 });

const Repository: Model<IRepository> = 
  mongoose.models.Repository || mongoose.model<IRepository>('Repository', RepositorySchema);

export default Repository;
