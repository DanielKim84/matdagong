export async function loadPhoto(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("JPG, PNG, WebP 사진을 선택해 주세요.");
  if (file.size > 15 * 1024 * 1024)
    throw new Error("사진 한 장은 15MB 이하로 선택해 주세요.");
  const image = await createImageBitmap(file);
  const scale = Math.min(1, 960 / Math.max(image.width, image.height));
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
  return canvas.toDataURL("image/jpeg", 0.8);
}
