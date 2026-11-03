import { Router } from "express";
import { verifyJWT, optionalJWT } from "../middleware/verifyJWT.js";
import {
  getAllBooks,
  getBookById,
  createBook,
} from "../controllers/bookController.js";

const router = Router();

// GET /books  - public with optional JWT (mine=true needs user)
router.get("/", optionalJWT, getAllBooks);

// GET /books/:id  - protected
router.get("/:id", verifyJWT, getBookById);

// POST /books  - protected
router.post("/", verifyJWT, createBook);

export default router;
