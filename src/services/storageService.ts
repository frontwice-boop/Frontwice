import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { auth } from '../lib/firebase';

export async function uploadFile(
  file: File, 
  path: string
): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to upload files.');
  }

  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
}

export async function uploadProfilePicture(file: File): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to upload files.');
  }
  const path = `users/${user.uid}/profile_${Date.now()}`;
  return uploadFile(file, path);
}
