import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api.js";
import type { ToastContextValue } from "../../components/Toast.js";
import {
  buildAddAccountPrereqHint,
  buildVerifyFailureHint,
  normalizeVerifyFailureMessage,
} from "../helpers/accountVerifyFeedback.js";
import { getSiteInitializationPreset } from "../../../shared/siteInitializationPresets.js";
import { parseBatchApiKeys } from "../../../shared/apiKeyBatch.js";

export type AddConnectionSegment = "session" | "apikey";
export type AddConnectionMode = "token" | "login";

export type AddConnectionSite = {
  id: number;
  name?: string | null;
  platform?: string | null;
  url?: string | null;
};

type LoginForm = {
  siteId: number;
  username: string;
  password: string;
};

type TokenForm = {
  siteId: number;
  username: string;
  accessToken: string;
  platformUserId: string;
  refreshToken: string;
  tokenExpiresAt: string;
  credentialMode: AddConnectionSegment;
  skipModelFetch: boolean;
};

type UseAccountConnectionModalParams = {
  activeSegment: AddConnectionSegment;
  open: boolean;
  sites: AddConnectionSite[];
  initialSiteId?: number;
  initialPresetId?: string | null;
  toast: ToastContextValue;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
};

function createLoginForm(): LoginForm {
  return { siteId: 0, username: "", password: "" };
}

function createTokenForm(
  credentialMode: AddConnectionSegment = "session",
): TokenForm {
  return {
    siteId: 0,
    username: "",
    accessToken: "",
    platformUserId: "",
    refreshToken: "",
    tokenExpiresAt: "",
    credentialMode,
    skipModelFetch: false,
  };
}

function normalizeSiteId(value?: number): number {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : 0;
}

export function useAccountConnectionModal({
  activeSegment,
  open,
  sites,
  initialSiteId = 0,
  initialPresetId = null,
  toast,
  onClose,
  onSuccess,
}: UseAccountConnectionModalParams) {
  const [addMode, setAddMode] = useState<AddConnectionMode>("token");
  const [loginForm, setLoginForm] = useState<LoginForm>(createLoginForm);
  const [tokenForm, setTokenForm] = useState<TokenForm>(() =>
    createTokenForm(activeSegment),
  );
  const [createIntentPresetId, setCreateIntentPresetId] = useState<string | null>(
    null,
  );
  const [applyCreatePresetModels, setApplyCreatePresetModels] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);

  const siteSelectOptions = useMemo(
    () => [
      { value: "0", label: "选择站点" },
      ...sites.map((site) => ({
        value: String(site.id),
        label: `${site.name || "未命名站点"} (${site.platform || "-"})`,
        description: site.url || undefined,
      })),
    ],
    [sites],
  );

  const selectedTokenSite = useMemo(
    () => sites.find((item) => item.id === tokenForm.siteId) || null,
    [sites, tokenForm.siteId],
  );

  const isSub2ApiSelected =
    String(selectedTokenSite?.platform || "").toLowerCase() === "sub2api";

  const parsedApiKeys = useMemo(
    () =>
      activeSegment === "apikey"
        ? parseBatchApiKeys(tokenForm.accessToken)
        : [],
    [activeSegment, tokenForm.accessToken],
  );

  const isBatchApiKeyInput =
    activeSegment === "apikey" && parsedApiKeys.length > 1;

  const createIntentPreset = useMemo(
    () => getSiteInitializationPreset(createIntentPresetId),
    [createIntentPresetId],
  );

  const verifyFailureHint = useMemo(
    () => buildVerifyFailureHint(verifyResult),
    [verifyResult],
  );

  const addAccountPrereqHint = useMemo(
    () => buildAddAccountPrereqHint(verifyResult),
    [verifyResult],
  );

  const canAddVerifiedConnection = Boolean(
    verifyResult?.success &&
      ((activeSegment === "apikey" && verifyResult.tokenType === "apikey") ||
        (activeSegment === "session" && verifyResult.tokenType === "session")),
  );

  const canSubmitApiKeyConnection =
    activeSegment === "apikey"
      ? isBatchApiKeyInput ||
        canAddVerifiedConnection ||
        !!tokenForm.skipModelFetch
      : canAddVerifiedConnection;

  const reset = useCallback(
    (options?: { siteId?: number; presetId?: string | null }) => {
      const nextSiteId = normalizeSiteId(options?.siteId);
      const nextPreset = getSiteInitializationPreset(options?.presetId);
      setAddMode("token");
      setLoginForm(createLoginForm());
      setTokenForm({
        ...createTokenForm(activeSegment),
        siteId: nextSiteId,
        skipModelFetch:
          activeSegment === "apikey" &&
          nextPreset?.recommendedSkipModelFetch === true,
      });
      setCreateIntentPresetId(nextPreset?.id || null);
      setApplyCreatePresetModels(Boolean(nextPreset?.recommendedModels?.length));
      setVerifyResult(null);
      setVerifying(false);
      setSaving(false);
    },
    [activeSegment],
  );

  useEffect(() => {
    if (!open) return;
    reset({
      siteId: initialSiteId,
      presetId: initialPresetId,
    });
  }, [initialPresetId, initialSiteId, open, reset]);

  const close = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const handleLoginAdd = useCallback(async () => {
    if (!loginForm.siteId || !loginForm.username || !loginForm.password) return;
    setSaving(true);
    try {
      const result = await api.loginAccount(loginForm);
      if (result.success) {
        const msg = result.apiTokenFound
          ? `账号 "${loginForm.username}" 已添加，API Key 已自动获取`
          : `账号 "${loginForm.username}" 已添加（未找到 API Key，请手动设置）`;
        close();
        toast.success(msg);
        await onSuccess();
      } else {
        toast.error(result.message || "登录失败");
      }
    } catch (error: any) {
      toast.error(error?.message || "登录请求失败");
    } finally {
      setSaving(false);
    }
  }, [close, loginForm, onSuccess, toast]);

  const handleVerifyToken = useCallback(async () => {
    if (!tokenForm.siteId || !tokenForm.accessToken) return;
    if (isBatchApiKeyInput) {
      toast.info(
        `检测到 ${parsedApiKeys.length} 个 API Key，批量模式会在添加时逐条校验`,
      );
      return;
    }
    setVerifying(true);
    setVerifyResult(null);
    try {
      const result = await api.verifyToken({
        siteId: tokenForm.siteId,
        accessToken: tokenForm.accessToken,
        platformUserId: tokenForm.platformUserId
          ? Number.parseInt(tokenForm.platformUserId, 10)
          : undefined,
        credentialMode: activeSegment,
      });
      setVerifyResult(result);
      if (result.success) {
        if (result.tokenType === "apikey") {
          toast.success(
            `API Key 验证成功（可用模型 ${result.modelCount || 0} 个）`,
          );
        } else {
          toast.success(
            `Session 验证成功: ${result.userInfo?.username || "未知用户"}`,
          );
        }
      } else {
        toast.error(
          normalizeVerifyFailureMessage(result.message || "Token 无效"),
        );
      }
    } catch (error: any) {
      toast.error(normalizeVerifyFailureMessage(error?.message));
      setVerifyResult({ success: false, message: error?.message });
    } finally {
      setVerifying(false);
    }
  }, [
    activeSegment,
    isBatchApiKeyInput,
    parsedApiKeys.length,
    toast,
    tokenForm.accessToken,
    tokenForm.platformUserId,
    tokenForm.siteId,
  ]);

  const handleTokenAdd = useCallback(async () => {
    if (!tokenForm.siteId || !tokenForm.accessToken) return;
    if (
      !isBatchApiKeyInput &&
      !verifyResult?.success &&
      !tokenForm.skipModelFetch
    ) {
      toast.error("请先验证 Token 成功后再添加账号");
      return;
    }

    const initializationPreset = createIntentPreset;
    setSaving(true);
    try {
      const result = await api.addAccount({
        siteId: tokenForm.siteId,
        username: tokenForm.username.trim() || undefined,
        accessToken: tokenForm.accessToken,
        accessTokens: isBatchApiKeyInput ? parsedApiKeys : undefined,
        platformUserId: tokenForm.platformUserId
          ? Number.parseInt(tokenForm.platformUserId, 10)
          : undefined,
        refreshToken:
          isSub2ApiSelected && tokenForm.refreshToken.trim()
            ? tokenForm.refreshToken.trim()
            : undefined,
        tokenExpiresAt:
          isSub2ApiSelected && tokenForm.tokenExpiresAt.trim()
            ? Number.parseInt(tokenForm.tokenExpiresAt.trim(), 10)
            : undefined,
        credentialMode: activeSegment,
        skipModelFetch: tokenForm.skipModelFetch,
      });

      if (result?.batch) {
        const createdCount = Number(result.createdCount) || 0;
        const failedCount = Number(result.failedCount) || 0;
        close();
        if (createdCount > 0) {
          toast.success(`批量添加完成：成功 ${createdCount}，失败 ${failedCount}`);
        }
        const failedItems = Array.isArray(result.items)
          ? result.items.filter((item: any) => item?.status === "failed")
          : [];
        if (failedItems.length > 0) {
          const firstMessage = failedItems[0]?.message || "创建失败";
          toast.error(`失败 ${failedItems.length} 条：${firstMessage}`);
        }
        await onSuccess();
        return;
      }

      let seededRecommendedModels = false;
      const recommendedModels = initializationPreset?.recommendedModels || [];
      const createdAccountId = Number(result?.id) || 0;
      const shouldSeedRecommendedModels =
        activeSegment === "apikey" &&
        tokenForm.skipModelFetch &&
        applyCreatePresetModels &&
        recommendedModels.length > 0 &&
        createdAccountId > 0;

      if (shouldSeedRecommendedModels) {
        try {
          await api.addAccountAvailableModels(createdAccountId, recommendedModels);
          seededRecommendedModels = true;
        } catch (seedError: any) {
          toast.error(seedError?.message || "连接已添加，但推荐模型补录失败");
        }
      }

      close();
      if (result.queued) {
        toast.info(result.message || "账号已添加，后台正在同步初始化信息。");
      } else if (result.tokenType === "apikey") {
        toast.success("已添加为 API Key 账号（可用于代理转发）");
      } else {
        const parts: string[] = [];
        if (result.usernameDetected) parts.push("用户名已自动识别");
        if (result.apiTokenFound) parts.push("API Key 已自动获取");
        const extra = parts.length ? `（${parts.join("，")}）` : "";
        toast.success(`账号已添加${extra}`);
      }
      if (seededRecommendedModels) {
        toast.success(`已补入 ${recommendedModels.length} 个推荐模型并重建路由`);
      }
      await onSuccess();
    } catch (error: any) {
      toast.error(error?.message || "添加失败");
    } finally {
      setSaving(false);
    }
  }, [
    activeSegment,
    applyCreatePresetModels,
    close,
    createIntentPreset,
    isBatchApiKeyInput,
    isSub2ApiSelected,
    onSuccess,
    parsedApiKeys,
    toast,
    tokenForm,
    verifyResult?.success,
  ]);

  const switchToTokenMode = useCallback(() => {
    setAddMode("token");
    setVerifyResult(null);
  }, []);

  const switchToLoginMode = useCallback(() => {
    setAddMode("login");
    setVerifyResult(null);
  }, []);

  const updateLoginSiteId = useCallback((siteId: number) => {
    setLoginForm((current) => ({ ...current, siteId }));
  }, []);

  const updateLoginUsername = useCallback((username: string) => {
    setLoginForm((current) => ({ ...current, username }));
  }, []);

  const updateLoginPassword = useCallback((password: string) => {
    setLoginForm((current) => ({ ...current, password }));
  }, []);

  const updateTokenForm = useCallback(
    (updater: (current: TokenForm) => TokenForm) => {
      setTokenForm((current) => {
        const next = updater(current);
        if (
          next.accessToken !== current.accessToken ||
          next.siteId !== current.siteId ||
          next.platformUserId !== current.platformUserId
        ) {
          setVerifyResult(null);
        }
        return next;
      });
    },
    [],
  );

  const updateApiKeySiteId = useCallback(
    (siteId: number) => {
      setTokenForm((current) => ({
        ...current,
        siteId,
        credentialMode: "apikey",
      }));
      setVerifyResult(null);
      if (createIntentPresetId && siteId !== tokenForm.siteId) {
        setCreateIntentPresetId(null);
        setApplyCreatePresetModels(false);
      }
    },
    [createIntentPresetId, tokenForm.siteId],
  );

  return {
    addMode,
    loginForm,
    tokenForm,
    createIntentPreset,
    applyCreatePresetModels,
    verifyResult,
    verifying,
    saving,
    siteSelectOptions,
    isSub2ApiSelected,
    parsedApiKeys,
    isBatchApiKeyInput,
    verifyFailureHint,
    addAccountPrereqHint,
    canAddVerifiedConnection,
    canSubmitApiKeyConnection,
    close,
    switchToTokenMode,
    switchToLoginMode,
    updateLoginSiteId,
    updateLoginUsername,
    updateLoginPassword,
    updateTokenForm,
    updateApiKeySiteId,
    setApplyCreatePresetModels,
    handleLoginAdd,
    handleVerifyToken,
    handleTokenAdd,
  };
}
