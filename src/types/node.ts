export interface NodeMetadata {
  name: string;
  tags: string[];
  price: number;
  priceUnit: string;
  priceCycle: number; // 单位：天
  region: string;
  hidden: boolean;
}

export interface NodeItem extends NodeMetadata {
  id: string;
}
