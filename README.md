# SearchShare Pro

A professional Share of Search (SOS) and Share of Voice (SOV) analytics platform for agencies and brands. Built as a full-stack application with user authentication and cloud-ready deployment.

## Features

- **Share of Search Analysis**: Calculate your brand's search visibility vs competitors
- **Share of Voice Metrics**: Visibility-weighted analysis based on SERP positions
- **Growth Gap Analysis**: SOV - SOS gap indicates market share trajectory (Binet & Field research)
- **User Authentication**: Secure signup/login with JWT tokens
- **DataForSEO Integration**: Optional live data from DataForSEO API
- **Project Management**: Create, track, and compare multiple brand analyses
- **PDF Export**: Generate professional reports

## Tech Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** database
- **Prisma** ORM
- **JWT** authentication
- **Zod** validation

### Frontend
- **Vanilla JavaScript** (ES6+)
- **Chart.js** for visualizations
- **jsPDF** for report generation
- **Apple-inspired** glassmorphism design

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or use Docker)

### Using Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# The app will be available at:
# - Frontend: http://localhost:3000
# - API: http://localhost:3001
```

### Manual Setup

1. **Install dependencies**
```bash
npm run install:all
```

2. **Set up environment**
```bash
cp .env.example server/.env
# Edit server/.env with your database credentials
```

3. **Set up database**
```bash
cd server
npm run db:push
```

4. **Start development servers**
```bash
npm run dev
```

## Project Structure

```
searchshare-pro/
├── client/                 # Frontend application
│   └── public/
│       ├── index.html      # Main HTML
│       ├── styles.css      # Apple-inspired styles
│       ├── app.js          # Main application
│       └── api.js          # API client
│
├── server/                 # Backend API
│   ├── src/
│   │   ├── app.js          # Express app
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── middleware/     # Auth, error handling
│   └── prisma/
│       └── schema.prisma   # Database schema
│
├── docker-compose.yml      # Docker configuration
└── package.json            # Root monorepo config
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get profile
- `PUT /api/auth/api-credentials` - Update DataForSEO credentials

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/snapshot` - Create snapshot

### DataForSEO Proxy
- `POST /api/dataforseo/test` - Test connection
- `POST /api/dataforseo/volumes` - Get search volumes
- `POST /api/dataforseo/keyword-suggestions` - Get keyword suggestions
- `POST /api/dataforseo/serp-positions` - Get SERP positions

## Calculations

### Share of Search (SOS)
```
SOS = Brand Volume / Total Brand Volumes × 100
```
Measures brand demand relative to competitors.

### Share of Voice (SOV)
```
SOV = Visible Volume / Total Market Volume × 100

Visible Volume = Σ(Keyword Volume × CTR(position))
```
CTR model: Position 1 = 31.6%, Position 2 = 15.8%, etc.

### Growth Gap
```
Gap = SOV - SOS

Gap > 5pp  → Strong Growth Position (excess voice predicts growth)
Gap < -5pp → Visibility Gap (at-risk, needs SEO investment)
Gap ≈ 0    → Balanced (stable but static)
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret for signing JWTs (32+ chars) | Yes |
| `JWT_EXPIRES_IN` | Token expiration (e.g., "7d") | No |
| `PORT` | Server port (default: 3001) | No |
| `CORS_ORIGIN` | Allowed frontend origin | Yes |

## Deployment

### Railway
1. Create PostgreSQL database
2. Deploy server with environment variables
3. Deploy client (static files)

### Vercel + Railway
1. Vercel for frontend
2. Railway for backend + database

### Docker
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## License

MIT License
