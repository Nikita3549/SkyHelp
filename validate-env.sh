#!/bin/bash

missing_vars=0

while IFS= read -r line || [ -n "$line" ]; do
  [[ -z "$line" || "$line" =~ ^# ]] && continue
  var_name=$(echo "$line" | cut -d '=' -f 1)

  if ! grep -q "^$var_name=" .env; then
    echo "❌ Missing variable: $var_name"
    missing_vars=1
  else
    val=$(grep "^$var_name=" .env | head -n1 | cut -d '=' -f2-)
    if [ -z "$val" ]; then
      echo "❌ Variable $var_name is empty"
      missing_vars=1
    fi
  fi
done < .env.example

if [ $missing_vars -ne 0 ]; then
  echo "❌ .env validation failed"
  exit 1
else
  echo "✅ .env validation passed"
fi
