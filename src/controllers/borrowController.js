import { ObjectId } from "mongodb";
import { connectDB } from "../config/db.js";

const getBorrowsCol = async () => {
  const db = await connectDB();
  return db.collection("borrows");
};

const getBooksCol = async () => {
  const db = await connectDB();
  return db.collection("books");
};

/**
 * Ensure unique partial index on { bookId, userEmail } exists.
 * Called once at startup via borrowRoutes; safe to call multiple times.
 */
export const ensureBorrowsIndex = async () => {
  try {
    const col = await getBorrowsCol();
    await col.createIndex(
      { bookId: 1, userEmail: 1 },
      {
        unique: true,
        name: "unique_active_borrow",
        partialFilterExpression: { returned: { $ne: true } },
      }
    );
  } catch (err) {
    // Index already exists — safe to ignore
    if (err.code !== 85 && err.code !== 86) {
      console.error("Failed to create borrows index:", err.message);
    }
  }
};

/**
 * POST /borrows
 * Protected (verifyJWT). Body: { bookId }
 * - 409 if already borrowed
 * - Atomically decrements availableCopies; 400 if none available
 * - Rolls back $inc on insert failure
 */
export const borrowBook = async (req, res, next) => {
  const db = await connectDB();
  const booksCol = db.collection("books");
  const borrowsCol = db.collection("borrows");

  try {
    const { bookId } = req.body;

    if (!bookId || !ObjectId.isValid(bookId)) {
      return res.status(400).json({
        success: false,
        message: "A valid bookId is required",
      });
    }

    const bookObjectId = new ObjectId(bookId);
    const { email: userEmail, name: userName } = req.user;

    // ── 1. Double-borrow check ───────────────────────────────────────
    const existing = await borrowsCol.findOne({
      bookId: bookObjectId,
      userEmail,
      returned: { $ne: true },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "You have already borrowed this book",
      });
    }

    // ── 2. Atomic copy decrement ─────────────────────────────────────
    const updatedBook = await booksCol.findOneAndUpdate(
      { _id: bookObjectId, availableCopies: { $gt: 0 } },
      { $inc: { availableCopies: -1 } },
      { returnDocument: "after" }
    );

    if (!updatedBook) {
      return res.status(400).json({
        success: false,
        message: "Not Available",
      });
    }

    // ── 3. Insert borrow document ────────────────────────────────────
    const borrowDate = new Date();
    const returnDate = new Date(borrowDate);
    returnDate.setDate(returnDate.getDate() + 7); // +7 days

    const borrowDoc = {
      bookId: bookObjectId,
      bookTitle: updatedBook.title,
      bookImage: updatedBook.image || "",
      userEmail,
      userName,
      borrowDate,
      returnDate,
      returned: false,
    };

    try {
      const result = await borrowsCol.insertOne(borrowDoc);
      return res.status(201).json({
        success: true,
        message: "Book borrowed successfully",
        data: { ...borrowDoc, _id: result.insertedId },
      });
    } catch (insertErr) {
      // ── 4. Rollback: restore copy on insert failure ──────────────
      await booksCol.updateOne(
        { _id: bookObjectId },
        { $inc: { availableCopies: 1 } }
      );

      // Duplicate key = race-condition double-borrow
      if (insertErr.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "You have already borrowed this book",
        });
      }
      throw insertErr;
    }
  } catch (error) {
    next(error);
  }
};
