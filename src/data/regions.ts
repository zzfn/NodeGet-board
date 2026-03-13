export interface Region {
  code: string; // ISO 3166-1 alpha-2
  name: string;
}

export const REGIONS: Region[] = [
  { code: "HK", name: "香港" },
  { code: "TW", name: "台湾" },
  { code: "MO", name: "澳门" },
  { code: "CN", name: "中国大陆" },
  { code: "JP", name: "日本" },
  { code: "KR", name: "韩国" },
  { code: "SG", name: "新加坡" },
  { code: "MY", name: "马来西亚" },
  { code: "TH", name: "泰国" },
  { code: "VN", name: "越南" },
  { code: "PH", name: "菲律宾" },
  { code: "ID", name: "印度尼西亚" },
  { code: "IN", name: "印度" },
  { code: "US", name: "美国" },
  { code: "CA", name: "加拿大" },
  { code: "MX", name: "墨西哥" },
  { code: "BR", name: "巴西" },
  { code: "AR", name: "阿根廷" },
  { code: "GB", name: "英国" },
  { code: "DE", name: "德国" },
  { code: "FR", name: "法国" },
  { code: "NL", name: "荷兰" },
  { code: "RU", name: "俄罗斯" },
  { code: "TR", name: "土耳其" },
  { code: "AU", name: "澳大利亚" },
  { code: "ZA", name: "南非" },
];
