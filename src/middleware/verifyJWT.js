import { jwtVerify } from "jose";

/**
 * Middleware to verify JWT using jose
 */
export const verifyJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access: Token not provided",
      });
    }

    const token = authHeader.split(" ")[1];
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "default_jwt_secret"
    );

    const { payload } = await jwtVerify(token, secret);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access: Invalid or expired token",
    });
  }
};

export default verifyJWT;

