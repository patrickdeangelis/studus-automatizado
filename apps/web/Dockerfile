FROM oven/bun:1
WORKDIR /app

# Copy root package.json and lockfile
COPY package.json bun.lock ./

# Copy packages
COPY packages ./packages
COPY apps/web ./apps/web

# Install dependencies
RUN bun install

WORKDIR /app/apps/web

CMD ["bun", "run", "dev", "--host"]
