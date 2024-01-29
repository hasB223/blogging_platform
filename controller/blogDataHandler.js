const asyncHandler = require("express-async-handler");
const sanitizeHtml = require("sanitize-html");
const {
  uploadToStorage,
  saveToFirestore,
  addComment,
  updateLikes,
} = require("../modules/firebaseAuth");
const {
  showCreateBlogPage,
  showBlogPost,
} = require("../controller/blogRenderer");
const multer = require("multer");
const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage }).single("image");
const { check, validationResult } = require("express-validator");

//@desc Save blog post entry to database
//@route POST /blog/create
//@access private
// Define validation rules for input fields
const saveBlogPostValidation = [
  check("title").trim().notEmpty().withMessage("Post Title is required"),
  check("subheader")
    .trim()
    .notEmpty()
    .withMessage("Post Subheader is required"),
  check("imageName").trim().notEmpty().withMessage("Image Name is required"),
  check("content").trim().notEmpty().withMessage("Article content is required"),
];

//Function to validate input fields and store any errors using express-validator
const validateNewBlogPost = async (req) => {
  await Promise.all(
    saveBlogPostValidation.map((validation) => validation.run(req))
  );
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errors.array().map((error) => error.msg);
  }
  return [];
};

// Function to sanitize input fields using sanitize-html
const sanitizeInputFields = (inputFields) => {
  const sanitizedFields = {};

  for (const key in inputFields) {
    sanitizedFields[key] = sanitizeHtml(inputFields[key]);
  }
  return sanitizedFields;
};
// Function to check for empty fields in the sanitized input fields
const checkEmptyFields = (fields) => {
  const emptyFields = Object.keys(fields).filter((key) => !fields[key]);
  if (emptyFields.length > 0) {
    return emptyFields.map((field) => `${field} is required`);
  }
  return [];
};

// Function to save the blog post to the database
const saveBlogPost = async (req, res, next) => {
  console.log("------>   #CHECKPOINT @blogDataHandler @saveBlogPost");
  try {
    const { title, subheader, imageName, content, userId, userEmail } =
      req.body;

    // Sanitize input fields
    const sanitizedFields = sanitizeInputFields({
      title,
      subheader,
      imageName,
      content,
      userId,
      userEmail,
    });

    // Validate the new blog post data
    const validationErrors = await validateNewBlogPost(req);
    if (validationErrors.length > 0) {
      req.errors = validationErrors;
      return showCreateBlogPage(req, res);
    }

    // Check for empty fields
    const emptyFieldErrors = checkEmptyFields(sanitizedFields);
    if (emptyFieldErrors.length > 0) {
      req.errors = emptyFieldErrors;
      return showCreateBlogPage(req, res);
    }

    //Upload image file to firebase storage
    const file = req.file;
    const imageUrl = await uploadToStorage(file);

    // Construct the blog entry object
    const blogEntry = {
      ...sanitizedFields,
      imageUrl,
    };

    // Save the blog post data to the Firestore database
    await saveToFirestore(blogEntry);
    res.redirect("/blog/post"); // Redirect to '/blog/post' -> most recent post
  } catch (error) {
    console.log("Error saving the blog post:", error);
    next({
      message: "An error occurred while saving the blog post.",
      status: 500,
    });
  }
};

// Handler function to save a new blog post
const saveNewBlogPost = asyncHandler(async (req, res, next) => {
  console.log("------>   #CHECKPOINT @blogDataHandler @saveNewBlogPost");
  upload(req, res, async (err) => {
    if (err) {
      console.log("Error in multer upload:", err);
      next({
        message: "An error occurred while uploading the file.",
        status: 500,
      });
    } else {
      await saveBlogPost(req, res, next);
    }
  });
});

//@desc Save user comments to database
//@route POST /comment
//@access private
// Define comment validation rules
const saveCommentValidation = [
  check("comment")
    .trim()
    .notEmpty()
    .withMessage("Comment is required before submission"),
];
const saveComment = asyncHandler(async (req, res, next) => {
  console.log("------>   #CHECKPOINT @blogDataHandler @saveComment");
  try {
    const { postId, userId, userEmail, comment } = req.body;
    const currentPageUrl = req.headers.referer;

    // Validate req.body using express-validator
    await Promise.all(
      saveCommentValidation.map((validation) => validation.run(req))
    );
    // Handle express-validator error
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map((error) => error.msg);
      req.errors = errorMessages; // Attach errors to req object
      req.params.id = postId; // Attach postId to req object
      return showBlogPost(req, res);
    }

    // Sanitize input field using sanitize-html
    const sanitizedComment = sanitizeHtml(comment);

    // Handle empty input field after sanitization
    if (sanitizedComment === "") {
      req.errors = ["Comment is required before submission"];
      req.params.id = postId; // Attach postId to req object
      return showBlogPost(req, res);
    }

    // Add comment to Firestore
    await addComment(postId, userId, userEmail, sanitizedComment);

    // Redirect user to the refreshed current page
    res.redirect(currentPageUrl);
  } catch (error) {
    console.error("Error adding comment:", error);
    next({
      message: "An error occurred while saving the comment.",
      status: 500,
    });
  }
});

//@desc Save user like to database
//@route POST /like
//@access private
const saveLike = asyncHandler(async (req, res) => {
  console.log("------>   #CHECKPOINT @blogDataHandler @saveLike");
  try {
    const postId = req.body.postId;
    const userId = req.body.userId;
    const liked = req.body.newLiked;
    // console.log("postId @saveLike", postId);
    // console.log("userId @saveLike", userId);
    // console.log("liked @saveLike", liked);
    const { likeCount, userLiked } = await updateLikes(postId, userId, liked);
    res.json({ likeCount, userLiked });
  } catch (error) {
    console.error("Error saving like:", error);
    next({ message: "An error occurred while saving the like.", status: 500 });
  }
});

module.exports = {
  saveNewBlogPost,
  saveComment,
  saveLike,
};
