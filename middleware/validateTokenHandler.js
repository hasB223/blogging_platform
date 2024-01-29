const jwt = require("jsonwebtoken");
const { handleAuthError } = require("../modules/errorHandler");

module.exports = (req, res, next) => {
  console.log("------>   #CHECKPOINT @validateTokenHandler");
  const token = req.cookies.access_token;
  if (!token) {
    const error = "User is not authorized";
    handleAuthError(error, req, res);
    return;
  }

  // Verify token with ACCESS_TOKEN_SECRET
  jwt.verify(token, process.env.JWT_AUTH_TOKEN, (err, decoded) => {
    try {
      if (err) {
        handleAuthError(err, req, res);
        return;
      }
      // Attach user object from decoded token to request object
      req.user = decoded.userId;
      // console.log("decoded:", decoded);

      // Call the next middleware
      next();
    } catch (err) {
      console.error(err);
      handleAuthError(err, req, res);
    }
  });
};
