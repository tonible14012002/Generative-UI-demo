# --- ENVS - DATABASE ENVs -----------------------------------------------------------------------
ifneq (,$(wildcard ./.env))
    include ./.env
    export
endif

up:
	@docker compose -f local.yaml up --build -d --remove-orphans

table-plus: 
	@open $(DATABASE_URL)

.PHONY: up