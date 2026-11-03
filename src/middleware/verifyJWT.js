import { createRemoteJWKSet, jwtVerify } from "jose";
import dotenv from "dotenv";

dotenv.config();

const JWKS_URL = process.env.JWKS_URL;

// Create the JWKS set once outside the handler
let JWKS = null;
if (JWKS_URL) {
  try {
    JWKS = createRemoteJWKSet(new URL(JWKS_URL));
  } catch (error) {
    console.error("Failed to initialize JWKS from JWKS_URL:", error.message);
  }
}

const getJWKS = () => {
  if (JWKS) return JWKS;
  const url = process.env.JWKS_URL;
  if (!url) {
    throw new Error("JWKS_URL is not defined in environment variables");
  }
  JWKS = createRemoteJWKSet(new URL(url));
  return JWKS;
};

/**
 * Middleware to verify JWT using Better Auth JWKS
 */
export const verifyJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Token not provided",
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Token not provided",
      });
    }

    const jwks = getJWKS();
    const { payload } = await jwtVerify(token, jwks);

    req.user = {
      email: payload.email,
      name: payload.name,
      id: payload.id || payload.sub,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or expired token",
    });
  }
};

/**
 * Optional JWT middleware: attaches user if valid token is provided,
 * otherwise sets req.user = null and proceeds without blocking.
 */
export const optionalJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const jwks = getJWKS();
    const { payload } = await jwtVerify(token, jwks);

    req.user = {
      email: payload.email,
      name: payload.name,
      id: payload.id || payload.sub,
    };
  } catch (error) {
    req.user = null;
  }

  next();
};

export default verifyJWT;
