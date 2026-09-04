FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Build frontend and compile backend into dist/
RUN npm run build

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start compiled Express & Telegram bot service
CMD ["node", "dist/server.cjs"]
