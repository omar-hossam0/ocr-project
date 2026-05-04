import jwt from "jsonwebtoken";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || "";
  if (!secret) {
    throw new Error("JWT_SECRET is required");
  }
  return secret;
}

export function signToken(payload) {
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  return jwt.sign(payload, secret, { expiresIn });
}

export function authMiddleware(options = {}) {
  const requiredByEnv = process.env.JWT_REQUIRED === "1";
  const required = Boolean(options.required || requiredByEnv);

  return (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ")
      ? header.slice("Bearer ".length)
      : header;

    if (!token) {
      if (required) {
        return res.status(401).json({
          success: false,
          error: "Missing Authorization header",
        });
      }
      return next();
    }

    try {
      const secret = getJwtSecret();
      const payload = jwt.verify(token, secret);
      req.user = payload;
      return next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired token",
      });
    }
  };
}
