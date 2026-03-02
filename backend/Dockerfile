FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm run prisma:generate

COPY tsconfig.json jest.config.cjs eslint.config.mjs .prettierrc ./
COPY src ./src
COPY tests ./tests
COPY scripts ./scripts

RUN chmod +x ./scripts/init.sh

EXPOSE 4000

CMD ["sh", "./scripts/init.sh"]
