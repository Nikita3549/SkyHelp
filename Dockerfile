FROM node:22-slim as build
WORKDIR opt/api
RUN apt-get update -y && apt-get install -y openssl libssl-dev
COPY package.json nest-cli.json ./
RUN npm install
COPY ./src  ./src
COPY ./prisma ./prisma
RUN npx prisma generate --schema prisma/schema
COPY tsconfig.json ./
RUN npm run build

FROM node:22-slim
WORKDIR opt/api
RUN apt-get update -y && apt-get install -y openssl libssl-dev
COPY package.json ./
COPY prisma ./prisma
COPY fonts ./fonts
COPY assets ./assets
RUN npm install --only=prod
COPY --from=build /opt/api/dist ./dist