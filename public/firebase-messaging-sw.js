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

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {};
  self.registration.showNotification(title ?? "MY WING", {
    body: body ?? "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    dir: "rtl",
    lang: "he",
    vibrate: [200, 100, 200],
  });
});
