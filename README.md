# Deno Code Examples App

[![](https://github.com/BrunoBernardino/deno-code-examples/workflows/Run%20Tests/badge.svg)](https://github.com/BrunoBernardino/deno-code-examples/actions?workflow=Run+Tests)

This is an app with examples built using [Deno](https://deno.land) and deployed using [Deno Deploy](https://deno.com/deploy).

Based from [simple-deno-website-boilerplate.onbrn.com](https://github.com/BrunoBernardino/deno-boilerplate-simple-website).

## Framework-less

This right here is vanilla TypeScript and JavaScript using Web Standards. It's very easy to update and maintain.

It's meant to have no unnecessary dependencies, packagers, or bundlers. Just vanilla, simple stuff.

## Requirements

This was tested with [`Deno`](https://deno.land)'s version stated in the `.dvmrc` file, though other versions may work.

For the postgres/redis dependencies (used when running locally or in CI), you should have `Docker` and `docker-compose` installed.

Don't forget to set up your `.env` file based on `.env.sample`.

## Development

```sh
$ docker-compose up # runs docker with postgres/redis, etc.
$ make migrate-db # runs any missing database migrations
$ make start # runs the app
$ make format # formats the code
$ make test # runs tests
$ make build-tailwind # generates CSS for production, if you've made changes
```

## Other less-used commands

```sh
$ make exec-db # runs psql inside the postgres container, useful for running direct development queries like `DROP DATABASE "deno"; CREATE DATABASE "deno";`
```

## Structure

- Backend routes are defined at `routes.ts`.
- Static files are defined at `public/`.
- Pages are defined at `pages/`.
- Cron jobs are defined at `crons/`.
- Reusable bits of code are defined at `lib/`.
- Database migrations are defined at `db-migrations/`.

## Deployment

- Deno Deploy: Just push to the `main` branch. Any other branch will create a preview deployment.

## Why Tailwind? It requires a build step.

In reality, I'd prefer to use something like [`twind`](https://twind.dev/handbook/getting-started.html#es-module-cdn) to keep it all generated per request (like I do here for `TS` → `JS` or `SCSS` → `CSS`), but I don't like their syntax (I prefer the class syntax).
