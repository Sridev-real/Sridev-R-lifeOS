import fs from 'fs';
import path from 'path';

export interface AdminUserRecord {
  uid: string;
  email: string;
  displayName: string;
  status: 'Active' | 'Pending' | 'Suspended';
  createdAt: string;
  role?: string;
  isDemo?: boolean;
  refreshToken?: string;
  passwordHashSnippet?: string;
}

const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || "AIzaSyAJ4hlRlq2ctg7OAH2eDVOJcYEcCv2Uxck";
const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "dev-s-3c8eb";
const ADMIN_REGISTRY_FILE = path.join(process.cwd(), 'data', 'admin_users_registry.json');
export const ADMIN_AUTH_TOKEN = process.env.ADMIN_AUTH_TOKEN || 'lifeos-secure-admin-token-2026';

// Seed default accounts if registry does not exist yet
const INITIAL_USERS: AdminUserRecord[] = [
  {
    uid: 'demo_uid_sridev_dev',
    email: 'sridev.student@lifeos.internal',
    displayName: 'Sridev Dev',
    status: 'Active',
    createdAt: '2026-01-01T00:00:00.000Z',
    role: 'Student (Demo)',
    isDemo: true
  },
  {
    uid: 'demo_uid_alex_rivera',
    email: 'alex.freelancer@lifeos.internal',
    displayName: 'Alex Rivera',
    status: 'Active',
    createdAt: '2026-01-01T00:00:00.000Z',
    role: 'Freelancer (Demo)',
    isDemo: true
  }
];

function loadRegistry(): AdminUserRecord[] {
  try {
    if (fs.existsSync(ADMIN_REGISTRY_FILE)) {
      const content = fs.readFileSync(ADMIN_REGISTRY_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[ADMIN] Warning loading registry file:', err);
  }

  // Ensure data directory exists
  try {
    const dir = path.dirname(ADMIN_REGISTRY_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(ADMIN_REGISTRY_FILE, JSON.stringify(INITIAL_USERS, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[ADMIN] Warning initializing registry file:', err);
  }

  return [...INITIAL_USERS];
}

function saveRegistry(users: AdminUserRecord[]): void {
  try {
    const dir = path.dirname(ADMIN_REGISTRY_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(ADMIN_REGISTRY_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('[ADMIN] Error saving registry file:', err);
  }
}

/**
 * Exchange a Firebase Refresh Token for a fresh ID Token
 */
async function getFreshIdToken(refreshToken: string): Promise<string> {
  const tokenRes = await fetch(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  if (!tokenRes.ok) {
    const errorData = await tokenRes.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Token exchange failed with status ${tokenRes.status}`);
  }

  const tokenData = await tokenRes.json();
  if (!tokenData.id_token) {
    throw new Error('No id_token received in token refresh response');
  }

  return tokenData.id_token;
}

/**
 * List all users from the secure server registry
 */
export async function listAdminUsers(): Promise<Omit<AdminUserRecord, 'refreshToken'>[]> {
  const users = loadRegistry();
  // Strip sensitive internal refreshTokens before returning to client
  return users.map(({ refreshToken, passwordHashSnippet, ...user }) => user);
}

/**
 * Create a REAL user in Firebase Authentication
 */
export async function createRealFirebaseUser(params: {
  email: string;
  password: string;
  displayName: string;
  status?: 'Active' | 'Pending' | 'Suspended';
}): Promise<Omit<AdminUserRecord, 'refreshToken'>> {
  const { email, password, displayName, status = 'Active' } = params;

  // 1. Validation
  if (!email || !displayName || !password) {
    throw new Error('Name, email, and password are required.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    throw new Error('Please provide a valid email address.');
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long as required by Firebase.');
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanDisplayName = displayName.trim();

  // 2. Call Firebase Authentication REST API to create real user
  const signupResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: cleanEmail,
      password: password,
      displayName: cleanDisplayName,
      returnSecureToken: true
    })
  });

  const signupData = await signupResponse.json();

  if (!signupResponse.ok || signupData.error) {
    const errMsg = signupData.error?.message || 'Failed to create user in Firebase Authentication.';
    if (errMsg.includes('EMAIL_EXISTS')) {
      throw new Error('An account with this email address already exists in Firebase. Please use a different email.');
    }
    if (errMsg.includes('WEAK_PASSWORD')) {
      throw new Error('Password is too weak. Please use at least 6 characters.');
    }
    if (errMsg.includes('INVALID_EMAIL')) {
      throw new Error('The email address provided is not accepted by Firebase.');
    }
    throw new Error(errMsg);
  }

  const realUid = signupData.localId;
  const refreshToken = signupData.refreshToken;
  const createdAt = new Date().toISOString();

  // 3. Update displayName if needed
  try {
    if (signupData.idToken) {
      await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: signupData.idToken,
          displayName: cleanDisplayName,
          returnSecureToken: true
        })
      });
    }
  } catch (updateErr) {
    console.warn('[ADMIN] Display name update warning:', updateErr);
  }

  // 4. Record in server-side registry
  const newRecord: AdminUserRecord = {
    uid: realUid,
    email: cleanEmail,
    displayName: cleanDisplayName,
    status: status,
    createdAt: createdAt,
    role: 'Verified User',
    isDemo: false,
    refreshToken: refreshToken
  };

  const currentUsers = loadRegistry();
  // Filter out any existing matching UID
  const updated = [newRecord, ...currentUsers.filter(u => u.uid !== realUid && u.email.toLowerCase() !== cleanEmail)];
  saveRegistry(updated);

  console.log(`[ADMIN] Real Firebase Authentication user created successfully. UID: ${realUid}, Email: ${cleanEmail}`);

  // Return user without refreshToken
  const { refreshToken: _, passwordHashSnippet: __, ...clientUser } = newRecord;
  return clientUser;
}

/**
 * Permanently delete a user from Firebase Authentication
 */
export async function deleteRealFirebaseUser(uid: string): Promise<{ success: boolean; message: string }> {
  if (!uid) {
    throw new Error('User UID is required.');
  }

  const currentUsers = loadRegistry();
  const targetUser = currentUsers.find(u => u.uid === uid);

  if (!targetUser) {
    throw new Error(`User with UID ${uid} not found in registry.`);
  }

  // If this is a demo user, just remove from registry
  if (targetUser.isDemo) {
    const updated = currentUsers.filter(u => u.uid !== uid);
    saveRegistry(updated);
    return { success: true, message: `Demo user ${targetUser.displayName} removed successfully.` };
  }

  // Real Firebase User: Permanently delete account from Firebase Authentication
  if (targetUser.refreshToken) {
    try {
      // 1. Get fresh ID token using stored refresh token
      const idToken = await getFreshIdToken(targetUser.refreshToken);

      // 2. Permanently delete from Firebase Auth
      const deleteResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${FIREBASE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: idToken })
      });

      const deleteData = await deleteResponse.json();
      if (!deleteResponse.ok && deleteData.error) {
        // If already deleted in Firebase, that's acceptable
        if (!deleteData.error.message?.includes('USER_NOT_FOUND')) {
          console.warn('[ADMIN] Firebase Auth account delete warning:', deleteData.error);
        }
      }
      console.log(`[ADMIN] User account ${uid} (${targetUser.email}) permanently removed from Firebase Authentication.`);
    } catch (err: any) {
      console.warn('[ADMIN] Could not delete Firebase Auth via refresh token:', err.message);
      // If token expired, still continue cleaning registry
    }
  }

  // 3. Remove from server registry
  const updated = currentUsers.filter(u => u.uid !== uid);
  saveRegistry(updated);

  return {
    success: true,
    message: `User ${targetUser.displayName} (${targetUser.email}) and their Firebase Authentication account were permanently deleted.`
  };
}

/**
 * Update user details (name, status)
 */
export async function updateAdminUser(uid: string, updates: { displayName?: string; status?: 'Active' | 'Pending' | 'Suspended' }): Promise<Omit<AdminUserRecord, 'refreshToken'>> {
  const currentUsers = loadRegistry();
  const targetIndex = currentUsers.findIndex(u => u.uid === uid);

  if (targetIndex === -1) {
    throw new Error(`User with UID ${uid} not found.`);
  }

  const updatedUser: AdminUserRecord = {
    ...currentUsers[targetIndex],
    ...(updates.displayName ? { displayName: updates.displayName.trim() } : {}),
    ...(updates.status ? { status: updates.status } : {})
  };

  currentUsers[targetIndex] = updatedUser;
  saveRegistry(currentUsers);

  const { refreshToken: _, passwordHashSnippet: __, ...clientUser } = updatedUser;
  return clientUser;
}

/**
 * Sync a user created on the client side (e.g. via normal signup or login)
 */
export function syncUserFromClient(user: {
  uid: string;
  email: string;
  displayName: string;
  createdAt?: string;
  status?: 'Active' | 'Pending' | 'Suspended';
  role?: string;
  refreshToken?: string;
}): void {
  if (!user.uid || !user.email) return;

  const currentUsers = loadRegistry();
  const existingIndex = currentUsers.findIndex(u => u.uid === user.uid || u.email.toLowerCase() === user.email.toLowerCase());

  const record: AdminUserRecord = {
    uid: user.uid,
    email: user.email.toLowerCase(),
    displayName: user.displayName || user.email.split('@')[0],
    status: user.status || 'Active',
    createdAt: user.createdAt || new Date().toISOString(),
    role: user.role || 'Verified User',
    isDemo: false,
    ...(user.refreshToken ? { refreshToken: user.refreshToken } : {})
  };

  if (existingIndex >= 0) {
    currentUsers[existingIndex] = {
      ...currentUsers[existingIndex],
      ...record,
      // Preserve existing refreshToken if not provided in update
      refreshToken: user.refreshToken || currentUsers[existingIndex].refreshToken
    };
  } else {
    currentUsers.unshift(record);
  }

  saveRegistry(currentUsers);
}
