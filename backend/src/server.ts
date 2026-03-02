import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./db/prisma";
import { app } from "./app";

const start = async (): Promise<void> => {
  try {
    await prisma.$connect();
    app.listen(env.PORT, () => {
      logger.info({ port: env.PORT }, "Backend server started.");
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to start backend server.");
    process.exit(1);
  }
};

void start();
