import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/firebase'

type ImageType = 'posts' | 'eyecatch' | 'og'

export async function uploadImage(
  file: File,
  postId: string,
  type: ImageType,
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const filename = `${Date.now()}.${ext}`
  const path = `blog-images/${type}/${postId}/${filename}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

// 一時IDで記事内画像をアップロード（保存前でも使える）
export async function uploadEditorImage(file: File, tempId: string): Promise<string> {
  return uploadImage(file, tempId, 'posts')
}
