import mongoose, { Schema, Document, Model } from 'mongoose';

export type AccessLevel = 'read' | 'write' | 'admin';

export interface ISharedAccess extends Document {
  repositoryId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  
  // Shared with
  sharedWithUserId: mongoose.Types.ObjectId;
  sharedWithUsername: string;
  
  // Access level
  accessLevel: AccessLevel;
  
  // Sharing metadata
  sharedBy: mongoose.Types.ObjectId;
  sharedAt: Date;
  expiresAt?: Date;
  
  // Status
  isActive: boolean;
  revokedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const SharedAccessSchema = new Schema<ISharedAccess>(
  {
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
    sharedWithUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sharedWithUsername: {
      type: String,
      required: true,
      index: true,
    },
    accessLevel: {
      type: String,
      enum: ['read', 'write', 'admin'],
      default: 'read',
    },
    sharedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sharedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    revokedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
SharedAccessSchema.index({ repositoryId: 1, sharedWithUserId: 1 }, { unique: true });
SharedAccessSchema.index({ sharedWithUserId: 1, isActive: 1 });
SharedAccessSchema.index({ repositoryId: 1, isActive: 1 });

const SharedAccess: Model<ISharedAccess> = 
  mongoose.models.SharedAccess || mongoose.model<ISharedAccess>('SharedAccess', SharedAccessSchema);

export default SharedAccess;
