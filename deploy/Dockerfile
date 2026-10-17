FROM python:3.12-slim-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends curl unzip nginx ca-certificates libglib2.0-0 libgl1 libgomp1 procps && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:0.9.29 /uv /usr/local/bin/uv
RUN curl -fsSL https://bun.com/install | bash -s 'bun-v1.4.2' && ln -s /root/.bun/bin/bun /usr/local/bin/bun
WORKDIR /opt/sportsbuilder
