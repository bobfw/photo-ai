import { useEffect, useState } from "react";

import { measurePersonFootprint, type PersonFootprint } from "./contact-shadow.ts";
import { loadImage } from "./load-image.ts";

export function usePersonFootprint(imageUrl: string | undefined) {
  const [footprint, setFootprint] = useState<PersonFootprint>();

  useEffect(() => {
    setFootprint(undefined);
    if (!imageUrl) return;

    let isCancelled = false;
    void loadImage(imageUrl)
      .then((image) => {
        if (!isCancelled) setFootprint(measurePersonFootprint(image));
      })
      .catch(() => {
        if (!isCancelled) setFootprint(undefined);
      });

    return () => {
      isCancelled = true;
    };
  }, [imageUrl]);

  return footprint;
}
