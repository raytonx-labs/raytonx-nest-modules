import baseConfig from "../../tsup.config";

export default {
  ...baseConfig,
  external: ["@nestjs/common", "@raytonx/core"]
};

