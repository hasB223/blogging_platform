const jwt = require("jsonwebtoken");

// function handleAuthError(res, error, page, email)
function handleAuthError(error, req, res) {
  console.log("------>   #CHECKPOINT @errorHandler @handleAuthError");
  let errorMessage;
  let page;

  // Handle access token expiration
  if (error instanceof jwt.TokenExpiredError) {
    errorMessage = "Session has expired. Please log in again.";
    page = "login";
  } else {
    // Handle firebase authentication error messages for @POST /users/register & /users/login
    switch (error.code) {
      case "auth/user-not-found":
        errorMessage = "User not found. Please register.";
        page = "login";
        break;
      case "auth/wrong-password":
        errorMessage = "Wrong password. Please try again.";
        page = "login";
        break;
      case "auth/email-already-in-use":
        errorMessage =
          "Email already registered. Please login or use a different email address.";
        page = "register";
        break;
      case "auth/weak-password":
        errorMessage = "Password should be at least 6 characters.";
        page = "login";
        break;
      default:
        errorMessage = error;
        page = "login";
        break;
    }
  }
  console.log(error);
  res.status(401).render(page, { errorMessage, errors: req.errors || [] });
}

// Handle other error
function handleBlogError(err, req, res) {
  let errorMessage;
  let statusCode = err.code || 500;
  console.log("------>   #CHECKPOINT @errorHandler @handleBlogError");

  switch (statusCode) {
    case 404:
      errorMessage = "Sorry, the page you requested was not found.";
      break;
    case 500:
      errorMessage = "Sorry, something went wrong on the server.";
      break;
    default:
      errorMessage = "An error occurred.";
      console.log(err);
      break;
  }
  if (err.message) {
    // If the error contains a message property, use it as the error message instead
    errorMessage = err.message;
  }
  console.log(err);
  res.status(statusCode).render("errorPage", { errorMessage });
}
exports.handleAuthError = handleAuthError;
exports.handleBlogError = handleBlogError;
