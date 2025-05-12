declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    FIREBASE_API_KEY: string;
    FIREBASE_AUTH_DOMAIN: string;
    FIREBASE_PROJECT_ID: string;
    FIREBASE_STORAGE_BUCKET: string;
    FIREBASE_MESSAGING_SENDER_ID: string;
    FIREBASE_APP_ID: string;
    MONGODB_URI: string;
    MEDIA_ROOT: string;
    NEXTAUTH_SECRET: string;
    NEXTAUTH_URL: string;
    NEXT_PUBLIC_API_URL: string;
  }
} 