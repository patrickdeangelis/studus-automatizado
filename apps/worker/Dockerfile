FROM oven/bun:1
WORKDIR /app

# Install system dependencies for Playwright and Native Modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

# Copy root package.json only
COPY package.json ./

# Copy packages
COPY packages ./packages
COPY apps/worker ./apps/worker

# Install dependencies
RUN bun install

# Install Playwright browsers
WORKDIR /app/apps/worker
RUN bunx playwright install chromium --with-deps

CMD ["bun", "run", "dev"]
