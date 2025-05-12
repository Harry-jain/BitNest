import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';

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

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise; 