.PHONY: start
start:
	deno run --watch --allow-net --allow-read --allow-env main.ts

.PHONY: format
format:
	deno fmt

.PHONY: test
test:
	deno fmt --check
	deno lint
	deno test --allow-net --allow-read --allow-env

.PHONY: build-tailwind
build-tailwind:
	@# NOTE: Ideally we'd run this via deno, but it's not fully supported yet, so we keep a reference of the relevant future command here.
	@# deno run --unstable --allow-env --allow-read --allow-write=public/css npm:tailwindcss -i ./public/css/tailwind-input.css -o ./public/css/tailwind.css
	npx tailwindcss@3.2.4 -i ./public/css/tailwind-input.css -o ./public/css/tailwind.css

.PHONY: migrate-db
migrate-db:
	deno run --allow-net --allow-read --allow-env migrate-db.ts

.PHONY: crons/cleanup
crons/cleanup:
	deno run --allow-net --allow-read --allow-env crons/cleanup.ts

.PHONY: exec-db
exec-db:
	docker exec -it -u postgres $(shell basename $(CURDIR))_postgresql_1 psql
