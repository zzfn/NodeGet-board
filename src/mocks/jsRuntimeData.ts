import type { JsWorker } from "@/types/worker";

export const mockWorkers: JsWorker[] = [
  {
    id: "worker_001",
    name: "Example Worker 1",
    route: "/api/example-1",
    content: `export default {
  async onCall(params, env, ctx) {
    return { ok: true, from: "onCall", params, env };
  },
  async onCron(params, env, ctx) {
    return { ok: true, from: "onCron", params, env };
  },
  async onRoute(request, env, ctx) {
    return new Response("ok from example-1", { status: 200 });
  }
};`,
    created_at: Date.now() - 86400000,
    updated_at: Date.now() - 3600000,
    env: {
      DEBUG: "true",
      VERSION: "1.0.0",
    },
    runtime_clean_time: "1h",
  },
  {
    id: "worker_002",
    name: "Data Transformer",
    route: "/api/transform",
    content: `export default {
  async onCall(params, env, ctx) {
    const data = params.data || [];
    return { 
      count: data.length,
      processed: data.map(i => i * 2)
    };
  }
};`,
    created_at: Date.now() - 172800000,
    updated_at: Date.now() - 86400000,
    env: {
      NODE_ENV: "production",
    },
    runtime_clean_time: "30m",
  },
];

export const mockRunResult = (
  id: string,
  runType: string,
  params: any,
  env: any,
) => {
  return {
    success: true,
    execution_time: "12ms",
    memory_usage: "2.4MB",
    result: {
      id,
      run_type: runType,
      received_params: params,
      received_env: env,
      timestamp: Date.now(),
    },
  };
};
