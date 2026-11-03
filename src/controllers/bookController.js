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
