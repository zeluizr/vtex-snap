# CLAUDE.md — vtex-snap

Guía para el agente IA sobre este proyecto.

## Proyecto

**vtex-snap** es un CLI open source que clona el catálogo completo de una tienda VTEX a otra.

- Paquete npm: `vtex-snap`
- Repositorio: `zeluizr/vtex-catalog-cloner`
- Sitio: https://vtexsnap.zeluizr.com
- Idioma de todo el contenido visible al usuario: **español**

## Stack

- **Runtime:** Node.js >= 20
- **Lenguaje:** TypeScript (ESM, `"type": "module"`)
- **Package manager:** pnpm
- **Tests:** Vitest
- **CLI framework:** commander + @clack/prompts + ora + picocolors
- **Build:** `tsc` + shebang injection + `chmod +x`

## Comandos

```bash
pnpm build        # compila TypeScript → dist/
pnpm test         # ejecuta tests (Vitest)
pnpm test:watch   # tests en modo watch
pnpm typecheck    # solo verificación de tipos
pnpm dev          # tsc en modo watch
```

## Estructura

```
src/
  index.ts                  # punto de entrada, define comandos CLI
  commands/
    init.ts                 # vtex-snap init — configura credenciales
    start.ts                # vtex-snap start — inicia clonación
  config/
    store.ts                # lectura/escritura de ~/.config/vtex-snap/
  lib/
    vtex-client.ts          # cliente HTTP VTEX con throttling
    id-map.ts               # mapeo de IDs origen → destino
    throttle.ts             # control de rate limit
  workers/
    orchestrator.ts         # ejecuta los pasos en orden
    types.ts                # tipos compartidos (CloneEvent, etc.)
    steps/
      01-categories.ts
      02-brands.ts
      03-trade-policies.ts
      04-specifications.ts
      05-products.ts
      06-skus.ts
      07-images.ts
      08-spec-values.ts
      09-prices.ts
      10-stock.ts
      11-collections.ts
  ui/
    logger.ts               # logging de eventos
    progress.ts             # actualización del spinner
.github/
  workflows/
    ci.yml                  # tests en push/PR
    publish.yml             # publica en npm al crear Release (OIDC)
  ISSUE_TEMPLATE/
    bug_report.yml
    feature_request.yml
    config.yml
  pull_request_template.md
  SECURITY.md
  dependabot.yml
```

## CI/CD

- **ci.yml** — dispara en push/PR a `main`: instala, compila, testea
- **publish.yml** — dispara en `release: published`: compila, testea, publica con `--provenance`
- Usa **Trusted Publisher (OIDC)** — no requiere `NPM_TOKEN` en secrets

## Convenciones

- Todo texto visible al usuario (README, templates, docs) en **español**
- Commits en inglés con prefijo convencional: `feat:`, `fix:`, `chore:`, etc.
- No mockear dependencias externas en tests — usar clientes reales o stubs mínimos
- El `IdMap` es central: cada paso debe registrar el mapeo `origenId → destinoId` para que los pasos siguientes puedan referenciar correctamente

## Publicar una nueva versión

1. Actualizar `version` en `package.json` y `src/index.ts`
2. Actualizar `CHANGELOG.md`
3. Commit + push a `main`
4. Crear Release en GitHub con tag `vX.Y.Z`
5. El workflow `publish.yml` publica automáticamente en npm
