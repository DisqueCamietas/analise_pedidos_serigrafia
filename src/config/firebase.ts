import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDi83NC22gAVMORYWdqiUs0YkEyfrAk_iY",
  authDomain: "extensao-pedidos-serigrafia.firebaseapp.com",
  databaseURL: "https://extensao-pedidos-serigrafia-default-rtdb.firebaseio.com",
  projectId: "extensao-pedidos-serigrafia",
  storageBucket: "extensao-pedidos-serigrafia.firebasestorage.app",
  messagingSenderId: "374388682446",
  appId: "1:374388682446:web:8dc5ac6fb865ce29abea9f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
