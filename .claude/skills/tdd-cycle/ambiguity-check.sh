#!/usr/bin/env bash
# Ambiguity detection helper for TDD cycle
# Outputs JSON with ambiguity_detected flag

check_ambiguity() {
    local context="$1"
    local confidence="${2:-0.5}"

    # Ambiguity indicators
    local indicators=0

    # Check for question marks (uncertainty)
    if echo "$context" | grep -q "?"; then
        ((indicators++))
    fi

    # Check for "or" alternatives
    if echo "$context" | grep -qi "\bor\b"; then
        ((indicators++))
    fi

    # Check for missing required info patterns
    if echo "$context" | grep -qiE "(missing|unclear|unknown|undefined|TBD)"; then
        ((indicators++))
    fi

    # Check for multiple options pattern
    if echo "$context" | grep -qiE "(option|choice|alternative|either)"; then
        ((indicators++))
    fi

    # Calculate if ambiguity detected (threshold: 2+ indicators or low confidence)
    local ambiguous="false"
    if [[ $indicators -ge 2 ]] || (( $(echo "$confidence < 0.5" | bc -l) )); then
        ambiguous="true"
    fi

    # Output JSON
    cat <<EOF
{
  "ambiguity_detected": $ambiguous,
  "indicators_found": $indicators,
  "confidence": $confidence,
  "recommendation": $(if [[ "$ambiguous" == "true" ]]; then echo '"ask_user"'; else echo '"proceed"'; fi)
}
EOF
}

# If run directly with arguments
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    check_ambiguity "$1" "${2:-0.5}"
fi
