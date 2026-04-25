<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref, watch } from "vue";
import { useDynamicData } from "@/composables/useDynamicData";
import { useStaticData } from "@/composables/useStaticData";
import { formatBytes, formatLoad } from "@/utils/format";
import { showCpuPercent, showRamPercent, showRamText } from "@/utils/show";
import { useRoute } from "vue-router";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Cpu,
  Database,
  HardDrive,
  Network,
  AlertCircle,
} from "lucide-vue-next";
import UPlotChart from "@/components/UPlotChart.vue";
import type {
  DynamicSummaryResponseItem,
  SummaryField,
  DynamicDetailData,
} from "@/types/monitoring";

definePage({
  meta: {
    title: "router.node.status",
  },
});

const route = useRoute();
const uuid = computed(() => (route.params as { uuid: string }).uuid);

const {
  error: dynamicError,
  status: dynamicStatus,
  servers: dynamicServers,
  connect: connectDynamic,
  fetchSummaryAvg,
  fetchDynamic,
} = useDynamicData();

const { servers: staticServers, connect: connectStatic } = useStaticData();

const activeTab = ref("cpu");

// Detail snapshot state
const dynamicDetail = ref<DynamicDetailData | null>(null);
const detailLoading = ref(false);

// Memory tab reads from the `server` summary ref directly — no dynamic fetch needed
const TAB_FIELDS: Record<string, string[]> = {
  cpu: ["cpu"],
  disk: ["disk"],
  network: ["network"],
};

let fetchSeq = 0;

const loadDetail = async () => {
  const fields = TAB_FIELDS[activeTab.value];
  if (!fields || !uuid.value) return;
  const seq = ++fetchSeq;
  if (!dynamicDetail.value) detailLoading.value = true;
  const result = await fetchDynamic(uuid.value, fields);
  if (seq !== fetchSeq) {
    detailLoading.value = false;
    return;
  }
  dynamicDetail.value = result;
  detailLoading.value = false;
};

// Format MHz → GHz
const formatMHz = (mhz: number): string => {
  if (mhz >= 1000) return `${(mhz / 1000).toFixed(2)} GHz`;
  return `${mhz} MHz`;
};

// Network detail speed bar normalization
const maxNetDetailSpeed = computed(() => {
  const ifaces = dynamicDetail.value?.network?.interfaces ?? [];
  return Math.max(
    ...ifaces.map((i) => Math.max(i.receive_speed, i.transmit_speed)),
    1,
  );
});

const notFound = computed(
  () =>
    dynamicStatus.value === "connected" &&
    dynamicServers.value.length > 0 &&
    !dynamicServers.value.find((s) => s.uuid === uuid.value),
);

const server = computed(() => {
  const dServer = dynamicServers.value.find((s) => s.uuid === uuid.value);
  const sServer = staticServers.value.find((s) => s.uuid === uuid.value);

  if (dServer) {
    return {
      ...dServer,
      system: sServer?.system,
      cpu_static: sServer?.cpu,
      gpu: sServer?.gpu || [],
    };
  }
  return undefined;
});

const tabs = [
  { id: "cpu", label: "CPU", icon: Cpu },
  { id: "memory", label: "Memory", icon: Database },
  { id: "disk", label: "Disk", icon: HardDrive },
  { id: "network", label: "Network", icon: Network },
];

const MAIN_COLOR = "#3e8eff";
const SUB_COLOR = "#e46e0a";

// Live status indicator
const lastUpdate = ref(0);
const elapsed = ref(0);
let elapsedTimer: ReturnType<typeof setInterval> | null = null;

watch(server, (s) => {
  if (s) lastUpdate.value = Date.now();
});

onMounted(() => {
  elapsedTimer = setInterval(() => {
    elapsed.value = lastUpdate.value ? Date.now() - lastUpdate.value : Infinity;
  }, 1000);
});

onUnmounted(() => {
  if (elapsedTimer) clearInterval(elapsedTimer);
});

const liveLabel = computed(() => {
  if (!lastUpdate.value) return "";
  const secs = Math.floor(elapsed.value / 1000);
  if (secs <= 2) return "Live";
  return `Updated ${secs}s ago`;
});

const liveColor = computed(() => {
  if (!lastUpdate.value) return "";
  const secs = Math.floor(elapsed.value / 1000);
  return secs <= 2 ? "#22c55e" : "#eab308";
});

// Avg history data
const avgData = ref<DynamicSummaryResponseItem[]>([]);
const avgLoading = ref(false);

onMounted(() => {
  connectDynamic();
  connectStatic();
});

const loadAvgData = async () => {
  avgLoading.value = true;
  try {
    const result = await fetchSummaryAvg(uuid.value, undefined, [
      "cpu_usage",
      "used_memory",
      "total_memory",
      "read_speed",
      "write_speed",
      "transmit_speed",
      "receive_speed",
    ]);
    if (Array.isArray(result)) {
      avgData.value = result;
    }
  } catch (e) {
    console.error("[Status] Failed to fetch avg data:", e);
  } finally {
    avgLoading.value = false;
  }
};

// Wait for WebSocket connected before fetching avg data
watch(
  dynamicStatus,
  (status) => {
    if (status === "connected") {
      loadAvgData();
    }
  },
  { immediate: true },
);

// Detail data: load on connect
watch(
  dynamicStatus,
  (status) => {
    if (status === "connected") loadDetail();
  },
  { immediate: true },
);

// Detail data: refresh when summary pushes new data
watch(server, () => loadDetail());

// Detail data: reload on tab switch
watch(activeTab, () => {
  if (dynamicStatus.value === "connected") loadDetail();
});

// Detail data: clear stale data on node switch
watch(uuid, () => {
  dynamicDetail.value = null;
});

// CPU chart data from avg
const cpuAvgTimestamps = computed(() =>
  avgData.value.map((d) => d.timestamp / 1000),
);
const cpuAvgValues = computed(() => avgData.value.map((d) => d.cpu_usage ?? 0));

// Memory chart data from avg
const ramAvgTimestamps = computed(() =>
  avgData.value.map((d) => d.timestamp / 1000),
);
const ramAvgValues = computed(() =>
  avgData.value.map((d) => {
    const used = d.used_memory ?? 0;
    const total = d.total_memory ?? 1;
    return (used / total) * 100;
  }),
);

// Disk chart data from avg
const diskAvgTimestamps = computed(() =>
  avgData.value.map((d) => d.timestamp / 1000),
);
const diskReadAvgValues = computed(() =>
  avgData.value.map((d) => d.read_speed ?? 0),
);
const diskWriteAvgValues = computed(() =>
  avgData.value.map((d) => d.write_speed ?? 0),
);
const maxDiskSpeed = computed(() =>
  Math.max(...diskReadAvgValues.value, ...diskWriteAvgValues.value, 1),
);

// Network chart data from avg
const netAvgTimestamps = computed(() =>
  avgData.value.map((d) => d.timestamp / 1000),
);
const netRxAvgValues = computed(() =>
  avgData.value.map((d) => d.receive_speed ?? 0),
);
const netTxAvgValues = computed(() =>
  avgData.value.map((d) => d.transmit_speed ?? 0),
);
const maxNetSpeed = computed(() =>
  Math.max(...netRxAvgValues.value, ...netTxAvgValues.value, 1),
);
</script>

<template>
  <div
    class="flex flex-col h-full overflow-hidden status-page"
    :style="{
      '--status-main-color': MAIN_COLOR,
      '--status-sub-color': SUB_COLOR,
    }"
  >
    <!-- Tab Bar -->
    <div
      class="flex items-center gap-2 px-4 py-3 border-b shrink-0 overflow-x-auto"
    >
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="[
          'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-all border whitespace-nowrap',
          activeTab === tab.id
            ? 'border-border bg-muted shadow-sm font-medium'
            : 'border-transparent hover:bg-muted/50 text-muted-foreground',
        ]"
      >
        <component :is="tab.icon" class="h-4 w-4" />
        <span>{{ tab.label }}</span>
      </button>
      <div class="ml-auto shrink-0">
        <Badge
          v-if="server && liveLabel"
          variant="outline"
          class="font-mono text-xs"
        >
          <span
            class="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
            :style="{ backgroundColor: liveColor }"
          ></span>
          {{ liveLabel }}
        </Badge>
      </div>
    </div>

    <!-- Main Content -->
    <div
      v-if="!server"
      class="flex-1 flex items-center justify-center text-muted-foreground"
    >
      <div class="flex flex-col items-center gap-2">
        <div
          v-if="dynamicError"
          class="text-destructive flex items-center gap-2"
        >
          <AlertCircle class="h-5 w-5" /> {{ dynamicError }}
        </div>
        <span v-else-if="notFound">节点未找到或已离线</span>
        <span v-else>Connecting to server...</span>
      </div>
    </div>

    <div v-else class="flex-1 p-6 overflow-y-auto">
      <div class="max-w-5xl mx-auto space-y-6">
        <!-- CPU View -->
        <Transition name="fade" mode="out-in">
          <div v-if="activeTab === 'cpu'" key="cpu" class="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle class="text-sm font-medium text-muted-foreground"
                  >Total Utilization</CardTitle
                >
                <div class="flex items-center gap-3 text-xs font-mono">
                  <span class="status-main-text">
                    {{ showCpuPercent(server).toFixed(1) }}%
                  </span>
                  <span class="text-muted-foreground/40">|</span>
                  <span class="text-muted-foreground">
                    Load
                    <span class="text-foreground">{{
                      formatLoad({
                        load_one: server.load_one,
                        load_five: server.load_five,
                        load_fifteen: server.load_fifteen,
                      })
                    }}</span>
                  </span>
                  <span class="text-muted-foreground/40">|</span>
                  <span class="text-muted-foreground">
                    {{ server.process_count ?? "-" }} Processes
                  </span>
                  <span class="text-muted-foreground/40">|</span>
                  <span
                    class="text-muted-foreground truncate max-w-[280px]"
                    :title="server?.cpu_static?.per_core?.[0]?.brand"
                  >
                    {{ server?.cpu_static?.per_core?.[0]?.brand || "Unknown" }}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  class="h-[260px] w-full flex items-end p-0 relative overflow-hidden"
                >
                  <UPlotChart
                    :data="cpuAvgValues"
                    :timestamps="cpuAvgTimestamps"
                    :color="MAIN_COLOR"
                    :maxValue="100"
                    yLabel="%"
                  />
                </div>
              </CardContent>
            </Card>

            <!-- CPU Detail: per-core -->
            <div class="flex items-center gap-3">
              <div class="h-px flex-1 bg-border"></div>
              <span
                class="text-xs text-muted-foreground uppercase tracking-wider"
                >Per Core</span
              >
              <div class="h-px flex-1 bg-border"></div>
            </div>

            <div
              v-if="detailLoading"
              class="grid grid-cols-4 gap-2 animate-pulse"
            >
              <div
                v-for="i in 8"
                :key="i"
                class="h-16 bg-muted rounded-lg"
              ></div>
            </div>
            <div
              v-else-if="dynamicDetail?.cpu?.per_core?.length"
              class="grid grid-cols-4 gap-2"
            >
              <div
                v-for="core in dynamicDetail.cpu.per_core"
                :key="core.id"
                class="bg-muted/30 border border-border rounded-lg p-3 space-y-2"
              >
                <div class="text-xs text-muted-foreground font-mono">
                  Core {{ core.id }}
                </div>
                <div class="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full"
                    :style="{
                      width: `${core.cpu_usage}%`,
                      backgroundColor: MAIN_COLOR,
                    }"
                  ></div>
                </div>
                <div class="flex justify-between text-xs font-mono">
                  <span :style="{ color: MAIN_COLOR }"
                    >{{ core.cpu_usage.toFixed(1) }}%</span
                  >
                  <span class="text-muted-foreground">{{
                    formatMHz(core.frequency_mhz)
                  }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Memory View -->
          <div
            v-else-if="activeTab === 'memory'"
            key="memory"
            class="space-y-6"
          >
            <Card>
              <CardHeader>
                <div class="flex items-center gap-4">
                  <CardTitle class="text-sm font-medium text-muted-foreground"
                    >Memory Usage</CardTitle
                  >
                  <div class="flex items-center gap-3 text-xs font-mono">
                    <span class="status-main-text">
                      RAM {{ showRamPercent(server).toFixed(1) }}%
                      <span class="text-muted-foreground ml-1">{{
                        showRamText(server)
                      }}</span>
                    </span>
                    <span class="text-muted-foreground/40">|</span>
                    <span class="text-muted-foreground">
                      Swap
                      {{
                        server.total_swap
                          ? (
                              ((server.used_swap ?? 0) / server.total_swap) *
                              100
                            ).toFixed(1)
                          : "0.0"
                      }}%
                      <span class="ml-1">
                        {{ formatBytes(server.used_swap || 0) }} /
                        {{ formatBytes(server.total_swap || 0) }}
                      </span>
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  class="h-[260px] w-full flex items-end relative overflow-hidden"
                >
                  <UPlotChart
                    :data="ramAvgValues"
                    :timestamps="ramAvgTimestamps"
                    :color="MAIN_COLOR"
                    :maxValue="100"
                    yLabel="%"
                  />
                </div>
              </CardContent>
            </Card>

            <!-- Memory Detail: breakdown -->
            <div class="flex items-center gap-3">
              <div class="h-px flex-1 bg-border"></div>
              <span
                class="text-xs text-muted-foreground uppercase tracking-wider"
                >Breakdown</span
              >
              <div class="h-px flex-1 bg-border"></div>
            </div>

            <Card>
              <CardContent class="pt-4 space-y-5">
                <!-- RAM bar -->
                <div class="space-y-1.5">
                  <div
                    class="flex justify-between text-xs text-muted-foreground font-mono"
                  >
                    <span>RAM</span>
                    <span>{{ formatBytes(server.total_memory ?? 0) }}</span>
                  </div>
                  <div class="h-3 bg-muted rounded-full overflow-hidden flex">
                    <div
                      class="h-full rounded-full transition-all"
                      :style="{
                        width: `${showRamPercent(server)}%`,
                        backgroundColor: MAIN_COLOR,
                      }"
                    ></div>
                  </div>
                  <div
                    class="flex gap-4 text-xs font-mono text-muted-foreground"
                  >
                    <span class="flex items-center gap-1.5">
                      <span
                        class="w-2 h-2 rounded-sm"
                        :style="{ backgroundColor: MAIN_COLOR }"
                      ></span>
                      Used {{ formatBytes(server.used_memory ?? 0) }}
                    </span>
                    <span class="flex items-center gap-1.5">
                      <span
                        class="w-2 h-2 rounded-sm bg-muted border border-border"
                      ></span>
                      Available {{ formatBytes(server.available_memory ?? 0) }}
                    </span>
                  </div>
                </div>

                <!-- Swap bar -->
                <div class="space-y-1.5">
                  <div
                    class="flex justify-between text-xs text-muted-foreground font-mono"
                  >
                    <span>Swap</span>
                    <span>{{ formatBytes(server.total_swap ?? 0) }}</span>
                  </div>
                  <div class="h-3 bg-muted rounded-full overflow-hidden flex">
                    <div
                      class="h-full rounded-full transition-all"
                      :style="{
                        width: server.total_swap
                          ? `${((server.used_swap ?? 0) / server.total_swap) * 100}%`
                          : '0%',
                        backgroundColor: '#a855f7',
                      }"
                    ></div>
                  </div>
                  <div
                    class="flex gap-4 text-xs font-mono text-muted-foreground"
                  >
                    <span class="flex items-center gap-1.5">
                      <span
                        class="w-2 h-2 rounded-sm"
                        style="background-color: #a855f7"
                      ></span>
                      Used {{ formatBytes(server.used_swap ?? 0) }}
                    </span>
                  </div>
                </div>

                <!-- Stat cards -->
                <div class="grid grid-cols-3 gap-3">
                  <div class="bg-muted/30 border border-border rounded-lg p-3">
                    <div
                      class="text-xs text-muted-foreground uppercase tracking-wider"
                    >
                      Total
                    </div>
                    <div class="text-base font-semibold font-mono mt-1">
                      {{ formatBytes(server.total_memory ?? 0) }}
                    </div>
                    <div class="text-xs text-muted-foreground mt-0.5">
                      Physical RAM
                    </div>
                  </div>
                  <div class="bg-muted/30 border border-border rounded-lg p-3">
                    <div
                      class="text-xs text-muted-foreground uppercase tracking-wider"
                    >
                      Used
                    </div>
                    <div
                      class="text-base font-semibold font-mono mt-1"
                      :style="{ color: MAIN_COLOR }"
                    >
                      {{ formatBytes(server.used_memory ?? 0) }}
                    </div>
                    <div class="text-xs text-muted-foreground mt-0.5">
                      {{ showRamPercent(server).toFixed(1) }}%
                    </div>
                  </div>
                  <div class="bg-muted/30 border border-border rounded-lg p-3">
                    <div
                      class="text-xs text-muted-foreground uppercase tracking-wider"
                    >
                      Available
                    </div>
                    <div
                      class="text-base font-semibold font-mono mt-1 text-green-500"
                    >
                      {{ formatBytes(server.available_memory ?? 0) }}
                    </div>
                    <div class="text-xs text-muted-foreground mt-0.5">
                      {{ (100 - showRamPercent(server)).toFixed(1) }}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <!-- Disk View -->
          <div v-else-if="activeTab === 'disk'" key="disk" class="space-y-4">
            <Card>
              <CardHeader>
                <div class="flex items-center gap-4">
                  <CardTitle class="text-sm font-medium text-muted-foreground">
                    Disk I/O
                  </CardTitle>
                  <div class="flex items-center gap-3 text-xs font-mono">
                    <span class="status-main-text"
                      >↓ {{ formatBytes(server.read_speed ?? 0) }}/s</span
                    >
                    <span class="status-sub-text"
                      >↑ {{ formatBytes(server.write_speed ?? 0) }}/s</span
                    >
                  </div>
                  <div
                    v-if="server.total_space"
                    class="ml-auto flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <HardDrive class="h-3 w-3" />
                    {{
                      (
                        ((server.total_space - (server.available_space ?? 0)) /
                          server.total_space) *
                        100
                      ).toFixed(0)
                    }}%
                    <span class="font-mono">
                      {{
                        formatBytes(
                          server.total_space - (server.available_space ?? 0),
                        )
                      }}
                      /
                      {{ formatBytes(server.total_space) }}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  class="h-[260px] w-full flex items-end p-0 relative overflow-hidden"
                >
                  <UPlotChart
                    :data="diskReadAvgValues"
                    :data2="diskWriteAvgValues"
                    :timestamps="diskAvgTimestamps"
                    :color="MAIN_COLOR"
                    :color2="SUB_COLOR"
                    :maxValue="maxDiskSpeed"
                    yLabel="B/s"
                    label1="Read"
                    label2="Write"
                  />
                </div>
              </CardContent>
            </Card>

            <!-- Disk Detail: per-disk -->
            <div class="flex items-center gap-3">
              <div class="h-px flex-1 bg-border"></div>
              <span
                class="text-xs text-muted-foreground uppercase tracking-wider"
                >Disks</span
              >
              <div class="h-px flex-1 bg-border"></div>
            </div>

            <div v-if="detailLoading" class="space-y-2 animate-pulse">
              <div class="h-20 bg-muted rounded-lg"></div>
              <div class="h-20 bg-muted rounded-lg"></div>
            </div>
            <div v-else-if="dynamicDetail?.disk?.length" class="space-y-2">
              <div
                v-for="disk in dynamicDetail.disk"
                :key="disk.name"
                class="bg-muted/30 border border-border rounded-lg p-3 space-y-2"
              >
                <div class="flex items-center gap-2">
                  <span
                    :class="[
                      'text-xs font-bold px-1.5 py-0.5 rounded border',
                      disk.kind === 'SSD'
                        ? 'bg-green-500/10 text-green-500 border-green-500/30'
                        : disk.kind === 'HDD'
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                          : 'bg-muted text-muted-foreground border-border',
                    ]"
                    >{{ disk.kind }}</span
                  >
                  <span class="text-sm font-mono">{{ disk.name }}</span>
                  <span
                    class="ml-auto text-xs text-muted-foreground font-mono"
                    >{{ disk.mount_point }}</span
                  >
                </div>
                <div class="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full"
                    :style="{
                      width:
                        disk.total_space > 0
                          ? `${Math.min(((disk.total_space - disk.available_space) / disk.total_space) * 100, 100)}%`
                          : '0%',
                      backgroundColor: MAIN_COLOR,
                    }"
                  ></div>
                </div>
                <div class="flex items-center gap-4 text-xs font-mono">
                  <span :style="{ color: MAIN_COLOR }"
                    >↓ {{ formatBytes(disk.read_speed) }}/s</span
                  >
                  <span :style="{ color: SUB_COLOR }"
                    >↑ {{ formatBytes(disk.write_speed) }}/s</span
                  >
                  <span class="ml-auto text-muted-foreground">
                    {{ formatBytes(disk.total_space - disk.available_space) }} /
                    {{ formatBytes(disk.total_space) }}
                    ({{
                      disk.total_space > 0
                        ? Math.round(
                            ((disk.total_space - disk.available_space) /
                              disk.total_space) *
                              100,
                          )
                        : 0
                    }}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Network View -->
          <div
            v-else-if="activeTab === 'network'"
            key="network"
            class="space-y-6"
          >
            <!-- Chart Card -->
            <Card>
              <CardHeader>
                <div class="flex items-center gap-4">
                  <CardTitle class="text-sm font-medium text-muted-foreground">
                    Network Throughput
                  </CardTitle>
                  <div class="flex items-center gap-3 text-xs font-mono">
                    <span class="status-main-text"
                      >↓ {{ formatBytes(server.receive_speed ?? 0) }}/s</span
                    >
                    <span class="status-sub-text"
                      >↑ {{ formatBytes(server.transmit_speed ?? 0) }}/s</span
                    >
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  class="h-[260px] w-full flex items-end p-0 relative overflow-hidden"
                >
                  <UPlotChart
                    :data="netRxAvgValues"
                    :data2="netTxAvgValues"
                    :timestamps="netAvgTimestamps"
                    :color="MAIN_COLOR"
                    :color2="SUB_COLOR"
                    :maxValue="maxNetSpeed"
                    yLabel="B/s"
                    label1="Download"
                    label2="Upload"
                  />
                </div>
                <!-- Legend -->
                <div
                  class="flex items-center gap-4 mt-2 text-xs font-mono text-muted-foreground"
                >
                  <span class="flex items-center gap-1">
                    <span
                      class="inline-block w-3 h-0.5"
                      :style="{ backgroundColor: MAIN_COLOR }"
                    ></span>
                    Download (↓)
                  </span>
                  <span class="flex items-center gap-1">
                    <span
                      class="inline-block w-3 h-0.5"
                      :style="{ backgroundColor: SUB_COLOR }"
                    ></span>
                    Upload (↑)
                  </span>
                  <span v-if="server.tcp_connections != null" class="ml-auto">
                    TCP {{ server.tcp_connections }} &nbsp; UDP
                    {{ server.udp_connections }}
                  </span>
                </div>
              </CardContent>
            </Card>

            <!-- Traffic Summary -->
            <Card v-if="server.total_received != null">
              <CardHeader>
                <CardTitle class="text-sm font-medium text-muted-foreground">
                  Traffic Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div class="grid grid-cols-2 gap-4 text-sm font-mono">
                  <div class="flex items-center gap-2">
                    <span class="status-main-text">↓</span>
                    <span class="text-muted-foreground">Total Received</span>
                    <span class="ml-auto">{{
                      formatBytes(server.total_received ?? 0)
                    }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="status-sub-text">↑</span>
                    <span class="text-muted-foreground">Total Transmitted</span>
                    <span class="ml-auto">{{
                      formatBytes(server.total_transmitted ?? 0)
                    }}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <!-- Network Detail: per-interface -->
            <div class="flex items-center gap-3">
              <div class="h-px flex-1 bg-border"></div>
              <span
                class="text-xs text-muted-foreground uppercase tracking-wider"
                >Interfaces</span
              >
              <div class="h-px flex-1 bg-border"></div>
            </div>

            <div v-if="detailLoading" class="space-y-2 animate-pulse">
              <div class="h-16 bg-muted rounded-lg"></div>
              <div class="h-16 bg-muted rounded-lg"></div>
            </div>
            <div
              v-else-if="dynamicDetail?.network?.interfaces?.length"
              class="space-y-2"
            >
              <div
                v-for="iface in dynamicDetail.network.interfaces"
                :key="iface.interface_name"
                class="bg-muted/30 border border-border rounded-lg p-3"
              >
                <div class="flex items-center gap-4">
                  <span class="text-sm font-mono min-w-[80px]">{{
                    iface.interface_name
                  }}</span>
                  <div class="flex-1 space-y-1.5">
                    <div class="flex items-center gap-2">
                      <span class="text-xs w-3" :style="{ color: MAIN_COLOR }"
                        >↓</span
                      >
                      <div
                        class="flex-1 h-1.5 bg-muted rounded-full overflow-hidden"
                      >
                        <div
                          class="h-full rounded-full"
                          :style="{
                            width: `${(iface.receive_speed / maxNetDetailSpeed) * 100}%`,
                            backgroundColor: MAIN_COLOR,
                          }"
                        ></div>
                      </div>
                      <span
                        class="text-xs font-mono min-w-[80px] text-right"
                        :style="{ color: MAIN_COLOR }"
                      >
                        {{ formatBytes(iface.receive_speed) }}/s
                      </span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs w-3" :style="{ color: SUB_COLOR }"
                        >↑</span
                      >
                      <div
                        class="flex-1 h-1.5 bg-muted rounded-full overflow-hidden"
                      >
                        <div
                          class="h-full rounded-full"
                          :style="{
                            width: `${(iface.transmit_speed / maxNetDetailSpeed) * 100}%`,
                            backgroundColor: SUB_COLOR,
                          }"
                        ></div>
                      </div>
                      <span
                        class="text-xs font-mono min-w-[80px] text-right"
                        :style="{ color: SUB_COLOR }"
                      >
                        {{ formatBytes(iface.transmit_speed) }}/s
                      </span>
                    </div>
                  </div>
                  <div
                    class="text-xs font-mono text-muted-foreground text-right shrink-0"
                  >
                    <div>↓ {{ formatBytes(iface.total_received) }}</div>
                    <div>↑ {{ formatBytes(iface.total_transmitted) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.status-main-text {
  color: var(--status-main-color);
}
.status-sub-text {
  color: var(--status-sub-color);
}
</style>
