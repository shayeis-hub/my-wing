importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyChzuTPbWmTEgqa_mrlXCM8dS9JBleQVcM",
  authDomain: "my-wing-46c77.firebaseapp.com",
  projectId: "my-wing-46c77",
  storageBucket: "my-wing-46c77.firebasestorage.app",
  messagingSenderId: "991022188498",
  appId: "1:991022188498:web:c9787d31e99eaef165aa0b",
});

const messaging = firebase.messaging();

// FCM auto-displays notifications for messages with a `notification` field.
// onBackgroundMessage is kept for data-only messages but must NOT call
// showNotification again — doing so causes duplicate pushes.
messaging.onBackgroundMessage((_payload) => {
  // intentionally empty — FCM handles display via webpush.notification in the API
});
