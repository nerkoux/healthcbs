# 🔐 Auth0 + S3 Encrypted Storage Demo

A Next.js application demonstrating secure file storage with **AES-256-GCM encryption**, **Auth0 authentication**, and **Cloudflare R2 (S3-compatible) storage**.

## 🌟 Features

- **🔒 AES-256-GCM Encryption**: Military-grade authenticated encryption for all files
- **🔐 Auth0 Authentication**: Secure user authentication and session management
- **☁️ Cloudflare R2 Storage**: Fast, global, S3-compatible object storage
- **👤 User Isolation**: Each user can only access their own encrypted files
- **🔓 On-Demand Decryption**: Files are decrypted only when downloaded
- **📦 Zero-Knowledge Storage**: R2 only stores encrypted ciphertext

## 🏗️ Architecture

```
User Upload → Auth0 Auth → Encrypt (AES-256-GCM) → R2 Storage
User Download → Auth0 Auth → R2 Retrieval → Decrypt → User
```

### Security Flow

1. User authenticates via Auth0
2. File is uploaded and encrypted server-side with AES-256-GCM
3. Encrypted file + authentication tag stored in R2
4. On download, file is decrypted server-side and streamed to user
5. Only users with valid Auth0 session can access their files

## 📦 Installation

1. **Clone and Install Dependencies**

```bash
npm install
```

2. **Generate Encryption Key**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output - you'll need it for `.env.local`

3. **Configure Environment Variables**

Create `.env.local` file (copy from `.env.example`):

```bash
cp .env.example .env.local
```

Fill in your credentials:

```env
# Auth0 (from https://manage.auth0.com/)
AUTH0_SECRET=your_long_random_secret_min_32_chars
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://your-domain.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret

# Cloudflare R2 (from https://dash.cloudflare.com/)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name

# Encryption (generated above)
ENCRYPTION_KEY=your_base64_encoded_32_byte_key
```

## 🚀 Usage

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production

```bash
npm run build
npm start
```

## 🔧 Setup Guides

### Auth0 Setup

1. Go to [Auth0 Dashboard](https://manage.auth0.com/)
2. Create a new application (Regular Web Application)
3. Configure Allowed Callback URLs: `http://localhost:3000/auth/callback`
4. Configure Allowed Logout URLs: `http://localhost:3000`
5. Copy your Domain, Client ID, and Client Secret

### Cloudflare R2 Setup

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to R2 Object Storage
3. Create a new bucket
4. Generate API tokens (Access Key ID + Secret Access Key)
5. Note your Account ID from the R2 dashboard

## 📁 Project Structure

```
├── app/
│   ├── page.tsx                 # Main page with file manager
│   ├── FileManager.tsx          # Client component for file upload/download
│   ├── api/
│   │   ├── auth/[auth0]/       # Auth0 routes (auto-configured)
│   │   ├── upload/route.ts     # Encrypted file upload endpoint
│   │   ├── download/route.ts   # File decryption & download endpoint
│   │   └── files/route.ts      # List user's files
├── lib/
│   ├── auth0-client.ts         # Auth0 client configuration
│   ├── auth.ts                 # Auth helper functions
│   ├── r2.ts                   # R2/S3 client configuration
│   └── encryption.ts           # AES-256-GCM encryption utilities
├── proxy.ts                    # Auth0 middleware
└── .env.local                  # Environment variables (create this)
```

## 🔒 Security Features

### Encryption Details

- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Size**: 256 bits (32 bytes)
- **IV Size**: 96 bits (12 bytes) - randomly generated per file
- **Authentication Tag**: 128 bits (16 bytes) - ensures integrity

### Storage Format

Each encrypted file in R2 contains:
```
[IV (12 bytes)] + [Auth Tag (16 bytes)] + [Ciphertext (variable)]
```

### Access Control

- Files stored per user: `{user_id}/{timestamp}-{filename}.enc`
- API routes validate Auth0 session before any operation
- Users can only list/download their own files
- Download endpoint validates file ownership

## 🛡️ Production Considerations

### DO:
- ✅ Store `ENCRYPTION_KEY` in secure secret management (Cloudflare Secrets, AWS Secrets Manager, etc.)
- ✅ Use HTTPS in production (`AUTH0_BASE_URL` should use https)
- ✅ Rotate encryption keys periodically (requires re-encryption)
- ✅ Monitor file access logs
- ✅ Set up CORS policies on R2 bucket
- ✅ Enable rate limiting on API routes
- ✅ Implement file size limits

### DON'T:
- ❌ Commit `.env.local` to version control
- ❌ Use the same encryption key across environments
- ❌ Store encryption key in client-side code
- ❌ Allow unauthenticated access to files
- ❌ Expose R2 bucket publicly

## 🔐 Key Rotation

To rotate the encryption key:

1. Generate new key: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
2. Keep old key as `ENCRYPTION_KEY_OLD`
3. Set new key as `ENCRYPTION_KEY`
4. Update `lib/encryption.ts` to try both keys on decrypt
5. Migrate files by re-encrypting with new key
6. Remove old key after migration

## 📝 API Endpoints

### `POST /api/upload`
Upload and encrypt a file
- Requires: Auth0 session
- Body: `multipart/form-data` with `file` field
- Returns: `{ success: true, file: {...} }`

### `GET /api/download?key={fileKey}`
Download and decrypt a file
- Requires: Auth0 session
- Query: `key` - the R2 object key
- Returns: Decrypted file as attachment

### `GET /api/files`
List user's encrypted files
- Requires: Auth0 session
- Returns: `{ files: [...] }`

## 🧪 Testing

1. Start dev server: `npm run dev`
2. Navigate to `http://localhost:3000`
3. Click "Login" and authenticate via Auth0
4. Upload a test file (it will be encrypted)
5. Download the file (it will be decrypted)
6. Verify the downloaded file matches the original

## 📚 Learn More

- [Auth0 Next.js SDK](https://github.com/auth0/nextjs-auth0)
- [AWS SDK for S3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)
- [Node.js Crypto](https://nodejs.org/api/crypto.html)

## 📄 License

MIT

## ⚠️ Disclaimer

This is a demonstration project. For production use, conduct a thorough security audit and implement additional security measures based on your specific requirements.
