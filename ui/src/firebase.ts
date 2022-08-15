// Import the functions you need from the SDKs you need
import { getAnalytics } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

import { devMode } from './app/util';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyCzJ-k6IvZRzdT-69Y9TBB0t9ttFg4mVHw',
  authDomain: 'crosswyrd-9a447.firebaseapp.com',
  projectId: 'crosswyrd-9a447',
  storageBucket: 'crosswyrd-9a447.appspot.com',
  messagingSenderId: '816152191251',
  appId: '1:816152191251:web:af948e154a372d58803ae6',
  measurementId: 'G-QX9YGB4C8X',
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

if (!devMode()) getAnalytics(app);
