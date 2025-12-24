# SearchShare Pro

A professional Share of Search (SOS) and Share of Voice (SOV) analytics platform for agencies and brands. Built for deployment on Vercel with Postgres.

## Features

- **Share of Search Analysis**: Calculate your brand's search visibility vs competitors
- **Share of Voice Metrics**: Visibility-weighted analysis based on SERP positions
- **Growth Gap Analysis**: SOV - SOS gap indicates market share trajectory
- **User Authentication**: Secure signup/login with JWT tokens
- **DataForSEO Integration**: Optional live data from DataForSEO API
- **Project Management**: Create, track, and compare multiple brand analyses
- **PDF Export**: Generate professional reports

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), Chart.js, jsPDF
- **Backend**: Vercel Serverless Functions
- **Database**: Vercel Postgres (PostgreSQL)
- **ORM**: Prisma
- **Auth**: JWT tokens with bcrypt

## Deploy to Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/searchshare-pro)

### Manual Deployment

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Vercel will auto-detect the configuration

3. **Add Vercel Postgres**
   - In your Vercel project, go to **Storage** tab
   - Click **Create Database** → **Postgres**
   - This automatically adds the required environment variables

4. **Add Environment Variables**
   In Vercel project settings → Environment Variables:
   ```
   JWT_SECRET=your-super-secret-jwt-key-min-32-chars
   JWT_EXPIRES_IN=7d
   ```

5. **Deploy**
   - Vercel will automatically build and deploy
   - Prisma migrations run on first API call

## Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your database credentials
   ```

3. **Generate Prisma client**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Run development server**
   ```bash
   npx vercel dev
   ```

## Project Structure

```
searchshare-pro/
├── api/                    # Vercel Serverless Functions
│   ├── auth/
│   │   ├── signup.js
│   │   ├── login.js
│   │   ├── me.js
│   │   └── api-credentials.js
│   ├── projects/
│   │   ├── index.js
│   │   ├── [id].js
│   │   └── [id]/
│   │       ├── snapshot.js
│   │       └── recommendations.js
│   └── dataforseo/
│       ├── test.js
│       ├── volumes.js
│       └── ...
├── lib/                    # Shared utilities
│   ├── prisma.js
│   ├── auth.js
│   └── calculations.js
├── prisma/
│   └── schema.prisma
├── public/                 # Static frontend
│   ├── index.html
│   ├── app.js
│   ├── api.js
│   └── styles.css
├── vercel.json
└── package.json
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get profile |
| PUT | `/api/auth/api-credentials` | Update DataForSEO credentials |
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| POST | `/api/projects/:id/snapshot` | Create snapshot |
| GET | `/api/projects/:id/recommendations` | Get recommendations |

## Calculations

### Share of Search (SOS)
```
SOS = Brand Volume / Total Brand Volumes × 100
```

### Share of Voice (SOV)
```
SOV = Visible Volume / Total Market Volume × 100
Visible Volume = Σ(Keyword Volume × CTR(position))
```

### Growth Gap
```
Gap = SOV - SOS
Gap > 5pp  → Growing (excess voice predicts growth)
Gap < -5pp → At Risk (needs SEO investment)
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `POSTGRES_PRISMA_URL` | Postgres connection (pooled) | Yes* |
| `POSTGRES_URL_NON_POOLING` | Postgres direct connection | Yes* |
| `JWT_SECRET` | Secret for JWT signing | Yes |
| `JWT_EXPIRES_IN` | Token expiration (e.g., "7d") | No |

*Automatically set by Vercel Postgres

## License

MIT License
