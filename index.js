import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./src/config/db.js";
import bookRoutes from "./src/routes/bookRoutes.js";
import borrowRoutes from "./src/routes/borrowRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// CORS configuration - only for CLIENT_URL with Authorization header
const corsOptions = {
  origin: process.env.CLIENT_URL,
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());

// Initialize MongoDB connection
connectDB().catch((err) => {
  console.error("Failed to connect to MongoDB at startup:", err.message);
});

// Routes
app.use("/books", bookRoutes);
app.use("/borrows", borrowRoutes);

// Health check route
app.get("/", (req, res) => {
  res.status(200).json({ message: "BookNook API running" });
});

// JSON 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

export default app;

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}
