FROM node:24-alpine

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY lib/db/package.json ./lib/db/
COPY lib/api-spec/package.json ./lib/api-spec/ 2>/dev/null || true
COPY lib/api-zod/package.json ./lib/api-zod/ 2>/dev/null || true
COPY lib/api-client-react/package.json ./lib/api-client-react/ 2>/dev/null || true
COPY lib/integrations-openai-ai-server/package.json ./lib/integrations-openai-ai-server/ 2>/dev/null || true
COPY lib/integrations-openai-ai-react/package.json ./lib/integrations-openai-ai-react/ 2>/dev/null || true
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/lex-superior/package.json ./artifacts/lex-superior/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy full source
COPY . .

# Build frontend → artifacts/lex-superior/dist/public
RUN pnpm --filter @workspace/lex-superior run build

# Build API → artifacts/api-server/dist/index.mjs
RUN pnpm --filter @workspace/api-server run build

# Place frontend inside API's dist so it can be served as static files
RUN mkdir -p artifacts/api-server/dist/public && \
    cp -r artifacts/lex-superior/dist/public/. artifacts/api-server/dist/public/

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["sh", "start.sh"]
