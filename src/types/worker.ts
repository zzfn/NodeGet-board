export interface JsWorker {
  id: string;
  name: string;
  route: string;
  content: string;
  created_at: number;
  updated_at: number;
  env?: Record<string, string>;
  runtime_clean_time?: string;
}
