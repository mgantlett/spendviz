# Dockerfile for Spendviz production
FROM node:22-slim

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Clean up previous installations and caches
RUN rm -rf node_modules && rm -f package-lock.json

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install && npm rebuild && npm cache clean --force;

# Copy app source
COPY . .

# Build CSS and frontend
RUN npm run build:css && npm run build

# Expose port (default Vite preview or custom server port)
EXPOSE 5173

# Start the server (adjust if you use a custom server script)
CMD ["npm", "run", "backend"]
