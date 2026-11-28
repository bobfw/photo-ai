import { createContext, useContext, useState, type ReactNode } from "react";

import type { PhotoValue } from "#lib/upload-photo";

interface WeddingPhotos {
  // 七牛 key，生成时交给服务端换 30 分钟下载地址
  faces: string[];
  hasPhotos: boolean;
  photoA: PhotoValue | undefined;
  photoB: PhotoValue | undefined;
  setPhotoA: (photo: PhotoValue | undefined) => void;
  setPhotoB: (photo: PhotoValue | undefined) => void;
}

const WeddingPhotosContext = createContext<WeddingPhotos | undefined>(undefined);

// 本地预览只在内存里，跨 /wedding 下的路由共享；刷新即丢失。
export function WeddingPhotosProvider({ children }: { children: ReactNode }) {
  const [photoA, setPhotoA] = useState<PhotoValue>();
  const [photoB, setPhotoB] = useState<PhotoValue>();

  return (
    <WeddingPhotosContext
      value={{
        faces: [photoA?.key ?? "", photoB?.key ?? ""],
        hasPhotos: Boolean(photoA && photoB),
        photoA,
        photoB,
        setPhotoA,
        setPhotoB,
      }}
    >
      {children}
    </WeddingPhotosContext>
  );
}

export function useWeddingPhotos() {
  const photos = useContext(WeddingPhotosContext);
  if (!photos) throw new Error("useWeddingPhotos 必须在 WeddingPhotosProvider 内使用");
  return photos;
}
