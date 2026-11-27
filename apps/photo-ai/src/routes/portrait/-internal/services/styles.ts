export const PORTRAIT_STYLES = [
  {
    key: "business-formal",
    title: "商务正装",
    description: "精致剪裁，现代专业",
    attire:
      "年轻都市精英风格的现代商务正装，选择剪裁利落、肩线清晰、版型修身但舒适的西装套装，搭配质感衬衫。颜色优先深炭灰、藏蓝、黑色等高级中性色，注重合身剪裁、面料质感和精致细节。男性可搭配简约窄版领带，女性采用现代感西装套装或简洁利落的职业装，避免老式宽大西装、过时领型和传统影楼商务穿搭。",
    mood: "自信从容，目光坚定，轻松自然的微笑",
  },
  {
    key: "business-casual",
    title: "商务休闲",
    description: "都市简约，时尚松弛",
    attire:
      "年轻都市商务休闲风格，搭配现代剪裁的轻质西装外套、质感针织衫、简洁衬衫或精致的简约内搭。采用米白、浅灰、灰蓝、深棕等低饱和度色彩，注重服装层次、材质质感与自然松弛的版型，时尚简洁、有活力，避免老气的传统商务搭配。",
    mood: "亲和自然，轻松微笑，松弛自信",
  },
  {
    key: "white-shirt",
    title: "白衬衫",
    description: "简洁清爽，年轻干净",
    attire:
      "年轻、清爽、现代的白衬衫造型，选择面料细腻、剪裁简洁、具有自然垂感和轻盈质感的衬衫，领口自然舒展，版型合身而不紧绷，允许适度松弛的穿着效果，搭配干净利落的整体造型，避免传统硬挺的商务衬衫和刻板职业装。",
    mood: "清爽自然，眼神明亮，温和微笑",
  },
  {
    key: "editorial",
    title: "高级感肖像",
    description: "时尚杂志，极简高级",
    attire:
      "年轻时尚的现代杂志肖像造型，选择具有设计感、质感与现代剪裁的服装，例如结构感短款西装、简约设计衬衫、垂坠感上衣、精致针织或具有时尚廓形的现代服装。采用黑色、米白、灰色、深棕等高级中性色，注重廓形、材质、层次与细节，整体具有年轻时尚感、轻奢质感和现代审美，避免老式高领毛衣、传统商务套装、过度正式及刻板职业穿搭。",
    mood: "沉静从容，眼神有表现力，轻微情绪感，自然放松，不刻意微笑",
  },
] as const;

export function findPortraitStyle(key: string) {
  return PORTRAIT_STYLES.find((style) => style.key === key);
}

export const PORTRAIT_POSES = [
  {
    key: "front",
    title: "正面自然",
    description: "正对镜头，双肩放松，适合正式简历",
    prompt: "身体正对镜头，双肩平齐放松，双臂自然下垂",
  },
  {
    key: "angle",
    title: "微侧身",
    description: "身体微侧，脸部转向镜头，更有立体感",
    prompt: "身体微侧约 30°，头部转向镜头，一侧肩膀靠近镜头",
  },
  {
    key: "arms-crossed",
    title: "抱臂",
    description: "双臂交叉，自信干练，适合管理岗",
    prompt: "双臂自然交叉于胸前，肩背挺直，自信专业",
  },
] as const;

export function findPortraitPose(key: string) {
  return PORTRAIT_POSES.find((pose) => pose.key === key);
}

export const PORTRAIT_COMPOSITIONS = [
  {
    key: "half",
    title: "半身",
    description: "腰部以上，标准形象照",
    prompt: "半身构图，腰部以上，人物在画面中完整舒展",
  },
  {
    key: "bust",
    title: "胸像",
    description: "胸部以上，适合头像、领英",
    prompt: "胸像构图，胸部以上，肩膀自然入画",
  },
  {
    key: "three-quarter",
    title: "七分身",
    description: "膝盖以上，更完整地展示身形与服装",
    prompt: "七分身构图，膝盖以上，人物完整呈现",
  },
] as const;

export function findPortraitComposition(key: string) {
  return PORTRAIT_COMPOSITIONS.find((composition) => composition.key === key);
}

export const PORTRAIT_EDITOR_RATIOS = [
  { label: "3:4", value: 3 / 4, hint: "形象照、简历常用" },
  { label: "1:1", value: 1, hint: "头像、社交平台" },
] as const;
