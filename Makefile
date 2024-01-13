.PHONY: start
start:
	deno run --watch --allow-net --allow-read --allow-env --allow-write main.ts

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
	deno run --allow-env --allow-read --allow-sys --allow-write=public/css npm:tailwindcss@3.4.1 -i ./public/css/tailwind-input.css -o ./public/css/tailwind.css

.PHONY: migrate-db
migrate-db:
	deno run --allow-net --allow-read --allow-env migrate-db.ts

.PHONY: crons/cleanup
crons/cleanup:
	deno run --allow-net --allow-read --allow-env crons/cleanup.ts

.PHONY: exec-db
exec-db:
	docker exec -it -u postgres $(shell basename $(CURDIR))_postgresql_1 psql
