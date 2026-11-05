# Vercel + Railway

前端：<https://dittofeed-demo.vercel.app>（Next.js，根目录 `packages/dashboard`）。

后端：<https://api-production-0534.up.railway.app>。

Railway 项目：<https://railway.com/project/5f38c7c1-3d2e-42f9-93f9-9f3c1fda16d0>。

## 架构

- Vercel 部署 Dashboard，并将 `/api/*` 转发到 Railway API，浏览器使用同源的安全 Cookie。
- Dashboard 的服务端渲染连接 Railway PostgreSQL 和 ClickHouse。登录状态由 Railway 的 `/api/public/single-tenant/session` 校验。
- Railway 运行 API、Worker、Temporal、PostgreSQL 和 ClickHouse。PostgreSQL 和 ClickHouse 均使用持久化卷。
- API 的部署前命令运行数据库迁移和工作区初始化；Worker 执行 Temporal 工作流。

## 更新部署

从仓库根目录运行，使用各平台已登录的 CLI：

```bash
vercel deploy --prod --scope ethan-shens-projects-3acfa9fc
railway up --service api --detach
railway up --service worker --detach
```

Vercel 项目设置使用 `packages/dashboard/vercel.json` 的安装和构建命令。
Railway 的 Dockerfile 为 `deploy/railway/Dockerfile`，服务启动命令和基础设施配置见 `.railway/railway.ts`。

```bash
railway config plan
railway config apply
```

`.railway/railway.ts` 不管理环境变量，凭据保存在平台中。不要将 `.env`、`.vercel` 或 `.tmp` 提交到仓库。
单租户登录密码可在 Railway API 服务的 `PASSWORD` 变量中查看；首次部署的本地访问说明保存在 `.tmp/deployment-access.md`。

## 关键环境变量

Vercel：`BACKEND_ORIGIN`、`DATABASE_URL`、`CLICKHOUSE_HOST`、`CLICKHOUSE_USER`、`CLICKHOUSE_PASSWORD`、`AUTH_MODE=single-tenant`、`SESSION_COOKIE_SECURE=true`、`NEXT_STANDALONE=false`。

Railway API/Worker：`DATABASE_URL`、`CLICKHOUSE_HOST`、`CLICKHOUSE_USER`、`CLICKHOUSE_PASSWORD`、`TEMPORAL_ADDRESS`、`SECRET_KEY`、`PASSWORD`、`AUTH_MODE=single-tenant`、`SESSION_COOKIE_SECURE=true`、`WRITE_MODE=ch-sync`。

Vercel 的数据库连接使用 Railway TCP 代理；ClickHouse 使用 HTTPS。Railway 内部服务使用私有网络。`DASHBOARD_URL` 和 `DASHBOARD_API_BASE` 都指向前端正式域名。
