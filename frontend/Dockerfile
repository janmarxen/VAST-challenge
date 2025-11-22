# Production multi-stage Dockerfile for React + Tailwind (Create React App)

### Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Install dependencies (including devDependencies so PostCSS/Tailwind runs)
COPY package*.json ./
# No package-lock.json present in repo; use `npm install` so dependencies are installed
# including devDependencies (required for PostCSS/Tailwind during the build).
RUN npm install

# Copy source and build
COPY . .

# Build the app (CRA will run PostCSS which processes Tailwind)
RUN npm run build

### Production stage (serve static files with nginx)
FROM nginx:stable-alpine AS runner

# Copy built static files from build stage
COPY --from=build /app/build /usr/share/nginx/html
# Copy custom nginx config to enable API proxying and SPA fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose default HTTP port
EXPOSE 80

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]

# Notes:
# - This builds the app using `npm run build`, which will process Tailwind via PostCSS
#   because `postcss.config.js` and `tailwind.config.js` are present in the repo.
# - If you need a development container (hot-reload), use a different Dockerfile that
#   runs `npm start` and exposes port 3000.
