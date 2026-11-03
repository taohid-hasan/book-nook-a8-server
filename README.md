# BookNook Server

A RESTful API backend for the **BookNook** library management application. Built with **Express.js** (ES Modules), **MongoDB**, and **Better Auth** JWT verification via JWKS.

---

## Features

- JWT authentication via Better Auth JWKS (`createRemoteJWKSet`)
- CORS restricted to the configured client origin
- Serverless-safe MongoDB connection (connection caching for Vercel)
- Atomic borrow operations with race-condition protection
- Unique partial index preventing double-borrows

---

## API Endpoints

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Public | Health check — returns `{ message: "BookNook API running" }` |

### Books

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/books` | Public (`optionalJWT`) | List all books. Query: `sort=newest`, `limit`, `category`, `search`, `mine=true` |
| `GET` | `/books/:id` | `verifyJWT` | Get a single book by ID |
| `POST` | `/books` | `verifyJWT` | Add a new book (`addedBy` set from JWT) |
| `PATCH` | `/books/:id` | `verifyJWT` (owner only) | Update book fields; adjusts `availableCopies` if `totalCopies` changes |
| `DELETE` | `/books/:id` | `verifyJWT` (owner only) | Delete book and all its related borrow records |

### Borrows

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/borrows` | `verifyJWT` | Borrow a book. Body: `{ bookId }`. Atomic copy decrement; 409 on double-borrow |
| `GET` | `/borrows` | `verifyJWT` | Get the current user's active borrows |
| `DELETE` | `/borrows/:id` | `verifyJWT` (borrower only) | Return a book; increments `availableCopies` by 1 |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/?retryWrites=true&w=majority
DB_NAME=booknook
JWKS_URL=http://localhost:5000/api/auth/jwks
```

| Variable | Description |
|----------|-------------|
| `PORT` | Port the server listens on (default: `5000`) |
| `CLIENT_URL` | Allowed CORS origin (your frontend URL) |
| `MONGO_URI` | MongoDB connection string |
| `DB_NAME` | MongoDB database name |
| `JWKS_URL` | Better Auth JWKS endpoint (e.g. `https://your-auth-server.com/api/auth/jwks`) |

---

## Local Development

```bash
# 1. Clone the repository
git clone https://github.com/taohid-hasan/book-nook-a8-server.git
cd book-nook-a8-server

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your values

# 4. Start the development server (with file watch)
npm run dev
```

Server starts at `http://localhost:5000`.

---

## Production / Vercel Deployment

1. Push the repository to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Add all environment variables from `.env.example` in the Vercel project settings.
4. Vercel auto-detects `vercel.json` and deploys `index.js` as a serverless function.

> The app exports `export default app` and skips `app.listen()` when `process.env.VERCEL` is set, making it fully compatible with Vercel's serverless runtime.

---

## Tech Stack

| Package | Purpose |
|---------|---------|
| `express` | Web framework |
| `cors` | Cross-Origin Resource Sharing |
| `dotenv` | Environment variable loading |
| `mongodb` | MongoDB Node.js driver |
| `jose` | JWT verification via JWKS (`createRemoteJWKSet`) |

