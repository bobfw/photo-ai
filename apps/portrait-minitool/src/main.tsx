import { RouterProvider } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";

import "./style.css";
import { router } from "./router.tsx";

const container = document.querySelector("#root");
if (!container) throw new Error("缺少 #root");

createRoot(container).render(<RouterProvider router={router} />);
