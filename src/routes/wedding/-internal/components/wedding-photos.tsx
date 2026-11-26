import { createContext, useContext, useState, type ReactNode } from "react";

interface WeddingPhotos {
  faces: string[];
  hasPhotos: boolean;
  photoA: string;
  photoB: string;
  setPhotoA: (photo: string) => void;
  setPhotoB: (photo: string) => void;
}

const WeddingPhotosContext = createContext<WeddingPhotos | undefined>(undefined);

// 上传的照片只在内存里，跨 /wedding 下的路由共享；刷新即丢失。
export function WeddingPhotosProvider({ children }: { children: ReactNode }) {
  const [photoA, setPhotoA] = useState("");
  const [photoB, setPhotoB] = useState("");

  return (
    <WeddingPhotosContext
      value={{
        faces: [photoA, photoB],
        hasPhotos: photoA !== "" && photoB !== "",
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
