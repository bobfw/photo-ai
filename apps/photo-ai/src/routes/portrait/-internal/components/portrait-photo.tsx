import { createContext, useContext, useState, type ReactNode } from "react";

import type { PhotoValue } from "#lib/upload-photo";

interface PortraitPhotos {
  // 七牛 key，生成时交给服务端换 30 分钟下载地址
  keys: string[];
  photos: (PhotoValue | undefined)[];
  hasPhoto: boolean;
  setPhoto: (index: number, photo: PhotoValue | undefined) => void;
}

const PortraitPhotoContext = createContext<PortraitPhotos | undefined>(undefined);

// 本地预览只在内存里，跨 /portrait 下的路由共享；刷新即丢失。
export function PortraitPhotoProvider({ children }: { children: ReactNode }) {
  const [photos, setPhotos] = useState<(PhotoValue | undefined)[]>([
    undefined,
    undefined,
    undefined,
  ]);

  function setPhoto(index: number, photo: PhotoValue | undefined) {
    setPhotos((current) => current.map((item, itemIndex) => (itemIndex === index ? photo : item)));
  }

  return (
    <PortraitPhotoContext
      value={{
        keys: photos.flatMap((photo) => (photo ? [photo.key] : [])),
        photos,
        hasPhoto: photos.some((photo) => photo !== undefined),
        setPhoto,
      }}
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
