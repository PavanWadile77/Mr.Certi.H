// Firebase Auth Module for Mr.Certi
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBuTV1Yeh77iWt8nJ8V09gUNUhagyhg4iY",
  authDomain: "mr-certi.firebaseapp.com",
  projectId: "mr-certi",
  storageBucket: "mr-certi.firebasestorage.app",
  messagingSenderId: "60676407665",
  appId: "1:60676407665:web:1113311464e6b6dc45b6d0",
  measurementId: "G-CRDZXN6TYD"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Prevent auto-redirect while we're actively logging in/signing up
let isAuthAction = false;

// ---- Utility Helpers ----
function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function clearError(id) {
  const el = document.getElementById(id);
  if (el) { el.textContent = ''; el.style.display = 'none'; }
}
function setLoading(btnId, textId, spinnerId, loading) {
  const btn = document.getElementById(btnId);
  const text = document.getElementById(textId);
  const spinner = document.getElementById(spinnerId);
  if (btn) btn.disabled = loading;
  if (text) text.style.opacity = loading ? '0.5' : '1';
  if (spinner) {
    if (loading) spinner.classList.remove('hidden');
    else spinner.classList.add('hidden');
  }
}
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  toast.innerHTML = `<span style="font-size:1rem;font-weight:700">${icons[type] || 'ℹ'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('fadeout'); setTimeout(() => toast.remove(), 300); }, 4000);
}

function getAuthErrorMessage(err) {
  const code = err?.code || '';
  const map = {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/too-many-requests': 'Too many attempts. Try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password is too weak (min 6 characters).',
    'auth/operation-not-allowed': 'Email/Password sign-in is not enabled. Please enable it in Firebase Console → Authentication → Sign-in method.',
    'auth/admin-restricted-operation': 'Sign-up is restricted. Enable Email/Password auth in Firebase Console → Authentication → Sign-in method.',
    'auth/configuration-not-found': 'Firebase Auth not configured. Enable Email/Password in Firebase Console.',
  };
  return map[code] || `Auth error (${code || 'unknown'}): ${err?.message || 'Unknown error'}`;
}

// Firestore with timeout helper
async function firestoreWithTimeout(promise, ms = 5000) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error('Firestore timeout')), ms))
  ]);
}

function redirectToDashboard(role) {
  if (role === 'organizer') window.location.href = 'organizer.html';
  else window.location.href = 'participant.html';
}

// ---- Auth State Observer ----
onAuthStateChanged(auth, async (user) => {
  if (user && !isAuthAction) {
    const isLanding = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');
    if (isLanding) {
      let role = localStorage.getItem('mr_certi_role');
      try {
        const userDoc = await firestoreWithTimeout(getDoc(doc(db, 'users', user.uid)), 4000);
        if (userDoc.exists()) {
          role = userDoc.data().role;
          localStorage.setItem('mr_certi_role', role);
        }
      } catch (e) {
        console.warn('Auth state: Firestore unavailable, using localStorage');
      }
      if (role) redirectToDashboard(role);
    }
  }
});

// ---- Login ----
document.getElementById('loginBtn')?.addEventListener('click', async () => {
  clearError('loginError');
  const email = document.getElementById('loginEmail')?.value?.trim();
  const password = document.getElementById('loginPassword')?.value;
  if (!email || !password) { showError('loginError', 'Please fill in all fields.'); return; }

  isAuthAction = true;
  setLoading('loginBtn', 'loginBtnText', 'loginSpinner', true);

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);

    // Auth succeeded! Get role
    let role = localStorage.getItem('mr_certi_role') || 'participant';
    try {
      const userDoc = await firestoreWithTimeout(getDoc(doc(db, 'users', cred.user.uid)), 4000);
      if (userDoc.exists()) {
        role = userDoc.data().role;
        localStorage.setItem('mr_certi_role', role);
        localStorage.setItem('mr_certi_name', userDoc.data().name || '');
      }
    } catch (e) {
      console.warn('Firestore unavailable during login, using localStorage role');
    }

    showToast('Logged in successfully!', 'success');
    setTimeout(() => redirectToDashboard(role), 500);
  } catch (err) {
    console.error('Login error:', err);
    showError('loginError', getAuthErrorMessage(err));
    isAuthAction = false;
  } finally {
    setLoading('loginBtn', 'loginBtnText', 'loginSpinner', false);
  }
});

// ---- Signup ----
document.getElementById('signupBtn')?.addEventListener('click', async () => {
  clearError('signupError');
  const name = document.getElementById('signupName')?.value?.trim();
  const email = document.getElementById('signupEmail')?.value?.trim();
  const password = document.getElementById('signupPassword')?.value;
  const activeRole = document.querySelector('.role-btn.active')?.dataset.role || 'participant';

  if (!name || !email || !password) { showError('signupError', 'Please fill in all fields.'); return; }
  if (password.length < 6) { showError('signupError', 'Password must be at least 6 characters.'); return; }

  isAuthAction = true;
  setLoading('signupBtn', 'signupBtnText', 'signupSpinner', true);

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    // Save to localStorage immediately
    localStorage.setItem('mr_certi_role', activeRole);
    localStorage.setItem('mr_certi_name', name);

    // Try Firestore (non-blocking — don't let it prevent redirect)
    try {
      await firestoreWithTimeout(setDoc(doc(db, 'users', cred.user.uid), {
        id: cred.user.uid, name, email, role: activeRole, createdAt: serverTimestamp()
      }), 5000);

      if (activeRole === 'participant') {
        await firestoreWithTimeout(setDoc(doc(db, 'participants', cred.user.uid), {
          id: cred.user.uid, name, email, certificateUrl: '', status: 'pending', createdAt: serverTimestamp()
        }), 5000);
      }
    } catch (fsErr) {
      console.warn('Firestore write failed (will sync later):', fsErr.message);
    }

    showToast('Account created! Welcome to Mr.Certi!', 'success');
    setTimeout(() => redirectToDashboard(activeRole), 500);
  } catch (err) {
    console.error('Signup error:', err);
    showError('signupError', getAuthErrorMessage(err));
    isAuthAction = false;
  } finally {
    setLoading('signupBtn', 'signupBtnText', 'signupSpinner', false);
  }
});

// ---- Forgot Password ----
document.getElementById('forgotBtn')?.addEventListener('click', async () => {
  clearError('forgotError');
  document.getElementById('forgotSuccess')?.classList.add('hidden');
  const email = document.getElementById('forgotEmail')?.value?.trim();
  if (!email) { showError('forgotError', 'Please enter your email.'); return; }
  try {
    await sendPasswordResetEmail(auth, email);
    document.getElementById('forgotSuccess')?.classList.remove('hidden');
  } catch (err) {
    showError('forgotError', getAuthErrorMessage(err));
  }
});

// Export helpers
export { auth, db, showToast };
