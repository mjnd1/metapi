# syntax=docker/dockerfile:1.7
# Keep the Docker base on Node 22 because the official Node 24/25 slim images
# no longer publish linux/arm/v7 manifests, which breaks our armv7 Docker jobs.
FROM node:22-bookworm-slim AS builder

# 1. 启用 Corepack 并准备 pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 安装构建原生依赖所需的工具
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

ENV PYTHON=/usr/bin/python3

# 2. 复制依赖描述文件
COPY package.json pnpm-lock.yaml ./

# 3. 使用 BuildKit 缓存安装依赖
# 注意：使用 --frozen-lockfile 确保与锁文件一致
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --ignore-scripts --no-audit --no-fund
RUN pnpm rebuild esbuild sharp better-sqlite3 --no-audit --no-fund

# 4. 复制代码并构建
COPY . .
RUN pnpm run build:web && pnpm run build:server
# 5. 清理开发依赖 (仅保留生产环境所需的 node_modules)
# 这一步是为了让最后的镜像更小
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm prune --omit=dev --no-audit --no-fund

# --- 运行时阶段 ---
FROM node:22-bookworm-slim

WORKDIR /app

ARG TARGETARCH
ARG TARGETVARIANT
ARG KUBECTL_VERSION=v1.31.8
ARG HELM_VERSION=v3.18.6

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl tar gzip \
  && case "$TARGETARCH" in \
    amd64|arm64) export ARCH="$TARGETARCH" ;; \
    arm) \
      if [ "${TARGETVARIANT:-}" = "v7" ]; then \
        export ARCH="arm"; \
      else \
        echo "Unsupported TARGETARCH/TARGETVARIANT: $TARGETARCH/${TARGETVARIANT:-}" >&2; exit 1; \
      fi ;; \
    *) echo "Unsupported TARGETARCH/TARGETVARIANT: $TARGETARCH/${TARGETVARIANT:-}" >&2; exit 1 ;; \
  esac \
  && curl -fsSL -o /usr/local/bin/kubectl "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/${ARCH}/kubectl" \
  && chmod +x /usr/local/bin/kubectl \
  && curl -fsSL "https://get.helm.sh/helm-${HELM_VERSION}-linux-${ARCH}.tar.gz" -o /tmp/helm.tgz \
  && tar -xzf /tmp/helm.tgz -C /tmp \
  && mv "/tmp/linux-${ARCH}/helm" /usr/local/bin/helm \
  && chmod +x /usr/local/bin/helm \
  && rm -rf /tmp/helm.tgz "/tmp/linux-${ARCH}" /var/lib/apt/lists/*

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/drizzle ./drizzle

RUN mkdir -p /app/data

EXPOSE 4000

ENV NODE_ENV=production
ENV DATA_DIR=/app/data

# 建议：确保 migrate.js 失败时容器能正确退出
CMD ["sh", "-c", "node dist/server/db/migrate.js && node dist/server/index.js"]
