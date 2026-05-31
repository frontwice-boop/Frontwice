import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { auth } from '../lib/firebase';

export async function importFile(
  file: File, 
  path: string
): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to import files.');
  }

  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
}

export async function importProfilePicture(file: File): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to import files.');
  }

  const path = `users/${user.uid}/profile_${Date.now()}`;
  return importFile(file, path);
}
