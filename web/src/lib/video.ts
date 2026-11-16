/** Link video → cách hiển thị. Hỗ trợ YouTube, Google Drive, file mp4/webm; link khác (TikTok, Instagram…) mở tab mới. */
export type VideoInfo = { kind: 'iframe' | 'file' | 'link'; src: string };
export function parseVideo(url: string | undefined | null): VideoInfo | null {
  const u = String(url || '').trim();
  if (!/^https:\/\//i.test(u)) return null;
  let m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/);
  if (m) return { kind: 'iframe', src: 'https://www.youtube-nocookie.com/embed/' + m[1] + '?rel=0' };
  m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]{20,})/);
  if (m) return { kind: 'iframe', src: 'https://drive.google.com/file/d/' + m[1] + '/preview' };
  if (/\.(mp4|webm|mov)(\?.*)?$/i.test(u)) return { kind: 'file', src: u };
  return { kind: 'link', src: u };
}
