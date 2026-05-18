# syntax=docker/dockerfile:1

ARG NODE_VERSION=20.18.0

FROM node:${NODE_VERSION}-alpine as base
WORKDIR /usr/src/app

#######################################
# Install production dependencies only
#######################################
FROM base as deps

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

#######################################
# Build Stage (frontend + backend)
#######################################
FROM deps as build

# copy the dependency list (make sure npm ci can see the lock file).
COPY package.json package-lock.json ./

# Install dev dependencies (needed for TypeScript build)
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

# Builds BOTH:
#  - Backend → build/server
#  - Frontend (Vite) → build/client
RUN npm run setup && npm run build

#######################################
# Final Image
#######################################
FROM base as final
ENV NODE_ENV=production

USER node

COPY package.json .
COPY --from=deps /usr/src/app/node_modules ./node_modules

# copy backend & frontend build output
COPY --from=build /usr/src/app/build ./build

# copy scenarios folder (moved to tests folder)
COPY --from=build /usr/src/app/tests/scenarios ./scenarios

USER root
RUN chown -R node:node /usr/src/app \
 && chmod -R u+wrx /usr/src/app/build
USER node

EXPOSE 3000
EXPOSE 7071

CMD ["npm", "start"]
