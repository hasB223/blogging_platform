var express = require("express");
var router = express.Router();
const {
  showCreateBlogPage,
  showBlogPost,
  showAllPosts,
  getCommentHandler,
} = require("../controller/blogRenderer");
const {
  saveNewBlogPost,
  saveComment,
  saveLike,
} = require("../controller/blogDataHandler");
const validateToken = require("../middleware/validateTokenHandler");

// Use middleware to validate token for all routes in this router
router.use(validateToken);
router.route("/create").get(showCreateBlogPage).post(saveNewBlogPost);
router.get("/post/:id?", showBlogPost);
router.get("/all", showAllPosts);
router.route("/comment").post(saveComment).get(getCommentHandler);
router.post("/like", saveLike);

router.get("/test-error-handler", (req, res, next) => {
  next({
    message: "This is a test error",
    status: 500,
  });
});

module.exports = router;
