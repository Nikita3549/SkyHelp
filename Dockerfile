FROM node:22-slim as build
WORKDIR opt/api
RUN apt-get update -y && apt-get install -y openssl libssl-dev
COPY package.json nest-cli.json ./
RUN npm install
COPY ./src ./prisma ./
RUN npx prisma generate
COPY tsconfig.json ./
RUN npm run build

FROM node:22-slim
WORKDIR opt/api
RUN apt-get update -y && apt-get install -y openssl libssl-dev
COPY package.json ./
COPY prisma ./
COPY translations ./translations
COPY letters ./letters
COPY fonts ./fonts
COPY assets ./assets
RUN npm install --only=prod
COPY --from=build /opt/api/dist ./dist