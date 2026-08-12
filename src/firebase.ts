import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyDjgNBKBULq4iFPbK90lIh4XRCJRcvkALI",
  authDomain: "rpgsz-314df.firebaseapp.com",
  projectId: "rpgsz-314df",
  storageBucket: "rpgsz-314df.firebasestorage.app",
  messagingSenderId: "533586684580",
  appId: "1:533586684580:web:a2f09300cae9a9ce805431",
  measurementId: "G-JRL60F6X48",
};

let app: FirebaseApp | null = null;
let authRef: Auth | null = null;
let dbRef: Firestore | null = null;
let initError: string | null = null;

try {
  app = initializeApp(firebaseConfig);
  authRef = getAuth(app);
  dbRef = getFirestore(app);
} catch (err) {
  initError = err instanceof Error ? err.message : String(err);
  console.warn("[PixelCity] Falha ao inicializar o Firebase:", initError);
}

export const firebaseApp = app;
export const auth = authRef;
export const db = dbRef;
export const firebaseReady = Boolean(app && authRef && dbRef);
export const firebaseInitError = initError;

/** Coleções usadas pelo jogo */
export const COL = {
  users: "users",
  mapEdits: "map_edits",
  properties: "properties",
  chat: "chat",
  applications: "applications",
  transactions: "transactions",
  adminLogs: "adminLogs",
  organizations: "organizations",
  shopConfig: "shop_config",
  customObjects: "custom_objects",
  signs: "signs",
  rgRegistry: "rg_registry",
  dms: "dms",
  clothing: "clothing",
  treasury: "treasury",
  treasuryLedger: "treasury_ledger",
} as const;
