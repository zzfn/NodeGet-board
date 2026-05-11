<script setup lang="ts">
import { ref, onMounted } from "vue";
import { toast } from "vue-sonner";
import { FolderOpen } from "lucide-vue-next";
import { zip as fflateZip } from "fflate";
import { useStaticBucket } from "@/composables/useStaticBucket";
import { useStaticBucketFile } from "@/composables/useStaticBucketFile";
import { bufToBase64, base64ToBuf } from "@/utils/base64";
import type {
  StaticBucketInput,
  StaticBucket,
} from "@/composables/useStaticBucket";
import StaticBucketTable from "@/components/static-bucket/StaticBucketTable.vue";
import StaticBucketDialog from "@/components/static-bucket/StaticBucketDialog.vue";
import StaticBucketFileView from "@/components/static-bucket/StaticBucketFileView.vue";
import StaticBucketFileUploadDialog from "@/components/static-bucket/StaticBucketFileUploadDialog.vue";
import StaticBucketUploadDirDialog from "@/components/static-bucket/StaticBucketUploadDirDialog.vue";

definePage({
  meta: {
    title: "router.staticBucket",
    icon: FolderOpen,
    order: 10,
    group: "router.group.advanced",
  },
});

const sb = useStaticBucket();
const sbf = useStaticBucketFile();
const sbfDownload = useStaticBucketFile();

const selectedBucket = ref<string | null>(null);
const deletingBucketName = ref<string | null>(null);
const deletingFilePath = ref<string | null>(null);
const savingFile = ref(false);

const bucketDialogOpen = ref(false);
const bucketDialogLoading = ref(false);
const bucketDialogError = ref<string | null>(null);
const bucketDialogInitial = ref<StaticBucketInput | null>(null);

const uploadFileOpen = ref(false);
const uploadFileLoading = ref(false);
const uploadFileError = ref<string | null>(null);

const uploadDirOpen = ref(false);
const uploadDirLoading = ref(false);
const uploadDirError = ref<string | null>(null);
const uploadDirTarget = ref<string | null>(null);

const fileViewRef = ref<InstanceType<typeof StaticBucketFileView> | null>(null);

onMounted(() => {
  sb.fetchList();
});

const openCreateBucket = () => {
  bucketDialogInitial.value = null;
  bucketDialogError.value = null;
  bucketDialogOpen.value = true;
};

const handleBucketSave = async (input: StaticBucketInput) => {
  bucketDialogError.value = null;
  bucketDialogLoading.value = true;
  try {
    if (bucketDialogInitial.value) {
      await sb.updateBucket(input);
      toast.success(`Bucket「${input.name}」已更新`);
    } else {
      await sb.createBucket(input);
      toast.success(`Bucket「${input.name}」已创建`);
    }
    bucketDialogOpen.value = false;
    await sb.fetchList();
  } catch (e: unknown) {
    bucketDialogError.value = e instanceof Error ? e.message : String(e);
  } finally {
    bucketDialogLoading.value = false;
  }
};

const handleToggleHttpRoot = async (bucket: StaticBucket) => {
  try {
    const { id: _id, ...bucketInput } = bucket;
    await sb.updateBucket({
      ...bucketInput,
      is_http_root: !bucket.is_http_root,
    });
    await sb.fetchList();
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : "更新失败");
  }
};

const handleBucketDelete = async (name: string) => {
  deletingBucketName.value = name;
  try {
    await sb.deleteBucket(name);
    toast.success(`Bucket「${name}」已删除`);
    if (selectedBucket.value === name) selectedBucket.value = null;
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : "删除失败");
  } finally {
    deletingBucketName.value = null;
  }
};

const enterBucket = async (name: string) => {
  selectedBucket.value = name;
  await sbf.fetchList(name);
};

const backToList = () => {
  selectedBucket.value = null;
  sbf.clearFiles();
};

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

const downloadBucketZip = async (bucketName: string) => {
  toast.info("正在打包文件...");
  try {
    await sbfDownload.fetchList(bucketName);
    const files = sbfDownload.files.value;
    if (!files.length) {
      toast.info("暂无文件");
      return;
    }

    const zipInput: Record<string, Uint8Array> = {};
    for (const file of files) {
      const base64 = await sbfDownload.readFile(bucketName, file.path);
      zipInput[file.path] = base64ToBuf(base64);
    }

    await new Promise<void>((resolve, reject) => {
      fflateZip(zipInput, (err, data) => {
        if (err) return reject(err);
        triggerBlobDownload(
          new Blob([data.buffer as ArrayBuffer], { type: "application/zip" }),
          `${bucketName}.zip`,
        );
        resolve();
      });
    });
    toast.success("下载完成");
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : "打包失败");
  }
};

const openUploadDir = (targetBucket?: string) => {
  uploadDirTarget.value = targetBucket ?? null;
  uploadDirError.value = null;
  uploadDirOpen.value = true;
};

const handleUploadDir = async (
  files: Array<{ path: string; base64: string }>,
) => {
  const target = uploadDirTarget.value ?? selectedBucket.value;
  if (!target) return;
  uploadDirLoading.value = true;
  uploadDirError.value = null;
  try {
    const remoteFiles = await sbf.fetchList(target);
    const localPaths = new Set(files.map((f) => f.path));
    const extraRemotePaths = remoteFiles
      .map((f) => f.path)
      .filter((p) => !localPaths.has(p));

    for (const file of files) {
      await sbf.uploadFile(target, file.path, file.base64);
    }
    for (const path of extraRemotePaths) {
      await sbf.deleteFile(target, path);
    }
    toast.success(
      `已同步到「${target}」：上传 ${files.length} 个，删除 ${extraRemotePaths.length} 个`,
    );
    uploadDirOpen.value = false;
    if (selectedBucket.value === target) {
      await sbf.fetchList(target);
    }
  } catch (e: unknown) {
    uploadDirError.value = e instanceof Error ? e.message : String(e);
  } finally {
    uploadDirLoading.value = false;
  }
};

const handleCreateAndUpload = async (
  bucketName: string,
  files: Array<{ path: string; base64: string }>,
) => {
  uploadDirLoading.value = true;
  uploadDirError.value = null;
  try {
    await sb.createBucket({
      name: bucketName,
      path: bucketName,
      is_http_root: false,
      cors: false,
    });
    for (const file of files) {
      await sbf.uploadFile(bucketName, file.path, file.base64);
    }
    toast.success(`Bucket「${bucketName}」已创建，上传 ${files.length} 个文件`);
    uploadDirOpen.value = false;
    await sb.fetchList();
  } catch (e: unknown) {
    uploadDirError.value = e instanceof Error ? e.message : String(e);
  } finally {
    uploadDirLoading.value = false;
  }
};

const handleUploadFile = async (path: string, base64: string) => {
  if (!selectedBucket.value) return;
  uploadFileError.value = null;
  uploadFileLoading.value = true;
  try {
    await sbf.uploadFile(selectedBucket.value, path, base64);
    toast.success(`文件「${path}」上传成功`);
    uploadFileOpen.value = false;
    await sbf.fetchList(selectedBucket.value);
  } catch (e: unknown) {
    uploadFileError.value = e instanceof Error ? e.message : String(e);
  } finally {
    uploadFileLoading.value = false;
  }
};

const isBinaryBuffer = (buf: Uint8Array): boolean => {
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buf);
    return false;
  } catch {
    return true;
  }
};

const handleReadFile = async (path: string) => {
  if (!selectedBucket.value || !fileViewRef.value) return;
  try {
    const base64 = await sbf.readFile(selectedBucket.value, path);
    const buf = base64ToBuf(base64);
    if (isBinaryBuffer(buf)) {
      fileViewRef.value.onFileContentUnsupported();
      return;
    }
    const text = new TextDecoder().decode(buf);
    fileViewRef.value.onFileContentLoaded(text);
  } catch (e: unknown) {
    fileViewRef.value?.onFileContentError(
      e instanceof Error ? e.message : String(e),
    );
  }
};

const handleSaveFile = async (path: string, content: string) => {
  if (!selectedBucket.value) return;
  savingFile.value = true;
  try {
    const base64 = bufToBase64(new TextEncoder().encode(content));
    await sbf.uploadFile(selectedBucket.value, path, base64);
    toast.success("已保存");
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : "保存失败");
  } finally {
    savingFile.value = false;
  }
};

const handleReplaceFile = async (path: string, base64: string) => {
  if (!selectedBucket.value || !fileViewRef.value) return;
  savingFile.value = true;
  try {
    await sbf.uploadFile(selectedBucket.value, path, base64);
    toast.success("已上传替换");
    await handleReadFile(path);
    await sbf.fetchList(selectedBucket.value);
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : "上传失败");
  } finally {
    savingFile.value = false;
  }
};

const handleDownloadFile = async (path: string) => {
  if (!selectedBucket.value) return;
  try {
    const base64 = await sbf.readFile(selectedBucket.value, path);
    triggerBlobDownload(
      new Blob([base64ToBuf(base64).buffer as ArrayBuffer], {
        type: "application/octet-stream",
      }),
      path.split("/").pop() ?? path,
    );
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : "下载失败");
  }
};

const handleRenameFile = async (from: string, to: string) => {
  if (!selectedBucket.value) return;
  if (sbf.files.value.some((f) => f.path === to)) {
    toast.error("目标路径已存在同名文件");
    return;
  }
  try {
    await sbf.renameFile(selectedBucket.value, from, to);
    await sbf.fetchList(selectedBucket.value);
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : "移动失败");
  }
};

const handleDeleteFile = async (path: string) => {
  if (!selectedBucket.value) return;
  deletingFilePath.value = path;
  try {
    await sbf.deleteFile(selectedBucket.value, path);
    toast.success(`「${path}」已删除`);
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : "删除失败");
  } finally {
    deletingFilePath.value = null;
  }
};
</script>

<template>
  <div class="h-full flex flex-col space-y-4">
    <h1 class="text-2xl font-bold mb-2">静态资源管理</h1>

    <StaticBucketFileView
      v-if="selectedBucket"
      ref="fileViewRef"
      :bucket-name="selectedBucket"
      :files="sbf.files.value"
      :loading="sbf.loading.value"
      :saving-file="savingFile"
      :deleting-path="deletingFilePath"
      @back="backToList"
      @upload-file="uploadFileOpen = true"
      @upload-dir="openUploadDir(selectedBucket)"
      @download-zip="downloadBucketZip(selectedBucket)"
      @download-file="handleDownloadFile"
      @delete-file="handleDeleteFile"
      @read-file="handleReadFile"
      @save-file="handleSaveFile"
      @replace-file="handleReplaceFile"
      @rename-file="handleRenameFile"
    />

    <StaticBucketTable
      v-else
      :buckets="sb.buckets.value"
      :loading="sb.loading.value"
      :deleting-name="deletingBucketName"
      @select="enterBucket"
      @create="openCreateBucket"
      @upload-dir="openUploadDir()"
      @reupload="(name) => openUploadDir(name)"
      @download-zip="downloadBucketZip"
      @delete="handleBucketDelete"
      @toggle-http-root="handleToggleHttpRoot"
      @refresh="sb.fetchList()"
    />

    <StaticBucketDialog
      :open="bucketDialogOpen"
      :loading="bucketDialogLoading"
      :error="bucketDialogError"
      :initial="bucketDialogInitial"
      @update:open="bucketDialogOpen = $event"
      @save="handleBucketSave"
    />

    <StaticBucketFileUploadDialog
      :open="uploadFileOpen"
      :loading="uploadFileLoading"
      :error="uploadFileError"
      @update:open="uploadFileOpen = $event"
      @upload="handleUploadFile"
    />

    <StaticBucketUploadDirDialog
      :open="uploadDirOpen"
      :loading="uploadDirLoading"
      :error="uploadDirError"
      :target-bucket="uploadDirTarget"
      @update:open="uploadDirOpen = $event"
      @create="handleCreateAndUpload"
      @upload="handleUploadDir"
    />
  </div>
</template>
