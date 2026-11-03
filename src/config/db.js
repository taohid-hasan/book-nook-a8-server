import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME || "booknook";

let cachedClient = null;
let cachedDb = null;

/**
 * Connect to MongoDB and reuse connection across serverless invocations
 * @returns {Promise<import("mongodb").Db>}
 */
export async function connectDB() {
  if (cachedDb) {
    return cachedDb;
  }

  if (!uri) {
    throw new Error("MONGO_URI is not defined in environment variables");
  }

  if (!cachedClient) {
    cachedClient = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });

    await cachedClient.connect();
    console.log("Successfully connected to MongoDB");
  }

  cachedDb = cachedClient.db(dbName);
  return cachedDb;
}

/**
 * Get the cached MongoClient instance
 * @returns {Promise<MongoClient>}
 */
export async function getClient() {
  if (!cachedClient) {
    await connectDB();
  }
  return cachedClient;
}

export default connectDB;
