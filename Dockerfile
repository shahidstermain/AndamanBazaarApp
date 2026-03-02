# Stage 1: Build the application
FROM node:22-alpine AS build
WORKDIR /app

# Accept build-time env vars for Vite
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_GOOGLE_AI_API_KEY

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]