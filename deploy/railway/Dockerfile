FROM node:22-bookworm-slim AS builder
WORKDIR /service
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/*
COPY package.json yarn.lock .yarnrc.yml tsconfig.base.json ./
COPY .yarn .yarn
COPY packages/api packages/api
COPY packages/worker packages/worker
COPY packages/backend-lib packages/backend-lib
COPY packages/isomorphic-lib packages/isomorphic-lib
COPY packages/emailo packages/emailo
RUN node .yarn/releases/yarn-4.1.1.cjs workspaces focus api worker emailo
RUN node .yarn/releases/yarn-4.1.1.cjs workspace emailo build && \
    node .yarn/releases/yarn-4.1.1.cjs workspace api build && \
    node .yarn/releases/yarn-4.1.1.cjs workspace worker build

FROM node:22-bookworm-slim
WORKDIR /service
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/*
COPY --from=builder /service /service
ENV NODE_ENV=production
CMD ["node", "packages/api/dist/scripts/startServer.js"]
