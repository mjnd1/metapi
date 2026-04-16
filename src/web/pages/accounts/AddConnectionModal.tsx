import React from "react";
import CenteredModal from "../../components/CenteredModal.js";
import ModernSelect from "../../components/ModernSelect.js";
import { useToast } from "../../components/Toast.js";
import { SITE_DOCS_URL } from "../../docsLink.js";
import { normalizeVerifyFailureMessage } from "../helpers/accountVerifyFeedback.js";
import {
  type AddConnectionSegment,
  type AddConnectionSite,
  useAccountConnectionModal,
} from "./useAccountConnectionModal.js";

const SITE_SELECT_SEARCH_PLACEHOLDER = "筛选站点（名称 / 平台 / URL）";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-sm)",
  fontSize: 13,
  outline: "none",
  background: "var(--color-bg)",
  color: "var(--color-text-primary)",
};

type AddConnectionModalProps = {
  open: boolean;
  activeSegment: AddConnectionSegment;
  sites: AddConnectionSite[];
  initialSiteId?: number;
  initialPresetId?: string | null;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
};

function renderSpinnerText(text: string) {
  return (
    <>
      <span
        className="spinner spinner-sm"
        style={{
          borderTopColor: "white",
          borderColor: "rgba(255,255,255,0.3)",
        }}
      />
      {text}
    </>
  );
}

export default function AddConnectionModal({
  open,
  activeSegment,
  sites,
  initialSiteId = 0,
  initialPresetId = null,
  onClose,
  onSuccess,
}: AddConnectionModalProps) {
  const toast = useToast();
  const modal = useAccountConnectionModal({
    activeSegment,
    open,
    sites,
    initialSiteId,
    initialPresetId,
    toast,
    onClose,
    onSuccess,
  });

  if (!open) return null;

  return (
    <CenteredModal
      open={open}
      onClose={modal.close}
      title={
        activeSegment === "apikey"
          ? "添加 API Key 连接"
          : modal.addMode === "login"
            ? "账号密码登录"
            : "添加 Session 连接"
      }
      maxWidth={860}
      bodyStyle={{ display: "flex", flexDirection: "column", gap: 12 }}
      footer={
        <button onClick={modal.close} className="btn btn-ghost">
          取消
        </button>
      }
    >
      {activeSegment === "session" ? (
        <>
          <div
            style={{
              display: "flex",
              gap: 0,
              background: "var(--color-bg)",
              borderRadius: "var(--radius-sm)",
              padding: 3,
              marginBottom: 16,
            }}
          >
            <button
              onClick={modal.switchToTokenMode}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s",
                background:
                  modal.addMode === "token"
                    ? "var(--color-bg-card)"
                    : "transparent",
                color:
                  modal.addMode === "token"
                    ? "var(--color-primary)"
                    : "var(--color-text-muted)",
                boxShadow:
                  modal.addMode === "token" ? "var(--shadow-sm)" : "none",
              }}
            >
              Session Token / Cookie
            </button>
            <button
              onClick={modal.switchToLoginMode}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s",
                background:
                  modal.addMode === "login"
                    ? "var(--color-bg-card)"
                    : "transparent",
                color:
                  modal.addMode === "login"
                    ? "var(--color-primary)"
                    : "var(--color-text-muted)",
                boxShadow:
                  modal.addMode === "login" ? "var(--shadow-sm)" : "none",
              }}
            >
              账号密码登录
            </button>
          </div>

          {modal.addMode === "token" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="info-tip">
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    当前分段仅创建 Session 连接
                  </div>
                  <div>
                    <strong>推荐</strong> 使用系统访问令牌（Access Token）；浏览器 Cookie 仅用于兼容场景。
                  </div>
                  <div style={{ marginTop: 2 }}>
                    以 NewAPI 为例：控制台 → 个人设置 → 安全设置 → 生成「系统访问令牌」
                  </div>
                  <div
                    style={{
                      opacity: 0.7,
                      borderTop: "1px solid rgba(0,0,0,0.1)",
                      paddingTop: 6,
                      marginTop: 6,
                    }}
                  >
                    获取 Cookie:{" "}
                    <kbd
                      style={{
                        padding: "1px 5px",
                        background: "var(--color-bg-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 3,
                        fontSize: 11,
                      }}
                    >
                      F12
                    </kbd>{" "}
                    → Application → Cookie
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <a
                      href={SITE_DOCS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 12,
                        color: "var(--color-primary)",
                        textDecoration: "underline",
                      }}
                    >
                      查看认证方式与特殊站点说明文档
                    </a>
                  </div>
                </div>
              </div>

              <ModernSelect
                value={String(modal.tokenForm.siteId || 0)}
                onChange={(nextValue) => {
                  const nextSiteId = Number.parseInt(String(nextValue || "0"), 10) || 0;
                  modal.updateTokenForm((current) => ({ ...current, siteId: nextSiteId }));
                }}
                options={modal.siteSelectOptions}
                placeholder="选择站点"
                searchable
                searchPlaceholder={SITE_SELECT_SEARCH_PLACEHOLDER}
              />
              <input
                placeholder="连接名称（可选）"
                value={modal.tokenForm.username}
                onChange={(event) =>
                  modal.updateTokenForm((current) => ({
                    ...current,
                    username: event.target.value,
                  }))
                }
                style={inputStyle}
              />
              <textarea
                placeholder="粘贴 Session Access Token 或浏览器 Cookie"
                value={modal.tokenForm.accessToken}
                onChange={(event) =>
                  modal.updateTokenForm((current) => ({
                    ...current,
                    accessToken: event.target.value.trim(),
                  }))
                }
                style={{
                  ...inputStyle,
                  fontFamily: "var(--font-mono)",
                  height: 72,
                  resize: "none" as const,
                }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <input
                  placeholder="用户 ID（可选）"
                  value={modal.tokenForm.platformUserId}
                  onChange={(event) =>
                    modal.updateTokenForm((current) => ({
                      ...current,
                      platformUserId: event.target.value.replace(/\D/g, ""),
                    }))
                  }
                  style={inputStyle}
                />
                <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  若站点要求 New-Api-User / User-ID，请在这里提前填写。
                </div>
              </div>

              {modal.isSub2ApiSelected ? (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <input
                      placeholder="Sub2API refresh_token（可选，用于托管自动续期）"
                      value={modal.tokenForm.refreshToken}
                      onChange={(event) =>
                        modal.updateTokenForm((current) => ({
                          ...current,
                          refreshToken: event.target.value.trim(),
                        }))
                      }
                      style={{
                        ...inputStyle,
                        fontFamily: "var(--font-mono)",
                      }}
                    />
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                      可在浏览器控制台执行{" "}
                      <code style={{ fontFamily: "var(--font-mono)" }}>
                        localStorage.getItem('refresh_token')
                      </code>{" "}
                      获取。
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <input
                      placeholder="token_expires_at（可选，毫秒时间戳）"
                      value={modal.tokenForm.tokenExpiresAt}
                      onChange={(event) =>
                        modal.updateTokenForm((current) => ({
                          ...current,
                          tokenExpiresAt: event.target.value.replace(/\D/g, ""),
                        }))
                      }
                      style={inputStyle}
                    />
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                      配置 refresh_token 后，metapi 会在 JWT 临近过期或 401 时自动续期并回写新 token。
                    </div>
                  </div>
                </>
              ) : null}

              {modal.verifyResult?.success &&
              modal.verifyResult.tokenType === "session" ? (
                <div className="alert alert-success animate-scale-in">
                  <div
                    className="alert-title"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Session 凭证有效（Access Token / Cookie）
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                    <div>
                      用户名:{" "}
                      <strong>{modal.verifyResult.userInfo?.username || "未知"}</strong>
                    </div>
                    {modal.verifyResult.balance ? (
                      <div>
                        余额:{" "}
                        <strong>
                          ${(modal.verifyResult.balance.balance || 0).toFixed(2)}
                        </strong>
                      </div>
                    ) : null}
                    <div>
                      API Key:{" "}
                      <span
                        style={{
                          fontWeight: 500,
                          color: modal.verifyResult.apiToken
                            ? "var(--color-success)"
                            : "var(--color-text-muted)",
                        }}
                      >
                        {modal.verifyResult.apiToken
                          ? `已找到 (${modal.verifyResult.apiToken.substring(0, 8)}...)`
                          : "未找到"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              {modal.verifyResult?.success &&
              modal.verifyResult.tokenType === "apikey" ? (
                <div className="alert alert-warning animate-scale-in">
                  <div className="alert-title">
                    当前分段仅接受 Session 凭证，请切到「API Key 连接」分段创建。
                  </div>
                </div>
              ) : null}

              {modal.verifyResult &&
              !modal.verifyResult.success &&
              modal.verifyResult.needsUserId ? (
                <div className="alert alert-warning animate-scale-in">
                  <div className="alert-title">
                    此站点要求用户 ID，请补充后重新验证
                  </div>
                </div>
              ) : null}

              {modal.verifyResult &&
              !modal.verifyResult.success &&
              !modal.verifyResult.needsUserId ? (
                <div className="alert alert-error animate-scale-in">
                  <div className="alert-title">
                    {normalizeVerifyFailureMessage(modal.verifyResult.message) ||
                      "Token 无效或已过期"}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--color-text-muted)",
                      marginTop: 4,
                    }}
                  >
                    {modal.verifyFailureHint || "请检查 Token 是否正确"}
                  </div>
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={modal.handleVerifyToken}
                  disabled={
                    modal.verifying ||
                    !modal.tokenForm.siteId ||
                    !modal.tokenForm.accessToken
                  }
                  className="btn btn-ghost"
                  style={{
                    border: "1px solid var(--color-border)",
                    padding: "8px 14px",
                  }}
                >
                  {modal.verifying ? (
                    <>
                      <span className="spinner spinner-sm" />
                      验证中...
                    </>
                  ) : (
                    "验证 Token"
                  )}
                </button>
                <button
                  onClick={modal.handleTokenAdd}
                  disabled={
                    modal.saving ||
                    !modal.tokenForm.siteId ||
                    !modal.tokenForm.accessToken ||
                    !modal.canAddVerifiedConnection
                  }
                  className="btn btn-success"
                >
                  {modal.saving ? renderSpinnerText("添加中...") : "添加连接"}
                </button>
              </div>
              {!modal.verifyResult?.success ? (
                <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  {modal.addAccountPrereqHint}
                </div>
              ) : null}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="info-tip">
                输入目标站点的账号密码，将自动登录并获取访问令牌和 API Key
              </div>
              <ModernSelect
                value={String(modal.loginForm.siteId || 0)}
                onChange={(nextValue) => {
                  const nextSiteId = Number.parseInt(String(nextValue || "0"), 10) || 0;
                  modal.updateLoginSiteId(nextSiteId);
                }}
                options={modal.siteSelectOptions}
                placeholder="选择站点"
                searchable
                searchPlaceholder={SITE_SELECT_SEARCH_PLACEHOLDER}
              />
              <input
                placeholder="用户名"
                value={modal.loginForm.username}
                onChange={(event) => modal.updateLoginUsername(event.target.value)}
                style={inputStyle}
              />
              <input
                type="password"
                placeholder="密码"
                value={modal.loginForm.password}
                onChange={(event) => modal.updateLoginPassword(event.target.value)}
                onKeyDown={(event) =>
                  event.key === "Enter" && void modal.handleLoginAdd()
                }
                style={inputStyle}
              />
              <button
                onClick={modal.handleLoginAdd}
                disabled={
                  modal.saving ||
                  !modal.loginForm.siteId ||
                  !modal.loginForm.username ||
                  !modal.loginForm.password
                }
                className="btn btn-success"
                style={{ alignSelf: "flex-start" }}
              >
                {modal.saving
                  ? renderSpinnerText("登录并添加...")
                  : "登录并添加"}
              </button>
            </div>
          )}
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="info-tip">
            API Key 连接只用于代理转发，不会自动派生账号令牌。系统会按站点平台能力自动引导到 Session 或 API Key 创建流程。
          </div>

          {modal.createIntentPreset ? (
            <div className="alert alert-info animate-scale-in">
              <div className="alert-title">{modal.createIntentPreset.label}</div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--color-text-muted)",
                  marginTop: 4,
                  lineHeight: 1.8,
                }}
              >
                <div>{modal.createIntentPreset.description}</div>
                <div>
                  推荐模型：
                  {modal.createIntentPreset.recommendedModels.join(" / ")}
                </div>
                {modal.createIntentPreset.recommendedSkipModelFetch ? (
                  <div>
                    建议直接跳过模型验证，先保存 Base URL + Key，再补入推荐模型完成初始化。
                  </div>
                ) : null}
              </div>
              {modal.createIntentPreset.recommendedModels.length > 0 ? (
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    cursor: "pointer",
                    marginTop: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={modal.applyCreatePresetModels}
                    onChange={(event) =>
                      modal.setApplyCreatePresetModels(event.target.checked)
                    }
                    style={{ width: 14, height: 14 }}
                  />
                  <span>添加后自动补入推荐模型并重建路由</span>
                </label>
              ) : null}
            </div>
          ) : null}

          <ModernSelect
            value={String(modal.tokenForm.siteId || 0)}
            onChange={(nextValue) => {
              const nextSiteId = Number.parseInt(String(nextValue || "0"), 10) || 0;
              modal.updateApiKeySiteId(nextSiteId);
            }}
            options={modal.siteSelectOptions}
            placeholder="选择站点"
            searchable
            searchPlaceholder={SITE_SELECT_SEARCH_PLACEHOLDER}
          />
          <input
            placeholder="连接名称（可选）"
            value={modal.tokenForm.username}
            onChange={(event) =>
              modal.updateTokenForm((current) => ({
                ...current,
                username: event.target.value,
                credentialMode: "apikey",
              }))
            }
            style={inputStyle}
          />
          <textarea
            placeholder="粘贴 API Key"
            value={modal.tokenForm.accessToken}
            onChange={(event) =>
              modal.updateTokenForm((current) => ({
                ...current,
                accessToken: event.target.value,
                credentialMode: "apikey",
              }))
            }
            style={{
              ...inputStyle,
              fontFamily: "var(--font-mono)",
              height: 72,
              resize: "none" as const,
            }}
          />
          {modal.parsedApiKeys.length > 0 ? (
            <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              已识别 {modal.parsedApiKeys.length} 个 API Key
              {modal.isBatchApiKeyInput
                ? "，添加时会逐条创建同站点连接并参与轮询"
                : ""}
            </div>
          ) : null}
          <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            支持换行、空格、逗号批量粘贴多个 API Key。
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <input
              placeholder="用户 ID（可选）"
              value={modal.tokenForm.platformUserId}
              onChange={(event) =>
                modal.updateTokenForm((current) => ({
                  ...current,
                  platformUserId: event.target.value.replace(/\D/g, ""),
                  credentialMode: "apikey",
                }))
              }
              style={inputStyle}
            />
            <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              若站点要求 New-Api-User / User-ID，请在这里提前填写。
            </div>
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              cursor: "pointer",
              alignSelf: "flex-start",
            }}
          >
            <input
              type="checkbox"
              checked={!!modal.tokenForm.skipModelFetch}
              onChange={(event) =>
                modal.updateTokenForm((current) => ({
                  ...current,
                  skipModelFetch: event.target.checked,
                }))
              }
              style={{ width: 14, height: 14 }}
            />
            <span>跳过模型验证（直接添加 API Key）</span>
          </label>

          {modal.verifyResult?.success &&
          modal.verifyResult.tokenType === "apikey" ? (
            <div className="alert alert-info animate-scale-in">
              <div
                className="alert-title"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
                API Key 验证成功
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                <div>
                  可用模型: <strong>{modal.verifyResult.modelCount} 个</strong>
                </div>
                {modal.verifyResult.models ? (
                  <div style={{ color: "var(--color-text-muted)" }}>
                    包含: {modal.verifyResult.models.join(", ")}
                    {modal.verifyResult.modelCount > 10 ? " ..." : ""}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {modal.verifyResult?.success &&
          modal.verifyResult.tokenType === "session" ? (
            <div className="alert alert-warning animate-scale-in">
              <div className="alert-title">
                当前分段仅接受 API Key，请切到「Session 连接」分段创建。
              </div>
            </div>
          ) : null}

          {modal.verifyResult &&
          !modal.verifyResult.success &&
          modal.verifyResult.needsUserId ? (
            <div className="alert alert-warning animate-scale-in">
              <div className="alert-title">
                此站点要求用户 ID，请补充后重新验证
              </div>
            </div>
          ) : null}

          {modal.verifyResult &&
          !modal.verifyResult.success &&
          !modal.verifyResult.needsUserId ? (
            <div className="alert alert-error animate-scale-in">
              <div className="alert-title">
                {normalizeVerifyFailureMessage(modal.verifyResult.message) ||
                  "Token 无效或已过期"}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--color-text-muted)",
                  marginTop: 4,
                }}
              >
                {modal.verifyFailureHint || "请检查 Token 是否正确"}
              </div>
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={modal.handleVerifyToken}
              disabled={
                modal.verifying ||
                !modal.tokenForm.siteId ||
                !modal.tokenForm.accessToken ||
                modal.isBatchApiKeyInput
              }
              className="btn btn-ghost"
              style={{
                border: "1px solid var(--color-border)",
                padding: "8px 14px",
              }}
            >
              {modal.verifying ? (
                <>
                  <span className="spinner spinner-sm" />
                  验证中...
                </>
              ) : modal.isBatchApiKeyInput ? (
                "批量添加时校验"
              ) : (
                "验证 API Key"
              )}
            </button>
            <button
              onClick={modal.handleTokenAdd}
              disabled={
                modal.saving ||
                !modal.tokenForm.siteId ||
                !modal.tokenForm.accessToken ||
                !modal.canSubmitApiKeyConnection
              }
              className="btn btn-success"
            >
              {modal.saving
                ? renderSpinnerText("添加中...")
                : modal.isBatchApiKeyInput
                  ? "批量添加连接"
                  : "添加连接"}
            </button>
          </div>
          {!modal.verifyResult?.success ? (
            <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              {modal.isBatchApiKeyInput
                ? "批量模式下无需先点验证，提交后会逐条校验并创建。"
                : modal.addAccountPrereqHint}
            </div>
          ) : null}
        </div>
      )}
    </CenteredModal>
  );
}
