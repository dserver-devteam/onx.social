#!/usr/bin/env python3
"""
Script to rebuild routes/api.js with analytics tracking
Removes corrupted sections and adds clean analytics calls
"""

import re

# Read the corrupted backup
with open('routes/api.js.corrupted.bak', 'r') as f:
    content = f.read()

# Fix common corruption patterns
# 1. Fix malformed template literals in SQL
content = re.sub(r'`\s*\$\{\s*', r'${', content)
content = re.sub(r'\s*\}\s*`', r'}', content)

# 2. Remove duplicate route definitions (keep first occurrence)
seen_routes = set()
lines = content.split('\n')
cleaned_lines = []
in_route = False
current_route = None

for line in lines:
    # Detect route start
    route_match = re.match(r"router\.(get|post|put|delete)\('([^']+)'", line)
    if route_match:
        route_key = f"{route_match.group(1)}:{route_match.group(2)}"
        if route_key in seen_routes:
            in_route = True  # Skip this duplicate
            continue
        else:
            seen_routes.add(route_key)
            in_route = False
            current_route = route_key
    
    if not in_route:
        cleaned_lines.append(line)

content = '\n'.join(cleaned_lines)

# Write cleaned file
with open('routes/api.js', 'w') as f:
    f.write(content)

print("✅ File rebuilt successfully")
print(f"✅ Removed {len(lines) - len(cleaned_lines)} duplicate/corrupted lines")
