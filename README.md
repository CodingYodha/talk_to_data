# Talk to Data

A production-ready Text-to-SQL agent that converts natural language questions into SQL queries. Connect it to your database, ask questions in plain English, and get instant answers with visualizations.

## Quick Start (One Command)

```bash
docker run -p 8000:8000 \
  -e ANTHROPIC_API_KEY=your_anthropic_key \
  talk-to-data
```

Then open [http://localhost:8000](http://localhost:8000)

---

## Features

| Feature | Description |
|---------|-------------|
| **Natural Language Queries** | Ask questions in plain English, get SQL results |
| **Multi-Model AI** | Claude (paid) or Groq (free) - switch in settings |
| **Universal Database** | SQLite, PostgreSQL, MySQL - one config change |
| **Self-Correcting** | Automatically retries failed queries with fixes |
| **Deep Analysis** | Auto-generates charts and insights from results |
| **Read-Only Safety** | Blocks all write operations to protect your data |
| **Mobile Optimized** | Responsive design works on all devices |
| **Single Container** | Frontend + Backend + Demo DB in one image |

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key for Claude models |
| `GROQ_API_KEY` | No | Groq API key for free tier models |
| `DATABASE_URL` | No | External database connection string |
| `PORT` | No | Server port (default: 8000) |

### Connect Your Database

**PostgreSQL:**
```bash
docker run -p 8000:8000 \
  -e ANTHROPIC_API_KEY=your_key \
  -e DATABASE_URL=postgresql://user:pass@host:5432/dbname \
  talk-to-data
```

**MySQL:**
```bash
docker run -p 8000:8000 \
  -e ANTHROPIC_API_KEY=your_key \
  -e DATABASE_URL=mysql://user:pass@host:3306/dbname \
  talk-to-data
```

**SQLite (default):**
No `DATABASE_URL` needed - uses the built-in demo database.

---

## Cloud Deployment

### Railway

1. Push your code to GitHub
2. Go to [railway.app](https://railway.app) and connect your repo
3. Railway auto-detects the `railway.json` configuration
4. Add environment variables in the dashboard:
   - `ANTHROPIC_API_KEY`
   - `GROQ_API_KEY` (optional)
   - `DATABASE_URL` (optional)
5. Deploy

### Render

1. Push your code to GitHub
2. Go to [render.com](https://render.com) and create a new Web Service
3. Connect your repo - Render auto-detects `render.yaml`
4. Add environment variables in the dashboard
5. Deploy

### Any Docker Host

```bash
# Build
docker build -t talk-to-data .

# Run
docker run -d -p 8000:8000 \
  --name talk-to-data \
  -e ANTHROPIC_API_KEY=your_key \
  -e DATABASE_URL=your_db_url \
  talk-to-data
```

---

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 20+

### Setup

```bash
# Clone the repo
git clone https://github.com/your-repo/talk-to-data.git
cd talk-to-data

# Create .env file
echo "ANTHROPIC_API_KEY=your_key" > .env

# Install backend
cd backend
pip install -r ../requirements.txt

# Install frontend
cd ../frontend
npm install

# Run backend (terminal 1)
cd backend && python main.py

# Run frontend (terminal 2)
cd frontend && npm run dev
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check with database ping |
| `/api/query` | POST | Execute a natural language query |
| `/api/query/stream` | POST | Stream query results (SSE) |
| `/api/analyze` | POST | Generate chart from query results |

---

## Architecture

```
talk-to-data/
├── backend/
│   ├── main.py           # FastAPI server
│   ├── config.py         # Centralized settings
│   ├── agent_engine.py   # Query orchestration
│   ├── llm_client.py     # AI model interface
│   ├── database_utils.py # Universal DB connector
│   └── analysis_engine.py# Chart generation
├── frontend/
│   └── src/              # React application
├── assets/
│   └── chinook.db        # Demo database
├── Dockerfile            # Multi-stage build
├── railway.json          # Railway config
└── render.yaml           # Render config
```

---

## License

MIT
