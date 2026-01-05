FROM node:22-slim as build
WORKDIR opt/api

RUN apt-get update && apt-get install -y \
    python3 make g++ openssl libssl-dev \
    && rm -rf /var/lib/apt/lists/*

COPY package.json nest-cli.json ./
RUN npm install

COPY ./src  ./src
COPY ./prisma ./prisma
RUN npx prisma generate --schema prisma/schema
COPY tsconfig.json ./

RUN npm run build

FROM node:22-slim
WORKDIR /opt/api

RUN apt-get update && apt-get install -y \
    openssl \
    curl \
    libexpat1 libpng16-16 libjpeg62-turbo fontconfig \
    && rm -rf /var/lib/apt/lists/*

RUN chown -R node:node /opt/api

COPY --chown=node:node prisma ./prisma
COPY --chown=node:node package.json ./

RUN --mount=type=cache,target=/home/node/.npm \
    npm install --only=prod

USER node

COPY --chown=node:node fonts ./fonts
COPY --chown=node:node init-db ./init-db
COPY --chown=node:node assets ./assets
COPY --chown=node:node --from=build /opt/api/node_modules ./node_modules
COPY --chown=node:node --from=build /opt/api/dist ./dist
