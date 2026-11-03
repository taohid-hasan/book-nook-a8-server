import { Router } from "express";
import { verifyJWT } from "../middleware/verifyJWT.js";
import {
  borrowBook,
  getMyBorrows,
  returnBook,
  ensureBorrowsIndex,
} from "../controllers/borrowController.js";

const router = Router();

// Ensure unique partial index exists at route load time
ensureBorrowsIndex();

// POST /borrows  - protected
router.post("/", verifyJWT, borrowBook);

// GET /borrows  - own borrows only
router.get("/", verifyJWT, getMyBorrows);

// DELETE /borrows/:id  - borrower only, restores copy
router.delete("/:id", verifyJWT, returnBook);

export default router;
