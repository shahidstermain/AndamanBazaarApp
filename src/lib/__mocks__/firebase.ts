import { vi } from 'vitest';

// --- Auth Mocks ---
export const authInstance = {
  currentUser: null as any,
  onAuthStateChanged: vi.fn((cb) => {
    cb(authInstance.currentUser);
    return () => {};
  }),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
  signInWithPopup: vi.fn(),
  signInWithPhoneNumber: vi.fn(),
};

export const authMock = {
  getAuth: vi.fn(() => authInstance),
  onAuthStateChanged: vi.fn((_auth, cb) => authInstance.onAuthStateChanged(cb)),
  signInWithEmailAndPassword: vi.fn((_auth, email, password) => authInstance.signInWithEmailAndPassword(email, password)),
  createUserWithEmailAndPassword: vi.fn((_auth, email, password) => authInstance.createUserWithEmailAndPassword(email, password)),
  signOut: vi.fn((_auth) => authInstance.signOut()),
  GoogleAuthProvider: vi.fn(() => ({})),
  RecaptchaVerifier: vi.fn(() => ({
    render: vi.fn().mockResolvedValue(true),
  })),
  updateProfile: vi.fn().mockResolvedValue(undefined),
  sendEmailVerification: vi.fn().mockResolvedValue(undefined),
};

// --- Firestore Mocks ---
export const dbInstance = {};

export const firestoreMock = {
  getFirestore: vi.fn(() => dbInstance),
  doc: vi.fn((_db, collection, id) => ({ type: 'doc', collection, id, path: `${collection}/${id}` })),
  collection: vi.fn((_db, path) => ({ type: 'collection', path })),
  query: vi.fn((q, ..._clauses) => ({ ...q, type: 'query' })),
  where: vi.fn((field, op, value) => ({ type: 'where', field, op, value })),
  orderBy: vi.fn((field, direction) => ({ type: 'orderBy', field, direction })),
  limit: vi.fn((n) => ({ type: 'limit', value: n })),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => undefined })),
  getDocs: vi.fn(() => Promise.resolve({ empty: true, docs: [], size: 0 })),
  setDoc: vi.fn().mockResolvedValue(undefined),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  addDoc: vi.fn().mockResolvedValue({ id: 'new-doc-id' }),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  increment: vi.fn((n) => ({ type: 'increment', value: n })),
  serverTimestamp: vi.fn(() => new Date().toISOString()),
  onSnapshot: vi.fn((_query, cb) => {
    return () => {};
  }),
  Timestamp: {
    now: vi.fn(() => ({ toMillis: () => Date.now() })),
    fromDate: vi.fn((date) => ({ toMillis: () => date.getTime() }))
  }
};

// --- Storage Mocks ---
export const storageInstance = {};

export const storageMock = {
  getStorage: vi.fn(() => storageInstance),
  ref: vi.fn((_storage, path) => ({ type: 'ref', path })),
  uploadBytes: vi.fn().mockResolvedValue({ ref: { fullPath: 'mock/path' } }),
  getDownloadURL: vi.fn().mockResolvedValue('http://mock/url'),
};

// --- Functions Mocks ---
export const functionsInstance = {};

export const functionsMock = {
  getFunctions: vi.fn(() => functionsInstance),
  httpsCallable: vi.fn((_functions, name) => {
    return vi.fn().mockResolvedValue({ data: { success: true } });
  }),
};

// --- Combined Mock for @/lib/firebase ---
export const mockFirebase = {
  ...authMock,
  ...firestoreMock,
  ...storageMock,
  ...functionsMock,
  db: dbInstance,
  auth: authInstance,
  storage: storageInstance,
  functions: functionsInstance,
  isFirebaseConfigured: vi.fn().mockReturnValue(true),
};
