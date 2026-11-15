// 本地生成一条婚纱照凭证，并打印可直接打开的链接：
// pnpm voucher:link
import { createVouchers } from "./create-voucher.ts";

const [code] = createVouchers({ total: 5, count: 1, type: "wedding", remote: false });
console.log(`http://localhost:5701/wedding?code=${code}`);
