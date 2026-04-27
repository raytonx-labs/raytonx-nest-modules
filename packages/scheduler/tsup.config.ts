import baseConfig from "../../tsup.config";

export default {
  ...baseConfig,
  external: ["@nestjs/common", "@nestjs/schedule", "@raytonx/core", "@raytonx/nest-redis"],
};
