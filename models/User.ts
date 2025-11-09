import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  auth0Id: string;
  email: string;
  name: string;
  username: string;
  picture?: string;
  
  // Health Profile
  age?: number;
  bloodGroup?: string;
  height?: number; // in cm
  weight?: number; // in kg
  gender?: 'Male' | 'Female' | 'Other';
  
  // Profile completion
  profileCompleted: boolean;
  onboardingCompleted: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    auth0Id: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9_-]{3,20}$/,
    },
    picture: {
      type: String,
    },
    age: {
      type: Number,
      min: 1,
      max: 150,
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    height: {
      type: Number,
      min: 50,
      max: 300,
    },
    weight: {
      type: Number,
      min: 10,
      max: 500,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Note: Indexes are automatically created via unique: true on schema fields
// username, email, and auth0Id already have unique indexes

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
