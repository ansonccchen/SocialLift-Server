const admin = require('firebase-admin')

const serviceAccount = require("./admin.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://social-media-app-5f207.firebaseio.com"
});

const db = admin.firestore()

module.exports = { admin, db }