
# Variables

SERVICES = ai-service analytics-service auth-service chat-service gateway projects-service
COMPOSE_DEV  = docker-compose.yml
COMPOSE_PROD = docker-compose.prod.yml
DC      = docker compose -f $(COMPOSE_DEV)
DC_PROD = docker compose -f $(COMPOSE_PROD)
SERVICE ?= auth-service


# Development

dev:
	$(DC) up --build

dev-d:
	$(DC) up --build -d

dev-logs:
	$(DC) logs -f

dev-clean:
	$(DC) down -v

dev-shell:
	$(DC) exec $(SERVICE) sh

dev-ai:
	$(DC) up --build ai-service

dev-analytics:
	$(DC) up --build analytics-service

dev-auth:
	$(DC) up --build auth-service

dev-chat:
	$(DC) up --build chat-service

dev-gateway:
	$(DC) up --build gateway

dev-projects:
	$(DC) up --build projects-service


# Production

prod-build:
	$(DC_PROD) build

prod-up:
	$(DC_PROD) up -d

prod-down:
	$(DC_PROD) down

prod-logs:
	$(DC_PROD) logs -f

prod-restart:
	$(DC_PROD) down && $(DC_PROD) up -d


# Tests

test:
	SERVICE=$(SERVICE) $(DC) run --rm test-runner

test-watch:
	SERVICE=$(SERVICE) $(DC) run --rm test-runner npm test -- --watch

test-coverage:
	SERVICE=$(SERVICE) $(DC) run --rm test-runner npm test -- --coverage

test-all:
	@for svc in $(SERVICES); do \
		echo "\n▶ Testing $$svc"; \
		SERVICE=$$svc $(DC) run --rm test-runner || exit 1; \
	done


# Utilities

ps:
	$(DC) ps

clean-all:
	$(DC) down -v --rmi local
	docker system prune -f


# Help

help:
	@echo "Variables:"
	@echo "  SERVICE=$(SERVICE)  - target service (default: auth-service)"
	@echo ""
	@echo "Development:"
	@echo "  make dev              - Start all services"
	@echo "  make dev-d            - Start all services detached"
	@echo "  make dev-shell        - Shell into SERVICE"
	@echo "  make dev-ai/auth/...  - Start a single service"
	@echo "  make dev-logs         - Follow logs"
	@echo "  make dev-clean        - Stop and remove volumes"
	@echo ""
	@echo "Production:"
	@echo "  make prod-build       - Build production images"
	@echo "  make prod-up          - Start production"
	@echo "  make prod-down        - Stop production"
	@echo "  make prod-logs        - Follow production logs"
	@echo "  make prod-restart     - Restart production"
	@echo ""
	@echo "Tests:"
	@echo "  make test             - Run tests for SERVICE"
	@echo "  make test-watch       - Watch mode for SERVICE"
	@echo "  make test-coverage    - Coverage for SERVICE"
	@echo "  make test-all         - Run tests for all services"