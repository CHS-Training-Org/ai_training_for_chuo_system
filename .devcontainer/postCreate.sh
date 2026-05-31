#!/usr/bin/env bash
set -euo pipefail

echo "::: [1/2] frontend: pnpm install :::"
cd /workspace/frontend
pnpm install

echo "::: [2/2] backend: gradle dependencies :::"
cd /workspace/backend
./gradlew dependencies -q
