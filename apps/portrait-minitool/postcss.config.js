/* oxlint-disable typescript/no-unsafe-assignment, typescript/no-unsafe-call, typescript/no-unsafe-member-access -- PostCSS AST types are not resolvable in this untyped config */
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";

// Chrome 61 只认 rgba()/hsla()，不认空格和斜杠写法，也不支持 oklch/color-mix。
const chrome61 = {
  postcssPlugin: "chrome61",
  OnceExit(root) {
    root.walkDecls((declaration) => {
      declaration.value = declaration.value
        .replaceAll(/rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([^)]+)\)/g, "rgba($1, $2, $3, $4)")
        .replaceAll(/rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\)/g, "rgb($1, $2, $3)")
        .replaceAll(
          /hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\/\s*([^)]+)\)/g,
          "hsla($1, $2%, $3%, $4)",
        );
    });

    const css = root.toString();
    if (
      css.includes("oklch(") ||
      css.includes("color-mix(") ||
      css.includes("@layer") ||
      css.includes("@property")
    ) {
      throw root.error("Tailwind CSS 包含 Chrome 61 不支持的语法");
    }
  },
};

export default {
  plugins: [tailwindcss(), autoprefixer(), chrome61],
};
