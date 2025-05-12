import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import { hash, compare } from 'bcrypt';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env file');
}

const uri = process.env.MONGODB_URI;
const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Define MongoDB schema types for collections to help with TypeScript type checking
export interface MongoDBCollections {
  files: {
    _id: string; // UUID format string
    userId: string;
    name: string;
    path: string;
    size: number;
    created: Date;
    updated: Date;
    manifest: Array<{
      hash: string;
      size: number;
      index: number;
    }>;
  };
  videos: {
    _id: ObjectId; // MongoDB ObjectId
    title: string;
    streamingPath: string;
    userId: string;
    size: number;
    duration: number;
    status: string;
    processingStarted?: Date;
  };
}

// MongoDB types
export interface User {
  _id?: ObjectId;
  email: string;
  password: string;
  name: string;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface FileManifest {
  _id?: string; // UUID string
  name: string;
  size: number;
  type: string;
  chunks: string[]; // Array of chunk hashes
  userId: ObjectId;
  createdAt: Date;
  modifiedAt: Date;
}

export interface VideoMetadata {
  _id?: ObjectId;
  title: string;
  description?: string;
  duration: number;
  format: string;
  qualities: string[];
  thumbnailPath?: string;
  fileId: string; // UUID string reference to FileManifest
  userId: ObjectId;
  createdAt: Date;
  modifiedAt: Date;
}

// Authentication functions
export async function registerUser(email: string, password: string, name: string): Promise<User> {
  const client = await clientPromise;
  const db = client.db();

  // Check if user already exists
  const existingUser = await db.collection('users').findOne({ email });
  if (existingUser) {
    throw new Error('User already exists');
  }

  // Hash password
  const hashedPassword = await hash(password, 10);

  const newUser = {
    email,
    password: hashedPassword,
    name,
    createdAt: new Date(),
  };

  const result = await db.collection('users').insertOne(newUser);
  return { ...newUser, _id: result.insertedId };
}

export async function loginUser(email: string, password: string): Promise<User> {
  const client = await clientPromise;
  const db = client.db();

  // Find user
  const user = await db.collection('users').findOne({ email });
  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Verify password
  const isValid = await compare(password, user.password);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  // Update last login
  await db.collection('users').updateOne(
    { _id: user._id },
    { $set: { lastLoginAt: new Date() } }
  );

  return user as User;
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise; 