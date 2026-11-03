import { Router } from "express";
import { verifyJWT, optionalJWT } from "../middleware/verifyJWT.js";
import {
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
} from "../controllers/bookController.js";

const router = Router();

// GET /books  - public with optional JWT (mine=true needs user)
router.get("/", optionalJWT, getAllBooks);

// GET /books/:id  - protected
router.get("/:id", verifyJWT, getBookById);

// POST /books  - protected
router.post("/", verifyJWT, createBook);

// PATCH /books/:id  - protected, owner only
router.patch("/:id", verifyJWT, updateBook);

// DELETE /books/:id  - protected, owner only
router.delete("/:id", verifyJWT, deleteBook);

export default router;
