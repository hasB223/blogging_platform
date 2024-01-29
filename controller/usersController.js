const asyncHandler = require("express-async-handler");
const {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} = require("../modules/firebaseAuth");
const { generateToken, setAccessToken } = require("../modules/authUtils");
const { handleAuthError } = require("../modules/errorHandler");
const { check, validationResult } = require("express-validator");
const sanitizeHtml = require("sanitize-html");

//@desc Render Login page
//@route GET /users/login
//@access public
const showLoginPage = (req, res) => {
  console.log("------>   #CHECKPOINT @userController @showLoginPage");
  res.render("login", { errorMessage: "", errors: req.errors || [] });
};

//@desc Render Register page
//@route GET /users/register
//@access public
const showRegisterPage = (req, res) => {
  console.log("------>   #CHECKPOINT @userController @showRegisterPage");
  res.render("register", { errorMessage: "", errors: req.errors || [] });
};

//@desc Login a user
//@route POST /users/login
//@access public
const userLoginValidation = [
  check("email")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address"),
  check("password")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];
const userLogin = asyncHandler(async (req, res, next) => {
  console.log("------>   #CHECKPOINT @userController @userLogin");
  const { email, password } = req.body;
  // Validate req.body
  await Promise.all(
    userLoginValidation.map((validation) => validation.run(req))
  );

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    req.errors = errorMessages; // Attach errors to req object
    return showLoginPage(req, res);
  }
  try {
    // Attempt to authenticate user with Firebase Authentication
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    //generate token and pass it as cookie
    try {
      const token = await generateToken(userCredential);
      setAccessToken(res, token);
      res.redirect(`/blog/post`);
    } catch (error) {
      console.log(error);
    }
  } catch (error) {
    handleAuthError(error, req, res);
  }
});

//@desc Register a user
//@route POST /users/register
//@access public
const userRegisterValidation = [
  check("username").trim().notEmpty().withMessage("Username is required"),
  check("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address"),
  check("password")
    .trim()
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

const userRegister = asyncHandler(async (req, res) => {
  console.log("------>   #CHECKPOINT @userController @userRegister");
  const { username, email, password } = req.body;

  // Validate req.body
  await Promise.all(
    userRegisterValidation.map((validation) => validation.run(req))
  );

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    req.errors = errorMessages; // Attach errors to req object
    return showRegisterPage(req, res);
  }

  // Sanitize input fields using sanitize-html
  const sanitizedUsername = sanitizeHtml(username);
  const sanitizedEmail = sanitizeHtml(email);
  const sanitizedPassword = sanitizeHtml(password);

  // Check if sanitized values are empty
  if (!sanitizedUsername) {
    req.errors = ["Username is required"];
    return showRegisterPage(req, res);
  }
  if (!sanitizedEmail) {
    req.errors = ["Email is required"];
    return showRegisterPage(req, res);
  }
  if (!sanitizedPassword) {
    req.errors = ["Password is required"];
    return showRegisterPage(req, res);
  }

  try {
    // Create user with Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      sanitizedEmail,
      sanitizedPassword
    );
    console.log(`New user registered and logged-in: ${sanitizedEmail} `);

    // Update user's displayName
    await updateProfile(auth.currentUser, { displayName: sanitizedUsername })
      .then(() => {
        console.log(
          `Username updated to database: ${sanitizedUsername} (${sanitizedEmail})`
        );
      })
      .catch((error) => {
        console.log(error);
      });

    //generate token and pass it as cookie
    try {
      const token = await generateToken(userCredential);
      setAccessToken(res, token);
      res.redirect(`/blog/post`);
    } catch (error) {
      console.log(error);
    }
  } catch (error) {
    handleAuthError(error, req, res);
  }
});

//@desc Logout a user
//@route POST /users/logout
//@access public
const userLogout = asyncHandler(async (req, res) => {
  console.log("------>   #CHECKPOINT @userController @userLogout");
  try {
    await signOut(auth);
    console.log("successful user logout");
    res.clearCookie("access_token").redirect("/users/login");
  } catch (error) {
    console.log("user logout unsuccessful");
    console.log(error);
    res.redirect("/users/login");
  }
});

module.exports = {
  showLoginPage,
  showRegisterPage,
  userLogin,
  userRegister,
  userLogout,
};
