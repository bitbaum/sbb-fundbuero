#!/bin/bash

# Development startup script for SBB Fundbüro
# Starts all services needed for local development

set -e

echo "🚂 SBB Fundbüro - Development Environment"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

# Parse command line arguments
COMMAND=${1:-"start"}

case $COMMAND in
    start)
        echo -e "${GREEN}Starting all services...${NC}"

        # Start database services first
        echo "📦 Starting PostgreSQL and Redis..."
        docker-compose up -d postgres redis

        # Wait for databases to be healthy
        echo "⏳ Waiting for databases to be ready..."
        sleep 5

        # Start backend services
        echo "🔧 Starting backend services..."
        docker-compose up -d reporting-service notification-service matching-service api-gateway

        # Wait for backend to be ready
        sleep 3

        echo ""
        echo -e "${GREEN}✅ Backend services started!${NC}"
        echo ""
        echo "Services running on:"
        echo "  - API Gateway:     http://localhost:3000"
        echo "  - Reporting:       http://localhost:3001"
        echo "  - Matching:        http://localhost:3002"
        echo "  - Notifications:   http://localhost:3003"
        echo "  - PostgreSQL:      localhost:5433"
        echo "  - Redis:           localhost:6380"
        echo ""
        echo -e "${YELLOW}To start the frontend, run:${NC}"
        echo "  cd frontend && pnpm run dev"
        echo ""
        echo "Or start everything including frontend:"
        echo "  ./scripts/dev.sh frontend"
        ;;

    frontend)
        echo -e "${GREEN}Starting all services including frontend...${NC}"
        docker-compose up -d

        echo ""
        echo -e "${GREEN}✅ All services started!${NC}"
        echo ""
        echo "Open in browser:"
        echo "  - Frontend (Passenger): http://localhost:3004"
        echo "  - Frontend (Driver):    http://localhost:3004/driver"
        echo "  - API Gateway:          http://localhost:3000"
        echo "  - API Docs:             http://localhost:3001/docs"
        ;;

    stop)
        echo -e "${YELLOW}Stopping all services...${NC}"
        docker-compose down
        echo -e "${GREEN}✅ All services stopped${NC}"
        ;;

    logs)
        SERVICE=${2:-""}
        if [ -n "$SERVICE" ]; then
            docker-compose logs -f $SERVICE
        else
            docker-compose logs -f
        fi
        ;;

    status)
        echo "Service status:"
        docker-compose ps
        ;;

    clean)
        echo -e "${YELLOW}Stopping and removing all containers and volumes...${NC}"
        docker-compose down -v
        echo -e "${GREEN}✅ Clean complete${NC}"
        ;;

    health)
        echo "Checking service health..."
        echo ""

        # Check each service
        for service in "localhost:3000" "localhost:3001" "localhost:3002" "localhost:3003"; do
            if curl -s "http://$service/health" > /dev/null 2>&1; then
                echo -e "  $service: ${GREEN}✓ healthy${NC}"
            else
                echo -e "  $service: ${RED}✗ unavailable${NC}"
            fi
        done
        ;;

    *)
        echo "Usage: $0 {start|frontend|stop|logs|status|clean|health}"
        echo ""
        echo "Commands:"
        echo "  start     Start backend services (databases + APIs)"
        echo "  frontend  Start all services including frontend"
        echo "  stop      Stop all services"
        echo "  logs      View logs (optionally specify service name)"
        echo "  status    Show service status"
        echo "  clean     Stop and remove all containers and volumes"
        echo "  health    Check health of all services"
        exit 1
        ;;
esac
