# Stage 1: install dependencies
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
ARG NODE_ENV
ENV NODE_ENV $NODE_ENV
RUN npm install

# Stage 2: build
FROM node:18-alpine AS builder
WORKDIR /app

# These NEXT_PUBLIC_* vars get inlined by Next.js at build time
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG DATABASE_URL

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV DATABASE_URL=$DATABASE_URL

COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY public ./public
COPY migrations ./migrations
COPY package.json next.config.mjs tsconfig.json drizzle.config.ts ./
COPY tailwind.config.js tailwind.config.ts postcss.config.js components.json ./
RUN npm run build

# Stage 3: run
FROM node:18-alpine
WORKDIR /app

# Set environment variables for production
ENV NODE_ENV production

# Copy the production build from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Include the necessary config files for runtime
COPY --from=builder /app/next.config.mjs ./  
COPY --from=builder /app/drizzle.config.ts ./  
COPY --from=builder /app/migrations ./migrations

# Expose port 3000 for the Next.js app
EXPOSE 3000

# Start the Next.js application
CMD ["npm", "run", "start"]
