export const WEDDING_SCENES = [
  {
    id: "seaside-sunset",
    name: "海边日落",
    tagline: "金色逆光 · 海风与浪花",
    description:
      "海边礁石与细沙滩，日落时分的金色逆光，远处海平线与归航的船影，海风轻拂婚纱和发丝，浪漫的电影感",
    brideAttire: "白色鱼尾婚纱、长头纱与珍珠饰品",
    groomAttire: "海军蓝婚礼西装、白衬衫与领结",
  },
  {
    id: "forest-lawn",
    name: "森系草坪",
    tagline: "绿意薄雾 · 清新自然",
    description: "郊外森林草坪，高大的树木与野花，清晨薄雾和穿透树叶的柔和自然光，森系清新",
    brideAttire: "白色轻纱 A 字婚纱与花环头饰",
    groomAttire: "浅灰色婚礼西装与领结",
  },
  {
    id: "french-chateau",
    name: "法式古堡",
    tagline: "石墙花园 · 复古优雅",
    description: "法式古堡的石砌建筑与花园，旋转石阶、雕花栏杆和修剪整齐的绿篱，午后暖阳，优雅复古",
    brideAttire: "白色长袖蕾丝婚纱与拖尾头纱",
    groomAttire: "黑色礼服西装与黑色领结",
  },
  {
    id: "korean-studio",
    name: "韩式影棚",
    tagline: "纯色背景 · 柔和棚拍",
    description: "韩式室内婚纱影棚，纯色无缝背景，柔和均匀的棚拍布光，干净极简",
    brideAttire: "白色缎面简约婚纱与珍珠项链",
    groomAttire: "黑色修身西装与白衬衫",
  },
  {
    id: "chinese-courtyard",
    name: "中式庭院",
    tagline: "红墙庭院 · 东方古典",
    description: "中式庭院，红墙、木质格栅、红灯笼与庭院花木，温暖的金色灯光，东方古典氛围",
    brideAttire: "红色秀禾服、金色头饰与团扇",
    groomAttire: "中式立领礼服与红色胸花",
  },
] as const;

export function findWeddingScene(id: string) {
  return WEDDING_SCENES.find((scene) => scene.id === id);
}
