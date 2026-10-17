import { describe, expect, it } from "vitest";
import { photoPath, photoToDeleteOnSave } from "./product-photo";

describe("product photo cleanup", () => {
  it("deletes the old photo when the photo changes", () => {
    expect(photoToDeleteOnSave("/api/public/product-image/a.webp", "/api/public/product-image/b.webp")).toBe("a.webp");
  });
  it("keeps the photo when it did not change", () => {
    expect(photoToDeleteOnSave("/api/public/product-image/a.webp", "/api/public/product-image/a.webp")).toBeNull();
  });
  it("never deletes photos outside the folder", () => {
    expect(photoPath("/images/bodysuit.jpg")).toBeNull();
  });
});
