const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

const authenticationMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  try {
    if (!authHeader?.startsWith("Bearer ")) {

      return res.status(401).json({ msg: "Invalid or no token provided" });
    }
    const token = req.headers.authorization.split(" ")[1];
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;

    next();
  } catch (error) {
    console.log(error);

    return res.status(401).json({ msg: "Error retrieving token" });
  }
};

module.exports = authenticationMiddleware;
