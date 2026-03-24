importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyCG3MexziCuRndvR6fNgGKg_L1PM-UlJbE",
  authDomain: "stockman-8a6aa.firebaseapp.com",
  projectId: "stockman-8a6aa",
  storageBucket: "stockman-8a6aa.firebasestorage.app",
  messagingSenderId: "849468181940",
  appId: "1:849468181940:web:dc28ecb9038814b33e76e1"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Message reçu en arrière-plan : ', payload);
    
    // Vous pouvez personnaliser l'affichage de la notification ici
    const notificationTitle = payload.notification?.title || 'Nouvelle Alerte Stockman';
    const notificationOptions = {
        body: payload.notification?.body || 'Vous avez reçu un nouveau message.',
        icon: '/assets/icon.png', // Assurez-vous d'avoir une icône valide
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
