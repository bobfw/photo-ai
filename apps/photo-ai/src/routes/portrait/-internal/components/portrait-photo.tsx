import { createContext, useContext, useState, type ReactNode } from "react";

const PORTRAIT_PHOTO_SLOTS = 3;

interface PortraitPhotos {
  photos: string[];
  hasPhoto: boolean;
  setPhoto: (index: number, photo: string) => void;
}

const PortraitPhotoContext = createContext<PortraitPhotos | undefined>(undefined);

// 上传的照片只在内存里，跨 /portrait 下的路由共享；刷新即丢失。
export function PortraitPhotoProvider({ children }: { children: ReactNode }) {
  const [photos, setPhotos] = useState(() =>
    Array.from({ length: PORTRAIT_PHOTO_SLOTS }, () => ""),
  );

  function setPhoto(index: number, photo: string) {
    setPhotos((current) => current.map((item, itemIndex) => (itemIndex === index ? photo : item)));
  }

  return (
    <PortraitPhotoContext
      value={{ photos, hasPhoto: photos.some((photo) => photo !== ""), setPhoto }}
    >
      {children}
    </PortraitPhotoContext>
  );
}

export function usePortraitPhoto() {
  const photo = useContext(PortraitPhotoContext);
  if (!photo) throw new Error("usePortraitPhoto 必须在 PortraitPhotoProvider 内使用");
  return photo;
}
