COMPOSE ?= docker compose

.PHONY: up down logs db-init backend-test frontend-test

up:
	$(COMPOSE) up --build

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

db-init:
	$(COMPOSE) run --rm backend npm run db:init

backend-test:
	cd backend && npm test

frontend-test:
	cd frontend && npm test
