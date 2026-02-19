#!/bin/bash
# Kill Safari Track development processes by port only

DEV_PORT="${DEV_PORT:-3003}"
lsof -ti:"$DEV_PORT" 2>/dev/null | xargs kill -9 2>/dev/null || true

echo "All Safari Track development processes stopped"
echo ""
echo "Tip: You can restart with ./run-dev.sh"
