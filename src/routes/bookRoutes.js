import { Router } from "express";
import { verifyJWT, optionalJWT } from "../middleware/verifyJWT.js";
import {
  getAllBooks,
  getBookById,
} from "../controllers/bookController.js";

const router = Router();

// GET /books  - public with optional JWT (mine=true needs user)
router.get("/", optionalJWT, getAllBooks);

// GET /books/:id  - protected
router.get("/:id", verifyJWT, getBookById);

export default router;
