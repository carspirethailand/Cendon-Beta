/* ==========================================================================
   FIREBASE AUTHENTICATION MODULE (js/auth.js)
   ========================================================================== */

import { $, toast } from './helper.js';
import { fbConfig, ADMINS } from './config.js';

export let auth = null;
export let db = null;
export let useFirebase = false;

export const state = {
  currentUser: null
};

// Listeners for auth state changes
const authListeners = [];
export function onAuthChange(callback) {
  authListeners.push(callback);
  // If firebase is already loaded and state is known, trigger immediately
  if (auth && auth.currentUser !== undefined) {
    callback(state.currentUser);
  }
}

function notifyAuthChange(user) {
  authListeners.forEach(cb => cb(user));
}

// Initialize Firebase Compat SDK
try {
  firebase.initializeApp(fbConfig);
  auth = firebase.auth();
  db = firebase.database();
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
  useFirebase = true;
} catch (e) {
  console.warn("Firebase initialization failed:", e);
}

const isAdmin = email => ADMINS.includes((email || "").toLowerCase());

export function openAuth() {
  $("authModal").classList.add("show");
  $("authErr").classList.remove("show");
}

export function closeAuth() {
  $("authModal").classList.remove("show");
}

export function toggleDropdown() {
  $("dropdown").classList.toggle("show");
}

export function closeDropdown() {
  $("dropdown").classList.remove("show");
}

export function picHTML(u) {
  return u.photo 
    ? `<img src="${u.photo}" style="width:100%;height:100%;object-fit:cover" referrerpolicy="no-referrer"/>` 
    : `<span class="fb">${u.name.charAt(0).toUpperCase()}</span>`;
}

export function showErr(m) {
  [$("authErr"), $("wErr")].forEach(e => {
    if (e) {
      e.textContent = m;
      e.classList.add("show");
    }
  });
}

function authErrMsg(code) {
  const host = location.hostname || "(file)";
  const m = {
    "auth/operation-not-allowed": "ยังไม่ได้เปิด Google ใน Firebase Console → Authentication → Sign-in method → Google → Enable",
    "auth/unauthorized-domain": 'โดเมน "' + host + '" ยังไม่อนุญาต → Console → Authentication → Settings → Authorized domains → Add "' + host + '"',
    "auth/popup-blocked": "เบราว์เซอร์บล็อกป๊อปอัป กำลังลอง redirect...",
    "auth/operation-not-supported-in-this-environment": "สภาพแวดล้อมนี้ไม่รองรับ (Preview/file://) เปิดผ่าน http เช่น localhost หรือเว็บจริง"
  };
  return m[code] || ("ไม่สำเร็จ: " + code);
}

export async function googleSignIn(onDone) {
  if (!useFirebase) {
    showErr("ระบบยังไม่เชื่อม Firebase");
    return;
  }
  if (location.protocol === "file:") {
    showErr("เปิดแบบ file:// ใช้ Google ไม่ได้ — เปิดผ่าน http/เว็บจริง");
    return;
  }
  const p = new firebase.auth.GoogleAuthProvider();
  p.setCustomParameters({ prompt: "select_account" });
  try {
    await auth.signInWithPopup(p);
    if (onDone) onDone();
  } catch (err) {
    if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") return;
    if (err.code === "auth/popup-blocked") {
      showErr(authErrMsg(err.code));
      try {
        await auth.signInWithRedirect(p);
      } catch (e2) {
        showErr(authErrMsg(e2.code));
      }
      return;
    }
    showErr(authErrMsg(err.code));
  }
}

export async function doLogout() {
  if (useFirebase) await auth.signOut();
  closeDropdown();
  toast("ออกจากระบบแล้ว", "ti-logout");
}

// Bind Global Auth Events
if (useFirebase) {
  auth.onAuthStateChanged(u => {
    if (u) {
      state.currentUser = {
        uid: u.uid,
        name: u.displayName || u.email.split("@")[0],
        email: u.email,
        photo: u.photoURL || "",
        admin: isAdmin(u.email)
      };
      db.ref("users/" + u.uid).update({
        name: state.currentUser.name,
        email: u.email,
        photo: state.currentUser.photo,
        role: state.currentUser.admin ? "admin" : "user",
        lastLogin: Date.now()
      }).catch(() => {});
      
      notifyAuthChange(state.currentUser);
    } else {
      state.currentUser = null;
      notifyAuthChange(null);
    }
  });

  auth.getRedirectResult().then(r => {
    if (r && r.user) {
      closeAuth();
      // Hide welcome will be handled by UI listeners
    }
  }).catch(err => {
    showErr(authErrMsg(err.code));
  });
} else {
  // If Firebase is disabled, trigger change event with null
  setTimeout(() => notifyAuthChange(null), 100);
}
