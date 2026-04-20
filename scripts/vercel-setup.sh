#!/usr/bin/env bash
set -euo pipefail

DEMO_VAR_VALUE="${DEMO_VAR_VALUE:-demo_value}"
VERCEL_ARGS=()

if [[ -n "${VERCEL_TOKEN:-}" ]]; then
  VERCEL_ARGS+=(--token="$VERCEL_TOKEN")
fi

if ! command -v vercel >/dev/null 2>&1; then
  echo "Installing Vercel CLI..."
  npm i -g vercel
fi

if ! vercel whoami "${VERCEL_ARGS[@]}" >/dev/null 2>&1; then
  if [[ -n "${VERCEL_TOKEN:-}" ]]; then
    echo "Vercel token authentication failed. Check VERCEL_TOKEN and try again." >&2
    exit 1
  fi

  echo "Vercel login required..."
  vercel login
fi

echo "Linking Vercel project..."
vercel link --yes "${VERCEL_ARGS[@]}"

echo "Pulling Vercel environment variables into .env..."
vercel env pull .env --yes "${VERCEL_ARGS[@]}"

add_or_update_env() {
  local variable_name="$1"
  local environment="$2"
  local value="$3"

  echo "Setting ${variable_name} for ${environment}..."
  if echo "$value" | vercel env add "$variable_name" "$environment" --yes "${VERCEL_ARGS[@]}"; then
    return
  fi

  echo "${variable_name} already exists for ${environment}; updating it instead..."
  echo "$value" | vercel env update "$variable_name" "$environment" --yes "${VERCEL_ARGS[@]}"
}

add_or_update_env DEMO_VAR production "$DEMO_VAR_VALUE"
add_or_update_env DEMO_VAR preview "$DEMO_VAR_VALUE"
add_or_update_env DEMO_VAR development "$DEMO_VAR_VALUE"

echo "Vercel setup complete."
