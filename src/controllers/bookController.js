import { ObjectId } from "mongodb";
import { connectDB } from "../config/db.js";

const getCollection = async () => {
  const db = await connectDB();
  return db.collection("books");
};

/**
 * GET /books
 * Public (optionalJWT). Supports: sort=newest, limit, category, search, mine=true
 */
export const getAllBooks = async (req, res, next) => {
  try {
    const col = await getCollection();
    const { sort, limit, category, search, mine } = req.query;

    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
      ];
    }

    if (mine === "true") {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: Login required to view your books",
        });
      }
      filter["addedBy.email"] = req.user.email;
    }

    const sortOption = sort === "newest" ? { createdAt: -1 } : { createdAt: -1 };

    let cursor = col.find(filter).sort(sortOption);

    if (limit) {
      const parsedLimit = parseInt(limit, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        cursor = cursor.limit(parsedLimit);
      }
    }

    const books = await cursor.toArray();

    res.status(200).json({
      success: true,
      count: books.length,
      data: books,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /books/:id
 * Protected (verifyJWT). Validates ObjectId, 404 if not found.
 */
export const getBookById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
    }

    const col = await getCollection();
    const book = await col.findOne({ _id: new ObjectId(id) });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    res.status(200).json({
      success: true,
      data: book,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /books
 * Protected (verifyJWT). addedBy from JWT, not body. availableCopies = totalCopies.
 */
export const createBook = async (req, res, next) => {
  try {
    const { title, author, category, image, description, totalCopies } = req.body;

    // Validate required fields
    if (!title || !author || !category || !totalCopies) {
      return res.status(400).json({
        success: false,
        message: "title, author, category, and totalCopies are required",
      });
    }

    const parsedTotal = parseInt(totalCopies, 10);
    if (isNaN(parsedTotal) || parsedTotal < 1) {
      return res.status(400).json({
        success: false,
        message: "totalCopies must be a positive integer",
      });
    }

    const newBook = {
      title: title.trim(),
      author: author.trim(),
      category: category.trim(),
      image: image?.trim() || "",
      description: description?.trim() || "",
      totalCopies: parsedTotal,
      availableCopies: parsedTotal,   // availableCopies = totalCopies on creation
      addedBy: {
        name: req.user.name,          // from JWT, not body
        email: req.user.email,
      },
      createdAt: new Date(),
    };

    const col = await getCollection();
    const result = await col.insertOne(newBook);

    res.status(201).json({
      success: true,
      message: "Book added successfully",
      data: { ...newBook, _id: result.insertedId },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /books/:id
 * Protected (verifyJWT). Owner only (403 otherwise).
 * Adjusts availableCopies proportionally if totalCopies changes.
 */
export const updateBook = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
    }

    const col = await getCollection();
    const book = await col.findOne({ _id: new ObjectId(id) });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    // Owner check
    if (book.addedBy?.email !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not the owner of this book",
      });
    }

    const { title, author, category, image, description, totalCopies } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (author !== undefined) updates.author = author.trim();
    if (category !== undefined) updates.category = category.trim();
    if (image !== undefined) updates.image = image.trim();
    if (description !== undefined) updates.description = description.trim();

    // Adjust availableCopies if totalCopies changes
    if (totalCopies !== undefined) {
      const newTotal = parseInt(totalCopies, 10);
      if (isNaN(newTotal) || newTotal < 1) {
        return res.status(400).json({
          success: false,
          message: "totalCopies must be a positive integer",
        });
      }
      // Keep the same number of borrowed copies; only adjust available
      const borrowedCopies = book.totalCopies - book.availableCopies;
      const newAvailable = Math.max(0, newTotal - borrowedCopies);
      updates.totalCopies = newTotal;
      updates.availableCopies = newAvailable;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided to update",
      });
    }

    const result = await col.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updates },
      { returnDocument: "after" }
    );

    res.status(200).json({
      success: true,
      message: "Book updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /books/:id
 * Protected (verifyJWT). Owner only (403 otherwise).
 * Also deletes related borrows.
 */
export const deleteBook = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
    }

    const col = await getCollection();
    const book = await col.findOne({ _id: new ObjectId(id) });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    // Owner check
    if (book.addedBy?.email !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not the owner of this book",
      });
    }

    const db = await connectDB();

    // Delete related borrows first
    const borrowsResult = await db.collection("borrows").deleteMany({
      bookId: new ObjectId(id),
    });

    // Delete the book
    await col.deleteOne({ _id: new ObjectId(id) });

    res.status(200).json({
      success: true,
      message: "Book deleted successfully",
      deletedBorrows: borrowsResult.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};
