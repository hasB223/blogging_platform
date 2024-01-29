var express = require("express");
var router = express.Router();
const {
  showLoginPage,
  showRegisterPage,
  userLogin,
  userRegister,
  userLogout,
} = require("../controller/usersController");

// Define your routes
router.route("/login").get(showLoginPage).post(userLogin);
router.route("/register").get(showRegisterPage).post(userRegister);
router.get("/logout", userLogout);

module.exports = router;
