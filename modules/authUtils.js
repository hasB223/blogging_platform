const jwt = require("jsonwebtoken");
//fetch current user id and generate token using JWT
async function generateToken(userCred) {
  return new Promise((resolve, reject) => {
    const uid = userCred.user.uid;
    const token = jwt.sign({ userId: uid }, process.env.JWT_AUTH_TOKEN, {
      expiresIn: "45min",
    });
    console.log(`uid: ${uid}`);
    console.log(`token: ${token}`);
    if (token) {
      resolve(token);
    } else {
      reject("Token generation failed");
    }
  });
}

// Set access token to cookie
function setAccessToken(res, token) {
  res.cookie("access_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  });
  // .set({
  //   "Cache-Control": "no-store",
  //   Pragma: "no-cache",
  //   Expires: "0",
  // });
}

module.exports = { generateToken, setAccessToken };
