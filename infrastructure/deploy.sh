#!/usr/bin/env bash


set -euo pipefail


# configuration
REPO_DIR="/home/ubuntu/apps/2025-RoboSim"
ENV_FILE="infrastructure/.env"
COMPOSE_FILES=(-f infrastructure/docker-compose.yml -f infrastructure/docker-compose.prod.yml)

# fixed branch
DEPLOY_BRANCH="dev"

# added tag by Action
APP_TAG="${APP_TAG:-}"
if [[ -z "${APP_TAG}" ]]; then
  echo "ERROR: APP_TAG is required. Example:"
  echo "  APP_TAG=sha-31b2eea bash infrastructure/deploy.sh"
  exit 1
fi

echo "==> Deploy start: branch=${DEPLOY_BRANCH}, APP_TAG=${APP_TAG}"

cd "${REPO_DIR}"

# check branch correct
echo "==> Ensure git branch ${DEPLOY_BRANCH}"
git fetch --all --prune
git checkout "${DEPLOY_BRANCH}" || git checkout -b "${DEPLOY_BRANCH}" "origin/${DEPLOY_BRANCH}"
git pull

# check env file
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ERROR: env file not found: ${ENV_FILE}"
  exit 1
fi

# pull app image by tag
echo "==> Pull app image"
APP_TAG="${APP_TAG}" docker compose --env-file "${ENV_FILE}" "${COMPOSE_FILES[@]}" pull app

# rebuild container
echo "==> Recreate app container (no build)"
APP_TAG="${APP_TAG}" docker compose --env-file "${ENV_FILE}" "${COMPOSE_FILES[@]}" up -d --no-build --force-recreate app

# run flyway migration BEFORE starting new app
echo "==> Run Flyway migration"
if ! docker compose --env-file "${ENV_FILE}" "${COMPOSE_FILES[@]}" run --rm flyway; then
  echo "ERROR: Flyway migration failed"
  exit 1
fi

# check tag
echo "==> Verify running image"
RUNNING_IMAGE="$(docker inspect -f '{{.Config.Image}}' robosim-app)"
echo "    Running image: ${RUNNING_IMAGE}"

EXPECTED="ghcr.io/spe-uob/2025-robosim/robosim-app:${APP_TAG}"
if [[ "${RUNNING_IMAGE}" != "${EXPECTED}" ]]; then
  echo "ERROR: image mismatch!"
  echo "  Expected: ${EXPECTED}"
  echo "  Got:      ${RUNNING_IMAGE}"
  echo "  Recent logs:"
  docker compose --env-file "${ENV_FILE}" "${COMPOSE_FILES[@]}" logs --tail=200 app
  exit 1
fi
# wait for server
echo "==> Wait for app to be ready on 127.0.0.1:3000"

for i in {1..15}; do
  # check tcp connection
  if timeout 2 bash -c 'cat < /dev/null > /dev/tcp/127.0.0.1/3000' 2>/dev/null; then
    # check http connection
    if curl -fsS --max-time 2 http://127.0.0.1:3000/ >/dev/null 2>&1; then
      echo "==> App ready"
      READY=1
      break
    fi
  fi

  echo "   not ready yet (${i}/15), retry..."
  sleep 2
done

# if not works for 30s, out put error log
if [[ "${READY:-0}" != "1" ]]; then
  echo "ERROR: app not ready after retries. Recent logs:"
  docker compose --env-file "${ENV_FILE}" "${COMPOSE_FILES[@]}" logs --tail=200 app
  exit 1
fi

