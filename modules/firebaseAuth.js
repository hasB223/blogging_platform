const admin = require("firebase-admin");
const firebase = require("firebase/app");
require("firebase/firestore");
require("firebase/auth");
require("firebase/storage");
const { handleAuthError } = require("../modules/errorHandler");

// Firebase configuration for Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBeyEDoap7l2c0bSWSNHKKaCGWGAXBHzfs",
  authDomain: "bloggingplatform-c0890.firebaseapp.com",
  projectId: "bloggingplatform-c0890",
  storageBucket: "bloggingplatform-c0890.appspot.com",
  messagingSenderId: "360519859749",
  appId: "1:360519859749:web:442f7d6754401ac27ec9cc",
};

// Initialize Firebase-admin
const serviceAccount = require("./creds.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
// Initialize Firebase
const firebaseApp = firebase.initializeApp(firebaseConfig);

// fetch firebase/auth methods from firebase package
const {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} = require("firebase/auth");

// fetch firestore methods from firebase package
const {
  getFirestore,
  collection,
  query,
  addDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  getDocs,
  where,
  doc,
} = require("firebase/firestore");

// fetch firebase/storage methods from firebase package
const {
  getStorage,
  ref,
  getDownloadURL,
  uploadBytesResumable,
} = require("firebase/storage");

// storage folder path: gs://bloggingplatform-c0890.appspot.com
const storageBucketURL = "bloggingplatform-c0890.appspot.com";

// Initialize services
const db = getFirestore();
const auth = getAuth();
const storage = getStorage(firebaseApp, storageBucketURL);

// Collection reference
const blogPostsRef = collection(db, "blogposts");

// Function to upload image to firebase storage
const uploadToStorage = async (file) => {
  console.log("------>   #CHECKPOINT @firebaseAuth @uploadToStorage");
  const storageRef = ref(storage, file.originalname);
  const metadata = {
    contentType: file.mimetype,
  };
  const uploadTask = uploadBytesResumable(storageRef, file.buffer, metadata);

  try {
    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const uploaded = Math.floor(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          console.log(uploaded);
        },
        (error) => {
          console.log("error occur in uploadTask:", error);
          reject(error);
        },
        async () => {
          const imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
          console.log("Successfully uploaded to storage:", imageUrl);
          resolve(imageUrl);
        }
      );
    });
  } catch (error) {
    console.log("Error uploading to storage:", error);
  }
};

// Function to upload create-blog form to firestore
const saveToFirestore = async (blogPost) => {
  console.log("------>   #CHECKPOINT @firebaseAuth @saveToFirestore");
  try {
    const createdAt = serverTimestamp();
    const newBlogPost = { ...blogPost, createdAt, updatedAt: createdAt };
    await addDoc(blogPostsRef, newBlogPost);
    console.log("Blog post saved to Firestore successfully!");
  } catch (error) {
    console.log("Error saving blog post to Firestore:", error);
    throw error;
  }
};

// Retrieve blog posts from db
const getBlogPosts = async () => {
  console.log("------>   #CHECKPOINT @firebaseAuth @getBlogPosts");
  const blogPostsQuery = query(blogPostsRef, orderBy("createdAt", "desc"));

  try {
    const querySnapshot = await getDocs(blogPostsQuery);
    // Convert query snapshot to array of documents
    const posts = [];
    querySnapshot.forEach((doc) => {
      const post = doc.data();
      post.id = doc.id;
      posts.push(post);
    });

    // Retrieve comments for each post
    for (let post of posts) {
      const commentsQuery = query(
        collection(db, "comments"),
        orderBy("timestamp", "asc"),
        where("postId", "==", post.id)
      );
      const commentsSnapshot = await getDocs(commentsQuery);

      const comments = [];
      commentsSnapshot.forEach((doc) => {
        const comment = doc.data();
        comment.id = doc.id;
        comments.push(comment);
      });

      // Add comments to the post object
      post.comments = comments;
    }
    return posts;
  } catch (error) {
    console.error("Error getting blog posts: ", error);
    return [];
  }
};

// Function to add a new comment to Firestore
const addComment = async (postId, userId, userEmail, comment) => {
  console.log("------>   #CHECKPOINT @firebaseAuth @addComment");
  const timestamp = new Date();

  try {
    const commentsRef = collection(db, "comments");
    await addDoc(commentsRef, {
      postId,
      userId,
      userEmail,
      comment,
      timestamp,
    });

    console.log("Comment added successfully!");
  } catch (error) {
    console.error("Error adding comment:", error);
  }
};

// Function to get the number of likes and whether or not the current user liked the post
const getLikes = async (postId, userId) => {
  console.log("------>   #CHECKPOINT @firebaseAuth @getLikes");
  try {
    const likesRef = collection(db, "likes");
    const likesSnapshot = await getDocs(
      query(likesRef, where("postId", "==", postId))
    );
    let likeCount = 0;
    let userLiked = false;
    likesSnapshot.forEach((likeDoc) => {
      likeCount++;
      if (likeDoc.data().userId === userId) {
        userLiked = true;
      }
    });

    return { likeCount, userLiked };
  } catch (error) {
    console.log("An error occurred while getting the likes:", error);
    throw error;
  }
};

// Function to update the number of likes and the list of users who liked the post in Firestore
const updateLikes = async (postId, userId, liked) => {
  console.log("------>   #CHECKPOINT @firebaseAuth @updateLikes");
  try {
    const likesRef = collection(db, "likes");
    const likesSnapshot = await getDocs(
      query(likesRef, where("postId", "==", postId))
    );
    let likeDoc;
    likesSnapshot.forEach((doc) => {
      if (doc.data().userId === userId) {
        likeDoc = doc;
      }
    });
    if (liked && !likeDoc) {
      try {
        await addDoc(likesRef, { postId, userId });
      } catch (error) {
        console.error("Error adding like:", error);
      }
    } else if (!liked && likeDoc) {
      try {
        await deleteDoc(doc(likesRef, likeDoc.id));
      } catch (error) {
        console.error("Error deleting like:", error);
      }
    }
    const { likeCount, userLiked } = await getLikes(postId, userId);
    return { likeCount, userLiked };
  } catch (error) {
    console.error(error);
  }
};

// Function to get the current user details
const getCurrentUserDetails = async (uid) => {
  console.log("------>   #CHECKPOINT @firebaseAuth @getCurrentUserDetails");
  try {
    const user = await admin.auth().getUser(uid);
    const userDetails = {
      id: user.uid,
      email: user.email,
      displayName: user.displayName || user.email,
    };
    console.log("@getCurrentUserDetails:", userDetails);
    return userDetails;
  } catch (error) {
    console.log(error);
    handleAuthError(res, error, "login");
  }
};

// Export the initialized Firebase app object
module.exports = {
  firebaseApp,
  //firebase/auth
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  auth,

  //firebase/storage
  storage,
  ref,
  getDownloadURL,
  uploadBytesResumable,

  //firestore
  db,
  collection,
  addDoc,

  //functions
  uploadToStorage,
  saveToFirestore,
  getBlogPosts,
  addComment,
  updateLikes,
  getLikes,
  getCurrentUserDetails,
};
