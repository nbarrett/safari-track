#!/bin/bash
# Kill Safari Track development processes

echo "Stopping Safari Track development server..."

# Kill Next.js dev processes
pkill -f "next dev" 2>/dev/null
pkill -f "next-server" 2>/dev/null

# Kill any process on the dev port (default 3003)
DEV_PORT="${DEV_PORT:-3003}"
lsof -ti:"$DEV_PORT" 2>/dev/null | xargs kill -9 2>/dev/null

echo "All development processes stopped"
echo ""
echo "Tip: You can restart with ./run-dev.sh"
