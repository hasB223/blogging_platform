const asyncHandler = require("express-async-handler");
const {
  getBlogPosts,
  getLikes,
  getCurrentUserDetails,
} = require("../modules/firebaseAuth");

//@desc Render create-blog page
//@route GET /blog/create
//@access private
const showCreateBlogPage = asyncHandler(async (req, res, next) => {
  console.log("------>   #CHECKPOINT @blogRenderer @showCreateBlogPage");
  const userEncoded = req.user;
  try {
    const currentUser = await getCurrentUserDetails(userEncoded);
    res.render("createPost", {
      title: "Create Post",
      currentUser,
      errors: req.errors || [],
    });
  } catch (error) {
    next({
      message: "An error occurred while showing the create page.",
      status: 500,
    });
  }
});

//@desc Retrieve all blog posts from database and render them in cards grids
//@route GET `/blog/all`
//@access private
const showAllPosts = asyncHandler(async (req, res, next) => {
  console.log("------>   #CHECKPOINT @blogRenderer @showAllPosts");
  try {
    // Get current user
    const posts = await getBlogPosts();

    // Render the blog-posts view with current post and page number
    res.render("blogEntries", {
      posts,
    });
  } catch (error) {
    console.error("An error occurred while fetching blog entries:", error);
    next({
      message: "An error occurred while fetching blog entries.",
      status: 500,
    });
  }
});

//@desc Retrieve blog posts from database and render them
//@route GET `/blog/post/:id?`
//@access private
const showBlogPost = asyncHandler(async (req, res, next) => {
  console.log("------>   #CHECKPOINT @blogRenderer @showBlogPost");
  const postId = req.params.id;
  try {
    // Get current user
    const userEncoded = req.user;
    const currentUser = await getCurrentUserDetails(userEncoded);

    // Retrieve and sort posts from Firestore
    const posts = await getBlogPosts();

    let currentPost;
    if (!postId) {
      // If no post ID is specified, show the first or most recent post
      const firstPost = posts[0]; // Assuming the posts are already sorted by descending createdAt order
      currentPost = firstPost;
    } else {
      currentPost = posts.find((post) => post.id === postId);
      if (!currentPost) {
        //handle no post found
        next({
          message: "No post with the requested ID available.",
          status: 404,
        });
      }
    }
    // Retrieve post likes
    const { likeCount, userLiked } = await getLikes(
      currentPost.id,
      currentUser.id
    );
    console.log("currentPost:", currentPost);
    //Handle pagination
    const currentPostIndex = posts.findIndex(
      (post) => post.id === currentPost.id
    );
    const nextPageId =
      currentPostIndex > 0 ? posts[currentPostIndex - 1].id : null;
    const previousPageId =
      currentPostIndex < posts.length - 1
        ? posts[currentPostIndex + 1].id
        : null;
    const pagination = {
      hasNextPage: nextPageId,
      hasPreviousPage: previousPageId,
    };

    // Render the blog-posts view with current post and page number
    res.render("blogPost", {
      posts,
      currentPost,
      pagination,
      currentUser,
      likeCount,
      userLiked,
      errors: req.errors || [],
    });
  } catch (error) {
    console.error("An error occurred while fetching the blog posts:", error);
    next({
      message: "An error occurred while fetching the blog posts.",
      status: 500,
    });
  }
});

//@desc Handle GET request initiated by FaviconLoader.jsm that caused error
//@route GET /comment
//@access private
const getCommentHandler = (req, res) => {
  console.log("------>   #CHECKPOINT @blogRenderer @getCommentHandler");
  {
    if (req.originalUrl === "/blog/comment" && req.method === "GET") {
      // Ignore the request for GET /blog/comment
      return res.status(200).end();
    }
    next(); // Continue processing other routes
  }
};

module.exports = {
  showCreateBlogPage,
  showBlogPost,
  showAllPosts,
  getCommentHandler,
};
