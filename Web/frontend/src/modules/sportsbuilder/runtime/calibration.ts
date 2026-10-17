/** Convert an upright full-body height reference to one shared physical scale. */
export function scaleFromAthleteHeight(
  heightCm: number,
  head: [number, number],
  sole: [number, number],
  width: number,
  height: number,
) {
  if (!Number.isFinite(heightCm) || heightCm < 30 || heightCm > 300)
    throw Error("Add a valid height to the athlete profile first.");
  if (
    ![width, height].every((value) => Number.isFinite(value) && value > 0) ||
    [head, sole].some(
      ([x, y]) =>
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        x < 0 ||
        x > width ||
        y < 0 ||
        y > height,
    )
  )
    throw Error("Choose both points inside the video.");
  const bodyHeightPixels = sole[1] - head[1];
  if (bodyHeightPixels < Math.max(30, height * 0.15))
    throw Error(
      "Choose the top of the head first, then the bottom of the shoes in a clear, upright full-body frame.",
    );
  return {
    metersPerPixel: heightCm / 100 / bodyHeightPixels,
    bodyHeightPixels,
  };
}
