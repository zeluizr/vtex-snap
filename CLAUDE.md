# CLAUDE.md — vtex-snap

Guía para el agente IA sobre este proyecto.

## Proyecto

**vtex-snap** es un CLI open source que clona el catálogo completo de una tienda VTEX a otra.

- Paquete npm: `vtex-snap`
- Repositorio: `zeluizr/vtex-catalog-cloner`
- Sitio: https://vtexsnap.zeluizr.com
- Idioma del CLI (mensajes en runtime): **i18n con PT / ES / EN** vía `src/i18n/`. Usar `t()` y `resolveLang()`. Fallback: `en`.
- Idioma de docs del proyecto (README, CHANGELOG, templates): **español**.

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
    init.ts                 # vtex-snap init — inicia clonación (onboarding inline)
    config.ts               # vtex-snap config — agrega un perfil de tienda
  config/
    store.ts                # lectura/escritura de ~/.config/vtex-snap/
  lib/
    vtex-client.ts          # cliente HTTP VTEX con throttling
    id-map.ts               # mapeo de IDs origen → destino
    throttle.ts             # control de rate limit
  workers/
    orchestrator.ts         # ejecuta las 3 etapas + descubrimiento
    discovery.ts            # pagina SKU IDs y arma el DiscoveredCatalog
    types.ts                # tipos compartidos (CloneEvent, etc.)
    steps/
      01-products.ts
      02-skus.ts
      03-spec-values.ts
  i18n/
    index.ts                # t(), setLang, resolveLang
    locales/{pt,es,en}.ts   # diccionarios tipados (MessageKey)
  ui/
    dashboard.ts            # dashboard multi-barra estilo Docker pull
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
- El preflight de `init` debe usar un endpoint con los mismos permisos que la Descoberta (`getSkuIds`) — no `getBrands` — para detectar AppKeys con rol limitado antes del Dashboard.
- Conflictos HTTP 409 en POST de `product`/`stockkeepingunit` caen automáticamente a PUT vía `upsertProduct`/`upsertSku`.

## Publicar una nueva versión

1. Actualizar `version` en `package.json` y `src/index.ts`
2. Actualizar `CHANGELOG.md`
3. Commit + push a `main`
4. Crear Release en GitHub con tag `vX.Y.Z`
5. El workflow `publish.yml` publica automáticamente en npm
