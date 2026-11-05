const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const MAX_PHOTO_EDGE_PX = 960;
const JPEG_QUALITY = 0.8;

/** 고른 사진을 긴 변 960px 이하 JPEG data URL로 줄여 등록 요청과 입력 보관 크기를 줄입니다. */
export async function loadPhoto(file: File): Promise<string> {
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) throw new Error("JPG, PNG, WebP 사진을 선택해 주세요.");
  if (file.size > MAX_PHOTO_BYTES) throw new Error("사진 한 장은 15MB 이하로 선택해 주세요.");
  const image = await createImageBitmap(file);
  const scale = Math.min(1, MAX_PHOTO_EDGE_PX / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    image.close();
    throw new Error("사진을 처리할 수 없어요.");
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}
