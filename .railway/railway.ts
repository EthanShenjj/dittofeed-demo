import {
  defineRailway,
  image,
  postgres,
  project,
  service,
  volume,
} from "railway/iac";

export default defineRailway(() => {
  const Postgres = postgres("Postgres", { region: "iad" });
  Postgres.networking = { privateNetworkEndpoint: "postgres" };
  const clickhouseVolume = volume("clickhouse-volume", {
    alerts: { usage: { "100": {}, "80": {}, "95": {} } },
    allowOnlineResize: true,
    region: "iad",
    sizeMB: 500,
  });
  const postgresVolume = volume("postgres-volume", {
    alerts: { usage: { "100": {}, "80": {}, "95": {} } },
    allowOnlineResize: true,
    region: "iad",
    sizeMB: 500,
  });
  const worker = service("worker", {
    build: {
      buildEnvironment: "V3",
      builder: "DOCKERFILE",
      dockerfilePath: "deploy/railway/Dockerfile",
    },
    start: "node packages/worker/dist/scripts/startWorker.js",
    preDeploy: [],
    replicas: { iad: 1 },
  });
  const clickhouse = service("clickhouse", {
    source: image("clickhouse/clickhouse-server:24.12.6.70-alpine"),
    build: { buildEnvironment: "V3", builder: "RAILPACK" },
    replicas: { iad: 1 },
    volumeMounts: { "/var/lib/clickhouse": clickhouseVolume },
  });
  const api = service("api", {
    build: {
      buildEnvironment: "V3",
      builder: "DOCKERFILE",
      dockerfilePath: "deploy/railway/Dockerfile",
    },
    start: "node packages/api/dist/scripts/startServer.js",
    healthcheck: "/api",
    healthcheckTimeout: 120,
    preDeploy: "node packages/api/dist/scripts/bootstrap.js",
    replicas: { iad: 1 },
  });
  const temporal = service("temporal", {
    source: image("temporalio/auto-setup:1.22.4"),
    build: { buildEnvironment: "V3", builder: "RAILPACK" },
    replicas: { iad: 1 },
  });

  return project("dittofeed-demo", {
    variables: { managed: false },
    resources: [
      worker,
      Postgres,
      clickhouse,
      api,
      temporal,
      clickhouseVolume,
      postgresVolume,
    ],
  });
});
