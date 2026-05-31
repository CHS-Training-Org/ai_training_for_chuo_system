#!/usr/bin/env bash
# Claude Code statusLine - dashboard style

input=$(cat)

# --- ANSI ---
reset="\033[0m"
dim="\033[2m"
bright_white="\033[97m"
bright_yellow="\033[93m"
bright_green="\033[92m"
cyan="\033[36m"
green="\033[32m"
yellow="\033[33m"
magenta="\033[35m"
red="\033[31m"
gray="\033[90m"

# --- Extract fields ---
cwd=$(echo "$input"          | jq -r '.cwd // empty')
model_name=$(echo "$input"   | jq -r '.model.display_name // empty')
used_pct=$(echo "$input"     | jq -r '.context_window.used_percentage // empty')
tokens_used=$(echo "$input"  | jq -r '.context_window.tokens_used // empty')
tokens_total=$(echo "$input" | jq -r '.context_window.tokens_total // empty')
effort=$(echo "$input"       | jq -r '.session.effort // empty')
cache_pct=$(echo "$input"    | jq -r '.session.cache_read_percentage // empty')
five_pct=$(echo "$input"     | jq -r '.rate_limits.five_hour.used_percentage // empty')
five_reset=$(echo "$input"   | jq -r '.rate_limits.five_hour.reset_at // empty')
week_pct=$(echo "$input"     | jq -r '.rate_limits.seven_day.used_percentage // empty')
week_reset=$(echo "$input"   | jq -r '.rate_limits.seven_day.reset_at // empty')

# --- Git branch ---
branch=""
if [ -n "$cwd" ] && git -C "$cwd" rev-parse --git-dir > /dev/null 2>&1; then
  branch=$(git -C "$cwd" -c gc.auto=0 -c core.hooksPath=/dev/null \
    symbolic-ref --short HEAD 2>/dev/null \
    || git -C "$cwd" rev-parse --short HEAD 2>/dev/null)
fi

# --- Format token count (1234567 → 1.2M / 32000 → 32k) ---
fmt_k() {
  local n=$1
  [ -z "$n" ] && return
  if [ "$n" -ge 1000000 ]; then
    printf "%.1fM" "$(awk "BEGIN{printf \"%.1f\", $n/1000000}")"
  elif [ "$n" -ge 1000 ]; then
    echo "$(( n / 1000 ))k"
  else
    echo "$n"
  fi
}

# --- Format reset timestamp → MM/DD ---
fmt_date() {
  local ts=$1
  [ -z "$ts" ] && return
  date -d "$ts" "+%m/%d" 2>/dev/null
}

# --- Progress bar ---
make_bar() {
  local pct=$1 width=${2:-20}
  local filled=$(( pct * width / 100 ))
  [ "$filled" -gt "$width" ] && filled=$width
  local empty=$(( width - filled ))
  local bar="" i
  for ((i=0; i<filled; i++)); do bar+="█"; done
  for ((i=0; i<empty; i++)); do bar+="░"; done
  echo "$bar"
}

# --- Color by threshold ---
pct_color() {
  local pct=$1
  if   [ "$pct" -ge 80 ]; then echo "$red"
  elif [ "$pct" -ge 50 ]; then echo "$yellow"
  else                          echo "$bright_green"
  fi
}

# --- Section header: "LABEL ─────────────────────" ---
section_header() {
  local label=$1
  local total_width=54
  local line_width=$(( total_width - ${#label} - 1 ))
  local line=""
  for ((i=0; i<line_width; i++)); do line+="─"; done
  printf "%b\n" "${dim}${label}${reset} ${gray}${line}${reset}"
}

# ── MODEL ────────────────────────────────────────────────
section_header "MODEL"

model_line=""
[ -n "$model_name" ] && model_line+="${bright_white}${model_name}${reset}"
[ -n "$branch"     ] && model_line+="  ${magenta}${branch}${reset}"

if [ -n "$tokens_used" ] && [ -n "$tokens_total" ]; then
  model_line+="  ${dim}tokens:${reset} ${cyan}$(fmt_k "$tokens_used")/$(fmt_k "$tokens_total")${reset}"
fi

[ -n "$effort" ] && model_line+="  ${dim}effort:${reset} ${cyan}${effort}${reset}"

printf "%b\n" "$model_line"

# ── USAGE ─────────────────────────────────────────────────
section_header "USAGE"

if [ -n "$used_pct" ]; then
  pct_int=$(printf "%.0f" "$used_pct")
  remain=$(( 100 - pct_int ))
  color=$(pct_color "$pct_int")
  bar=$(make_bar "$pct_int" 20)

  usage_line="${color}${bar}${reset}"
  usage_line+="  ${bright_yellow}${pct_int}%${reset} ${dim}used${reset}"
  usage_line+="  ${gray}│${reset}  ${bright_yellow}${remain}%${reset} ${dim}remain${reset}"

  if [ -n "$cache_pct" ]; then
    c_int=$(printf "%.0f" "$cache_pct")
    usage_line+="  ${dim}cache:${reset} ${bright_yellow}${c_int}%${reset}"
  fi

  printf "%b\n" "$usage_line"
fi

# ── LIMITS ────────────────────────────────────────────────
section_header "LIMITS"

limits_line=""

if [ -n "$five_pct" ]; then
  pct_int=$(printf "%.0f" "$five_pct")
  color=$(pct_color "$pct_int")
  bar=$(make_bar "$pct_int" 6)
  date_str=$(fmt_date "$five_reset")
  limits_line+="${dim}5h:${reset} ${color}${bar}${reset} ${bright_yellow}${pct_int}%${reset}"
  [ -n "$date_str" ] && limits_line+=" ${gray}@${date_str}${reset}"
fi

if [ -n "$week_pct" ]; then
  pct_int=$(printf "%.0f" "$week_pct")
  color=$(pct_color "$pct_int")
  bar=$(make_bar "$pct_int" 6)
  date_str=$(fmt_date "$week_reset")
  [ -n "$limits_line" ] && limits_line+="  ${gray}│${reset}  "
  limits_line+="${dim}7d:${reset} ${color}${bar}${reset} ${bright_yellow}${pct_int}%${reset}"
  [ -n "$date_str" ] && limits_line+=" ${gray}@${date_str}${reset}"
fi

[ -n "$limits_line" ] && printf "%b\n" "$limits_line"
