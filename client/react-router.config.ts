import type { Config } from "@react-router/dev/config";

export default {
  appDirectory: "src",
  async prerender() {
    return ["/", "/dashboard", "/reserve", "/people"]
  }
} satisfies Config;