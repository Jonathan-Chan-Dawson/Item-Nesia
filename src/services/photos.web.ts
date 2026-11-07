export async function persistPhoto(uri: string): Promise<string> {
  if (uri.startsWith('data:')) return uri;
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('This photo could not be stored.'));
    reader.readAsDataURL(blob);
  });
}
export async function removePhoto(_uri: string) {
  /* Data URLs are removed with their metadata. */
}
