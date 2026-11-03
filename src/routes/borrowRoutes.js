import { Router } from "express";
import { verifyJWT } from "../middleware/verifyJWT.js";
import { borrowBook, ensureBorrowsIndex } from "../controllers/borrowController.js";

const router = Router();

// Ensure unique partial index exists at route load time
ensureBorrowsIndex();

// POST /borrows  - protected
router.post("/", verifyJWT, borrowBook);

export default router;
