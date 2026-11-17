export function containedImage(
  frameWidth: number,
  frameHeight: number,
  imageWidth: number,
  imageHeight: number,
) {
  const scale = Math.min(frameWidth / imageWidth, frameHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return {
    width,
    height,
    left: (frameWidth - width) / 2,
    top: (frameHeight - height) / 2,
  };
}
export function imagePoint(
  x: number,
  y: number,
  rect: ReturnType<typeof containedImage>,
) {
  if (
    !rect.width ||
    !rect.height ||
    x < rect.left ||
    y < rect.top ||
    x > rect.left + rect.width ||
    y > rect.top + rect.height
  )
    return undefined;
  return { x: (x - rect.left) / rect.width, y: (y - rect.top) / rect.height };
}
