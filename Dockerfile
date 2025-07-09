FROM node:22-alpine as build
WORKDIR opt/api
COPY package.json nest-cli.json ./
RUN npm install
COPY ./src ./prisma ./
RUN npx prisma generate
COPY tsconfig.json ./
RUN npm run build

FROM node:22-alpine
WORKDIR opt/api
COPY package.json ./
COPY prisma ./
COPY translations ./translations
COPY letters ./letters
COPY fonts ./fonts
COPY assets ./assets
RUN npm install --only=prod
COPY --from=build /opt/api/dist ./dist