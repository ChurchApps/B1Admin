#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ENV_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

AWS_REGION="${AWS_REGION:-us-east-1}"
API_REPO_PATH="${API_REPO_PATH:-../Api}"
PACKAGE_MANIFEST_FILE="${PACKAGE_MANIFEST_FILE:-}"
BACKEND_ARTIFACT_SOURCE_FILE="${BACKEND_ARTIFACT_SOURCE_FILE:-}"
MIGRATION_ARTIFACT_SOURCE_FILE="${MIGRATION_ARTIFACT_SOURCE_FILE:-}"
DEPENDENCIES_LAYER_SOURCE_FILE="${DEPENDENCIES_LAYER_SOURCE_FILE:-}"
PROJECT_NAME="${PROJECT_NAME:-b1admin}"
ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-staging}"
STACK_PREFIX="${STACK_PREFIX:-${PROJECT_NAME}-${ENVIRONMENT_NAME}}"
BOOTSTRAP_STACK_NAME="${BOOTSTRAP_STACK_NAME:-${STACK_PREFIX}-bootstrap}"
SYNC_APP_CONFIG_SECRET="${SYNC_APP_CONFIG_SECRET:-false}"
SYNC_BOOTSTRAP_ADMIN_SECRET="${SYNC_BOOTSTRAP_ADMIN_SECRET:-false}"
RUN_API_MIGRATIONS="${RUN_API_MIGRATIONS:-false}"
RUN_BOOTSTRAP_ADMIN="${RUN_BOOTSTRAP_ADMIN:-false}"
API_MIGRATION_ACTION="${API_MIGRATION_ACTION:-up}"
API_MIGRATION_MODULE="${API_MIGRATION_MODULE:-all}"
API_MIGRATION_RUNNER="${API_MIGRATION_RUNNER:-data-api}"
VERIFY_AFTER_DEPLOY="${VERIFY_AFTER_DEPLOY:-true}"
VERIFY_HTTP_AFTER_DEPLOY="${VERIFY_HTTP_AFTER_DEPLOY:-false}"
SAVE_OUTPUTS_AFTER_DEPLOY="${SAVE_OUTPUTS_AFTER_DEPLOY:-true}"
OUTPUTS_CAPTURE_DIR="${OUTPUTS_CAPTURE_DIR:-deployment/${ENVIRONMENT_NAME}}"
PREVIEW_ONLY="${PREVIEW_ONLY:-false}"
PACKAGE_MODE="${PACKAGE_MODE:-layered}"
PACKAGE_BUILD_LAYER="${PACKAGE_BUILD_LAYER:-}"

BOOTSTRAP_PARAMS="${ENV_DIR}/bootstrap-parameters.json"
BACKEND_PARAMS="${ENV_DIR}/backend-parameters.json"
FRONTEND_PARAMS="${ENV_DIR}/frontend-parameters.json"
APP_CONFIG_SECRET_FILE="${ENV_DIR}/app-config-secret.json"
APP_CONFIG_SECRET_TEMPLATE="${ENV_DIR}/app-config-secret.template.json"
BOOTSTRAP_ADMIN_SECRET_FILE="${ENV_DIR}/bootstrap-admin-secret.json"

require_file() {
  local file_path="$1"
  if [[ ! -f "${file_path}" ]]; then
    echo "Missing required file: ${file_path}" >&2
    exit 1
  fi
}

ensure_local_api_repo_readable() {
  local repo_path="$1"
  local package_json_path="${repo_path}/package.json"

  if [[ ! -e "${repo_path}" ]]; then
    echo "Local Api repo path does not exist: ${repo_path}" >&2
    echo "Set API_REPO_PATH to a readable checkout, or switch to PACKAGE_MANIFEST_FILE / BACKEND_ARTIFACT_SOURCE_FILE for this local run." >&2
    exit 1
  fi

  if [[ ! -r "${repo_path}" || ! -x "${repo_path}" ]]; then
    echo "Local Api repo path is not readable from this shell: ${repo_path}" >&2
    echo "Use PACKAGE_MANIFEST_FILE or BACKEND_ARTIFACT_SOURCE_FILE for local deploys, or use the GitHub Actions api-repo path if the runner can read the backend repo." >&2
    exit 1
  fi

  if [[ ! -f "${package_json_path}" ]]; then
    echo "Local Api repo package.json does not exist: ${package_json_path}" >&2
    echo "Set API_REPO_PATH to a valid Api checkout, or switch to PACKAGE_MANIFEST_FILE / BACKEND_ARTIFACT_SOURCE_FILE for this local run." >&2
    exit 1
  fi

  if [[ ! -r "${package_json_path}" ]]; then
    echo "Local Api repo package.json is not readable from this shell: ${package_json_path}" >&2
    echo "Use PACKAGE_MANIFEST_FILE or BACKEND_ARTIFACT_SOURCE_FILE for local deploys, or use the GitHub Actions api-repo path if the runner can read the backend repo." >&2
    exit 1
  fi
}

run_npm() {
  (
    cd "${ROOT_DIR}"
    npm run "$@"
  )
}

run_npm_without_post_deploy_flags() {
  (
    cd "${ROOT_DIR}"
    env -u RUN_API_MIGRATIONS \
      -u RUN_BOOTSTRAP_ADMIN \
      -u API_MIGRATION_ACTION \
      -u API_MIGRATION_MODULE \
      -u API_MIGRATION_RUNNER \
      npm run "$@"
  )
}

run_starter_audit() {
  if run_npm audit:environment-starter -- \
    --environment="${ENVIRONMENT_NAME}" \
    --only-blockers=true \
    --output=markdown; then
    return 0
  fi

  echo "" >&2
  echo "Starter audit failed for ${ENVIRONMENT_NAME}." >&2
  echo "Helpful next commands:" >&2
  echo "- yarn prepare:environment-starter -- --environment=${ENVIRONMENT_NAME} --account-id=<aws-account-id> --output=json" >&2
  echo "- yarn prepare:environment-starter -- --environment=${ENVIRONMENT_NAME} --account-id=<aws-account-id> --output=markdown" >&2
  echo "- yarn plan:environment-deploy -- --environment=${ENVIRONMENT_NAME} --output=markdown" >&2
  exit 1
}

run_deploy_plan() {
  local deployment_source="api-repo"
  local plan_args=(
    --environment="${ENVIRONMENT_NAME}"
    --region="${AWS_REGION}"
    --api-repo-path="${API_REPO_PATH}"
    --sync-app-config-secret="${SYNC_APP_CONFIG_SECRET}"
    --sync-bootstrap-admin-secret="${SYNC_BOOTSTRAP_ADMIN_SECRET}"
    --run-api-migrations="${RUN_API_MIGRATIONS}"
    --run-bootstrap-admin="${RUN_BOOTSTRAP_ADMIN}"
    --api-migration-action="${API_MIGRATION_ACTION}"
    --api-migration-module="${API_MIGRATION_MODULE}"
    --api-migration-runner="${API_MIGRATION_RUNNER}"
    --verify-http-after-deploy="${VERIFY_HTTP_AFTER_DEPLOY}"
    --output=markdown
  )

  if [[ -n "${PACKAGE_MANIFEST_FILE}" ]]; then
    deployment_source="package-manifest"
    plan_args+=(--package-manifest-file="${PACKAGE_MANIFEST_FILE}")
  elif [[ -n "${BACKEND_ARTIFACT_SOURCE_FILE}" ]]; then
    deployment_source="backend-artifact"
    plan_args+=(--backend-artifact-source-file="${BACKEND_ARTIFACT_SOURCE_FILE}")
    if [[ -n "${MIGRATION_ARTIFACT_SOURCE_FILE}" ]]; then
      plan_args+=(--migration-artifact-source-file="${MIGRATION_ARTIFACT_SOURCE_FILE}")
    fi
    if [[ -n "${DEPENDENCIES_LAYER_SOURCE_FILE}" ]]; then
      plan_args+=(--dependencies-layer-source-file="${DEPENDENCIES_LAYER_SOURCE_FILE}")
    fi
  fi

  plan_args+=(--deployment-source="${deployment_source}")

  if run_npm plan:environment-deploy -- "${plan_args[@]}"; then
    return 0
  fi

  echo "" >&2
  echo "Deploy plan failed for ${ENVIRONMENT_NAME}. Resolve the reported blockers before continuing." >&2
  exit 1
}

require_file "${BOOTSTRAP_PARAMS}"
require_file "${BACKEND_PARAMS}"
require_file "${FRONTEND_PARAMS}"
require_file "${APP_CONFIG_SECRET_TEMPLATE}"

echo "Auditing staging starter files..."
run_starter_audit

echo "Planning staging deployment readiness..."
run_deploy_plan

if [[ "${PREVIEW_ONLY}" == "true" ]]; then
  echo "Preview-only mode enabled; stopping after starter audit and deploy plan."
  echo "Next live command: ./infrastructure/environments/${ENVIRONMENT_NAME}/deploy-split-stack.sh"
  exit 0
fi

echo "Validating bootstrap parameters..."
run_npm_without_post_deploy_flags validate:aws-deploy -- \
  --mode=bootstrap \
  --region="${AWS_REGION}" \
  --stack-name="${BOOTSTRAP_STACK_NAME}" \
  --parameters-file="${BOOTSTRAP_PARAMS}"

echo "Deploying bootstrap stack..."
run_npm_without_post_deploy_flags deploy:bootstrap -- \
  --region="${AWS_REGION}" \
  --stack-name="${BOOTSTRAP_STACK_NAME}" \
  --parameters-file="${BOOTSTRAP_PARAMS}"

echo "Validating split-stack parameters..."
VALIDATE_ARGS=(
  --mode=split-stack
  --region="${AWS_REGION}"
  --backend-parameters-file="${BACKEND_PARAMS}"
  --frontend-parameters-file="${FRONTEND_PARAMS}"
)

DEPLOY_ARGS=(
  --region="${AWS_REGION}"
  --project-name="${PROJECT_NAME}"
  --environment="${ENVIRONMENT_NAME}"
  --bootstrap-stack-name="${BOOTSTRAP_STACK_NAME}"
  --backend-parameters-file="${BACKEND_PARAMS}"
  --frontend-parameters-file="${FRONTEND_PARAMS}"
  --package-mode="${PACKAGE_MODE}"
)

if [[ -n "${PACKAGE_BUILD_LAYER}" ]]; then
  DEPLOY_ARGS+=(--package-build-layer="${PACKAGE_BUILD_LAYER}")
fi

if [[ -n "${PACKAGE_MANIFEST_FILE}" ]]; then
  require_file "${PACKAGE_MANIFEST_FILE}"
  VALIDATE_ARGS+=(--package-manifest-file="${PACKAGE_MANIFEST_FILE}")
  DEPLOY_ARGS+=(--package-manifest-file="${PACKAGE_MANIFEST_FILE}")
elif [[ -n "${BACKEND_ARTIFACT_SOURCE_FILE}" ]]; then
  require_file "${BACKEND_ARTIFACT_SOURCE_FILE}"
  VALIDATE_ARGS+=(--backend-artifact-source-file="${BACKEND_ARTIFACT_SOURCE_FILE}")
  DEPLOY_ARGS+=(--backend-artifact-source-file="${BACKEND_ARTIFACT_SOURCE_FILE}")

  if [[ -n "${MIGRATION_ARTIFACT_SOURCE_FILE}" ]]; then
    require_file "${MIGRATION_ARTIFACT_SOURCE_FILE}"
    VALIDATE_ARGS+=(--migration-artifact-source-file="${MIGRATION_ARTIFACT_SOURCE_FILE}")
    DEPLOY_ARGS+=(--migration-artifact-source-file="${MIGRATION_ARTIFACT_SOURCE_FILE}")
  fi

  if [[ -n "${DEPENDENCIES_LAYER_SOURCE_FILE}" ]]; then
    require_file "${DEPENDENCIES_LAYER_SOURCE_FILE}"
    VALIDATE_ARGS+=(--dependencies-layer-source-file="${DEPENDENCIES_LAYER_SOURCE_FILE}")
    DEPLOY_ARGS+=(--dependencies-layer-source-file="${DEPENDENCIES_LAYER_SOURCE_FILE}")
  fi
else
  ensure_local_api_repo_readable "${API_REPO_PATH}"
  VALIDATE_ARGS+=(--api-repo-path="${API_REPO_PATH}")
  DEPLOY_ARGS+=(--api-repo-path="${API_REPO_PATH}")
fi

run_npm validate:aws-deploy -- "${VALIDATE_ARGS[@]}"

if [[ "${SYNC_APP_CONFIG_SECRET}" == "true" ]]; then
  require_file "${APP_CONFIG_SECRET_FILE}"
  if rg -n "replace-me" "${APP_CONFIG_SECRET_FILE}" >/dev/null 2>&1; then
    echo "Found replace-me placeholders in ${APP_CONFIG_SECRET_FILE}. Update them before syncing the app config secret." >&2
    rg -n "replace-me" "${APP_CONFIG_SECRET_FILE}" >&2
    exit 1
  fi
fi

if [[ "${SYNC_APP_CONFIG_SECRET}" == "true" ]]; then
  DEPLOY_ARGS+=(--app-config-secret-file="${APP_CONFIG_SECRET_FILE}")
fi

if [[ "${SYNC_BOOTSTRAP_ADMIN_SECRET}" == "true" ]]; then
  require_file "${BOOTSTRAP_ADMIN_SECRET_FILE}"
  if rg -n '"(ChangeMe123!|admin@example.com|examplechurch)"' "${BOOTSTRAP_ADMIN_SECRET_FILE}" >/dev/null 2>&1; then
    echo "Found sample bootstrap-admin values in ${BOOTSTRAP_ADMIN_SECRET_FILE}. Update them before enabling bootstrap admin sync." >&2
    rg -n '"(ChangeMe123!|admin@example.com|examplechurch)"' "${BOOTSTRAP_ADMIN_SECRET_FILE}" >&2
    exit 1
  fi
  DEPLOY_ARGS+=(--bootstrap-admin-secret-file="${BOOTSTRAP_ADMIN_SECRET_FILE}")
fi

if [[ "${RUN_API_MIGRATIONS}" == "true" ]]; then
  VALIDATE_ARGS+=(--api-migration-runner="${API_MIGRATION_RUNNER}")
  DEPLOY_ARGS+=(
    --run-api-migrations=true
    --api-migration-action="${API_MIGRATION_ACTION}"
    --api-migration-module="${API_MIGRATION_MODULE}"
    --api-migration-runner="${API_MIGRATION_RUNNER}"
  )
fi

if [[ "${RUN_BOOTSTRAP_ADMIN}" == "true" ]]; then
  DEPLOY_ARGS+=(--run-bootstrap-admin=true)
fi

echo "Deploying split-stack staging environment..."
run_npm deploy:aws -- "${DEPLOY_ARGS[@]}"

if [[ "${SAVE_OUTPUTS_AFTER_DEPLOY}" == "true" ]]; then
  echo "Saving split-stack staging outputs..."
  run_npm save:split-stack-outputs -- \
    --environment="${ENVIRONMENT_NAME}" \
    --region="${AWS_REGION}" \
    --output-dir="${OUTPUTS_CAPTURE_DIR}"
fi

if [[ "${VERIFY_AFTER_DEPLOY}" == "true" ]]; then
  echo "Verifying split-stack staging environment..."
  VERIFY_ARGS=(
    --region="${AWS_REGION}"
    --backend-stack-name="${STACK_PREFIX}-backend"
    --frontend-stack-name="${STACK_PREFIX}-frontend"
  )

  if [[ "${VERIFY_HTTP_AFTER_DEPLOY}" == "true" ]]; then
    VERIFY_ARGS+=(--check-http=true)
  fi

  run_npm verify:split-stack -- "${VERIFY_ARGS[@]}"
fi
