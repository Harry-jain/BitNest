# BitNest Quick Setup Guide

This guide provides simple instructions to get BitNest up and running quickly on your Android device.

## 1. Prerequisites

- Android device (or any device that can run Node.js)
- [Termux](https://termux.dev/en/) installed on Android (or Node.js environment on other devices)
- [Supabase](https://supabase.com/) free account

## 2. Quick Setup

### Install Dependencies

1. Clone and navigate to the BitNest repository:
   ```bash
   git clone https://github.com/yourusername/BitNest.git
   cd BitNest
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Supabase Setup

1. Create a free Supabase account at [https://supabase.com/](https://supabase.com/)
2. Create a new project with any name (e.g., "BitNest")
3. Go to Project Settings → API to find your:
   - Project URL
   - Project API Key (anon, public)
4. Copy these values for the next step

5. Set up social login (optional but recommended):
   - In the Supabase dashboard, go to Authentication → Providers
   - Enable Email/Password, Google, and GitHub providers
   - For Google authentication, create OAuth credentials in Google Cloud Console
   - For GitHub authentication, create OAuth app in GitHub Developer Settings

### Environment Setup

1. Create a `.env.local` file:
   ```bash
   cp env.template .env.local
   ```

2. Edit the `.env.local` file and replace the Supabase values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. Set a random string for NEXTAUTH_SECRET:
   ```
   NEXTAUTH_SECRET=random-secret-value
   ```

### Configure Storage

BitNest stores files on your local storage. For Android:

1. Create the storage directory:
   ```bash
   mkdir -p /storage/emulated/0/BitNestMedia
   ```

2. No further configuration needed - BitNest will create all necessary subdirectories automatically.

### Termux Performance Optimization

For best performance on your Android device:

1. **Use a single Termux session** to run BitNest:
   - Keep only 1-2 active sessions in Termux to minimize resource usage
   - Avoid running multiple concurrent processes that may slow down your device

2. **Session management:**
   - Run the app in a single session with `npm run dev`
   - Use `Ctrl+C` to stop the app when not in use
   - You can press `Ctrl+D` to exit a Termux session when done

3. **Minimize background processes:**
   - Close other resource-intensive apps while running BitNest
   - For production use, consider running with `npm run start` which uses less resources than development mode

### Database Setup

Run the following SQL in your Supabase SQL Editor:

```sql
-- User profiles table (extends Supabase auth)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'user',
    storage_quota BIGINT DEFAULT 10737418240, -- 10GB default
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- File records table (metadata only, actual files stored locally)
CREATE TABLE file_records (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    size BIGINT NOT NULL,
    type TEXT,
    path TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    is_public BOOLEAN DEFAULT FALSE
);

-- Video metadata table
CREATE TABLE video_metadata (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    duration INTEGER,
    format TEXT,
    qualities JSON,
    thumbnail_path TEXT,
    file_id UUID NOT NULL REFERENCES file_records(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- System configuration table
CREATE TABLE system_config (
    id TEXT PRIMARY KEY,
    max_users INTEGER DEFAULT 10,
    default_user_quota BIGINT DEFAULT 10737418240, -- 10GB default
    total_storage_limit BIGINT DEFAULT 107374182400, -- 100GB default
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Insert default config
INSERT INTO system_config (id) VALUES ('default');

-- Create admin user function
CREATE OR REPLACE FUNCTION create_admin_user(admin_email TEXT, admin_password TEXT)
RETURNS UUID AS $$
DECLARE
    admin_id UUID;
BEGIN
    -- Sign up the admin user
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, role)
    VALUES (
        admin_email,
        crypt(admin_password, gen_salt('bf')),
        NOW(),
        'authenticated'
    )
    RETURNING id INTO admin_id;
    
    -- Create profile with admin role
    INSERT INTO user_profiles (id, email, name, role)
    VALUES (admin_id, admin_email, 'Admin', 'admin');
    
    RETURN admin_id;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Add basic policies
CREATE POLICY "Users can view their own profile" 
ON user_profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON user_profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view and manage their own files" 
ON file_records FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view and manage their own videos" 
ON video_metadata FOR ALL USING (auth.uid() = user_id);

-- Admin policies for system_config
CREATE POLICY "Only admins can view system config"
ON system_config FOR SELECT
USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Only admins can update system config"
ON system_config FOR UPDATE
USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- Admin policies for user management
CREATE POLICY "Admins can view all user profiles"
ON user_profiles FOR SELECT
USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update all user profiles"
ON user_profiles FOR UPDATE
USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
```

Create your first admin user by running:

```sql
SELECT create_admin_user('youremail@example.com', 'secure-password');
```

## 3. Run BitNest

Start the development server:
```bash
npm run dev
```

Access BitNest at:
- http://localhost:3000 (from the device)
- http://your-device-ip:3000 (from other devices on the same network)

## 4. Production Deployment

For production usage:
```bash
npm run build
npm run start
```

## Troubleshooting

- **Storage Permission Issues**: Run `termux-setup-storage` in Termux
- **App Won't Start**: Check that your .env.local file has the correct values
- **Can't Sign Up**: Ensure Supabase authentication is enabled (Email provider)
- **Performance Issues**: Reduce the number of active Termux sessions and close background apps 