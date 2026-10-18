FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable && yarn postinstall
COPY . .
# Self-host image: served under /admin, every URL derived from the browser origin at runtime.
ENV REACT_APP_STAGE=selfhost VITE_BASE_PATH=/admin/
RUN yarn build

FROM node:22-slim
RUN npm install -g serve@14.2.6
WORKDIR /app
COPY --from=build /app/dist ./dist
EXPOSE 3101
HEALTHCHECK --interval=10s --timeout=5s --retries=6 \
  CMD node -e "fetch('http://127.0.0.1:3101/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["serve", "-s", "dist", "-l", "3101"]
