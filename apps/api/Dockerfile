FROM oven/bun:1
WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy root package.json only (Force fresh lockfile resolution)
COPY package.json ./

# Copy packages
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies
RUN bun install

# Set working directory to api
WORKDIR /app/apps/api

CMD ["bun", "run", "dev"]
