FROM node:22-alpine

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /workspace/deal-radar/apps/web

COPY . /workspace/deal-radar

RUN if [ -f package-lock.json ]; then npm ci; elif [ -f package.json ]; then npm install; else echo "Missing deal-radar/apps/web/package.json" && exit 1; fi

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]
