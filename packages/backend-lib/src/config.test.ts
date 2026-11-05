describe("ClickHouse endpoint configuration", () => {
  const originalEnv = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://test:test@localhost/test",
      CLICKHOUSE_USER: "test",
      CLICKHOUSE_PASSWORD: "test",
    };
  });
  afterEach(() => {
    process.env = originalEnv;
  });

  it.each([
    ["http://clickhouse.internal", "http://clickhouse.internal:8123/"],
    ["https://clickhouse.example.com", "https://clickhouse.example.com/"],
    [
      "https://clickhouse.example.com:8443",
      "https://clickhouse.example.com:8443/",
    ],
  ])("uses the correct port for %s", async (input, expected) => {
    process.env.CLICKHOUSE_HOST = input;
    const { default: config } = await import("./config");
    expect(config().clickhouseHost).toBe(expected);
  });
});
