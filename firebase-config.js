const firebaseConfig = {
  apiKey:            "AIzaSyCMXYNSaXZJkEv9l-TWKOKItz591AXlo0I",
  authDomain:        "joinville-85f5d.firebaseapp.com",
  projectId:         "joinville-85f5d",
  storageBucket:     "joinville-85f5d.firebasestorage.app",
  messagingSenderId: "501864152148",
  appId:             "1:501864152148:web:7a0644465da5a201e981c1",
};

firebase.initializeApp(firebaseConfig);
window.db = firebase.firestore();
