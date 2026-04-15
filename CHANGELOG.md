# Changelog

## v2.9.2 — 2026-04-15

### Migración a npm, sin coverage

- **Package manager único: `npm`.** Eliminado `pnpm-lock.yaml`; `package-lock.json` pasa a ser el lockfile versionado. Workflows `ci.yml` y `publish.yml` ya no usan `pnpm/action-setup` — solo `actions/setup-node@v4` con `cache: npm`, `npm ci`, `npm run build`, `npm test`.
- **Coverage removido.** Eliminada la dependencia `@vitest/coverage-v8`, el script `test:coverage` y el bloque `coverage` de `vitest.config.ts`. Directorio `coverage/` (versionado por error) removido del repo y añadido al `.gitignore`.
- **Docs actualizadas.** `README.md`, `CLAUDE.md` y el template de PR ahora referencian `npm install` / `npm run build` / `npm test` en lugar de los equivalentes pnpm.
- **Vitest fijado en `^3.2.0`** — la 4.x tiene conflicto de peer deps (`rolldown-plugin-dts`) que impide `npm install` sin `--legacy-peer-deps`.

---

## v2.9.1 — 2026-04-15

### Preflight alineado al endpoint real

El chequeo de credenciales al inicio de `vtex-snap init` usaba `GET /api/catalog_system/pvt/brand/list` (`getBrands`), endpoint que requiere solo permiso de lectura de marcas. La fase de **Descubrimiento** inmediatamente posterior usa `GET /api/catalog_system/pvt/sku/stockkeepingunitids` (`getSkuIds`), que exige permisos de Catálogo (Products & SKU). Resultado: AppKeys con rol limitado pasaban el preflight y fallaban con un `HTTP 401 Unauthorized` ya dentro del Dashboard.

- `src/commands/init.ts`: preflight de source y target ahora llama `getSkuIds(1, 1)` — misma permiso que la Descoberta, costo mínimo (una sola página de tamaño 1).
- El error de credenciales insuficientes se detecta antes del Dashboard y se muestra con el formato estándar `✗ Erro na loja origem/destino: …`.

### Mensaje de confirmación limpio

El prompt `start.confirmAll` mostraba `(3 etapas + descoberta, conflitos viram PUT)` — ruido técnico innecesario. Removido en los tres locales:

- `src/i18n/locales/pt.ts` → `Clonar tudo de {source} → {target}?`
- `src/i18n/locales/es.ts` → `¿Clonar todo de {source} → {target}?`
- `src/i18n/locales/en.ts` → `Clone everything from {source} → {target}?`

---

## v2.9.0 — 2026-04-15

### Reorganización de comandos + multi-account

Comandos refactorizados para separar **gestión de credenciales** de **ejecución**:

| Comando | Antes | Ahora |
|---------|-------|-------|
| `vtex-snap init` | Configura un par fijo source/target | **Inicia la clonación** (onboarding inline si falta config) |
| `vtex-snap config` | (no existía) | **Agrega un perfil** de tienda (account + appKey + appToken) |
| `vtex-snap start` | Ejecutaba la clonación | **Removido** (su rol pasó a `init`) |
| `vtex-snap help` | (genérico) | Igual — built-in de commander |

### Múltiples perfiles

La config ahora guarda una **lista de perfiles** (`profiles[]`) en `~/.config/vtex-snap/config.json`:

```json
{
  "lang": "pt",
  "profiles": [
    { "accountName": "tiendatest1", "appKey": "...", "appToken": "...", "sellerId": "1" },
    { "accountName": "commente",    "appKey": "...", "appToken": "...", "sellerId": "1" }
  ]
}
```

- `vtex-snap config` añade/sobrescribe un perfil identificado por `accountName`.
- `vtex-snap init` muestra dos `select` para elegir source y target (target excluye el source elegido).
- Si hay menos de 2 perfiles, el `init` ofrece añadirlos inline antes de seguir.
- Si no hay idioma persistido, el `init` también pregunta el idioma una vez (y guarda).

### Ruptura de configuración

El nuevo shape es **incompatible** con la config anterior (`{ source, target }`). Se recomienda eliminar `~/.config/vtex-snap/config.json` y volver a correr `vtex-snap config` por cada tienda.

---

## v2.8.0 — 2026-04-15

### Dashboard multi-barra (estilo Docker pull)

El spinner de una sola línea fue reemplazado por un dashboard que muestra **todas las etapas a la vez** con barra de progreso, contador y ETA:

```
  ⠹  Discovery       ━━━━━━━━━━━━━━━━━━━━────  9668/9668  eta 12s
  ✓  Products        ━━━━━━━━━━━━━━━━━━━━━━━━  listo 890
  ·  SKUs            ────────────────────────  pendiente
  ·  Spec Values     ────────────────────────  pendiente
  ! products: Failed to clone product 12345
```

- Se redibuja en su lugar usando ANSI cursor controls (`\x1b[<n>F` + `\x1b[0J`).
- Spinner anima a 120 ms incluso sin eventos (útil durante cooldowns de 429).
- Línea inferior muestra el último warning/error (truncado).

### Clonación total automática

- Eliminado el prompt de selección de etapas. **Siempre se clonan todas las 3 etapas + descubrimiento**.
- Mensaje de confirmación nuevo: "Clonar tudo de X → Y".

### 409 → update (upsert)

Cuando el destino ya tiene la entidad con el mismo ID (caso típico al re-ejecutar la clonación), VTEX devuelve **HTTP 409**. Antes esto era un error fatal; ahora cae automáticamente a un PUT:

- Producto: POST `/pvt/product` → 409 → PUT `/pvt/product/{id}`.
- SKU: POST `/pvt/stockkeepingunit` → 409 → PUT `/pvt/stockkeepingunit/{id}`.
- Spec values ya usaban PUT (upsert nativo).

Implementado vía `upsertProduct()` / `upsertSku()` en `vtex-client.ts`. Cada `step:progress` ahora rotula `created` o `updated`.

### Otros ajustes

- Removidos los `console.log/error` de los workers — el dashboard captura todo.
- Mensaje de cooldown de 429 fue removido de stderr (rompía el dashboard); el throttle global cuida la pausa silenciosamente.

---

## v2.7.0 — 2026-04-15

### Internacionalización (PT / ES / EN)

El CLI ahora habla tres idiomas. La resolución sigue una cadena de precedencia:

1. Flag `--lang <pt|es|en>`
2. Variable de entorno `VTEX_SNAP_LANG`
3. Preferencia guardada en `~/.config/vtex-snap/config.json` (campo `lang`)
4. Locale del SO (`Intl.DateTimeFormat().resolvedOptions().locale`)
5. Fallback: `en`

### `vtex-snap init`

- Nuevo prompt al inicio: idioma del CLI (Auto-detectar / Português / Español / English).
- Si el usuario elige un idioma específico, queda persistido en `config.json` (`"lang": "pt"`).
- "Auto-detectar" no escribe el campo, así el SO/env siguen mandando.

### Módulo nuevo

- `src/i18n/` — `t(key, params)`, `setLang`, `resolveLang`, locales planos en `locales/{pt,es,en}.ts`.
- Sin dependencias adicionales: usa `Intl` nativo y dictionarios tipados (`MessageKey`).

### Mensajes traducidos

- `init.ts`, `start.ts`, `ui/logger.ts`, `ui/progress.ts` — todos los textos visibles ahora pasan por `t()`.
- Banner ASCII y nombres técnicos (`account name`, `app key`, `SKU`) permanecen sin traducir.

---

## v2.6.0 — 2026-04-15

### Descoberta automática via SKU IDs

O CLI deixa de pedir um range `productIdFrom..productIdTo`. Em vez disso, antes de qualquer etapa selecionada, executa uma fase de **descoberta** que:

1. Pagina `GET /api/catalog_system/pvt/sku/stockkeepingunitids?page&pagesize=1000` até receber uma página vazia ou parcial.
2. Para cada SKU ID, busca o contexto via `GET /api/catalog_system/pvt/sku/stockkeepingunitbyid/{id}`.
3. Agrupa por `ProductId` e cacheia em memória `BrandName`, `ProductSpecifications` e `SkuSpecifications`.

As três etapas (Produtos / SKUs / Valores de Especificações) consomem o catálogo descoberto, eliminando:

- O prompt de range no CLI.
- Chamadas desperdiçadas em IDs vazios (404).
- A necessidade de re-buscar specs no passo de spec-values — já estão em mão desde a descoberta.

### Cliente HTTP

- Adicionados: `getSkuIds(page, pageSize)`, `getSkuContextSafe(skuId)`.
- Removido: `getSkusByProductId` (descoberta substitui).

### Tipos

- `SkuContext` agora declara explicitamente os campos consumidos (`SkuName`, `Dimension`, `RealDimension`, `BrandName`, `AlternateIds`, etc.) — antes só tipava `Id`/`ProductId`/specs.
- Novos: `DiscoveredSku`, `DiscoveredProduct`, `DiscoveredCatalog`.

### Observações

- O passo de SKUs deixa de chamar `getSkusByProductId` — usa diretamente o `SkuContext` cacheado para todos os campos do POST.
- A clonagem agora é total por padrão. Filtros (por marca, categoria, etc.) podem entrar no futuro como opções.

---

## v2.5.0 — 2026-04-15

### Fluxo simplificado: 6 → 3 etapas

Aproveitando que `POST /api/catalog/pvt/product` aceita `CategoryPath` + `BrandName` (criando categoria e marca sob demanda) e que `PUT /api/catalog/pvt/{product|stockkeepingunit}/{id}/specificationvalue` cria grupo + campo + valores de especificação automaticamente, eliminamos as etapas de **Marcas**, **Categorias** e **Definição de Especificações**. Novo fluxo:

1. **Produtos** — para cada produto, resolvemos `CategoryPath` (via `TreePath`) e `BrandName` da origem e enviamos no POST. Categoria e marca são criadas no destino se ainda não existirem.
2. **SKUs**
3. **Valores de Especificações** — usa `getSkuContext` para extrair specs de produto e SKU com `FieldGroupName`, e PUT no endpoint que cria tudo automaticamente.

### Mudanças quebradeiras

- O arquivo `~/.config/vtex-snap/categories.txt` foi removido. Toda a descoberta agora acontece via range de IDs de produto.
- O `IdMap` foi totalmente removido (não há mais necessidade de mapear IDs entre execuções).
- `vtex-client.ts` ficou bem mais enxuto: removidos todos os métodos de marca/categoria/especificações além dos essenciais para resolver path/name; adicionados `getCategoryWithTreePath`, `getBrand`, `getSkuContext`, `setProductSpecValue`, `setSkuSpecValue`.

### Cache

- `01-products.ts` cacheia resoluções de categoria e marca em memória — produtos que compartilham a mesma categoria/marca disparam apenas uma chamada à API.

---

## v2.4.0 — 2026-04-15

### Cambio de alcance: 11 → 6 etapas
Reducción del flujo a lo esencial para clonar el catálogo en ambientes de prueba. Nuevo orden:

1. **Marcas**
2. **Categorías**
3. **Especificaciones** (creación de definiciones)
4. **Productos** (descubrimiento por rango de IDs)
5. **SKUs**
6. **Valores de Especificaciones** (asociados a productos/SKUs ya creados)

**Eliminados**: Trade Policies, Imágenes, Precios, Stock, Colecciones.

### Preservación de IDs origen → destino
- Marcas, Categorías, Productos y SKUs ahora envían `Id` en el body del POST — el destino mantiene el mismo ID que el origen
- Elimina casi toda dependencia del `IdMap` entre ejecuciones (solo persiste para spec fields/groups, ya que la API de specs no acepta `Id` en el POST)
- Permite reanudar clonaciones parciales sin perder el mapeo

### CLI
- Nuevo prompt: rango de IDs de producto a recorrer (`productIdFrom..productIdTo`) — ignora 404s automáticamente
- `~/.config/vtex-snap/categories.txt` sigue siendo requerido para las etapas de Categorías y Especificaciones
- Preflight de credenciales ahora usa `getBrands()` (endpoint liviano disponible en cualquier cuenta)

### Cliente HTTP
- Nuevos métodos: `getProductSafe(id)` (404 → null), `getSkusByProductId(productId)`
- Eliminados métodos no usados: `getCategoryTree`, `getTradePolicies`, `getProductAndSkuIds`, `getSkuImages`, `createSkuImage`, `getPrice`, `setPrice`, `getWarehouses`, `getInventory`, `updateInventory`, `getCollections`, `createCollection`, `getCollectionProducts`, `addSkuToCollection`

### Categorías (de Unreleased)
- Archivo `~/.config/vtex-snap/categories.txt` — un ID por línea, soporta categorías inactivas
- Orden topológico (padres antes que hijos) garantizando `FatherCategoryId` correcto

### Correcciones (de Unreleased)
- `CategoryTreeNode` PascalCase corregido (no aplica más por eliminación del método, pero se preservó la lección en el nuevo flujo)

---

## v2.3.0 — 2026-03-17

### Publicación en npm
- Primer release publicado en npm como `vtex-snap`
- Trusted Publisher (OIDC) configurado — publicación sin npm token
- Provenance habilitado (`--provenance`) — badge de verificación en npm

### Repositorio GitHub
- README.md creado — aparece en npm y GitHub
- CHANGELOG.md creado
- CLAUDE.md creado con guías para el agente IA
- Metadata del paquete: `homepage`, `repository`, `bugs` en `package.json`
- Topics del repo: `vtex`, `vtex-io`, `cli`, `nodejs`, `typescript`, `ecommerce`, `catalog`, `migration`, `open-source`
- Descripción y sitio configurados en GitHub

### Archivos `.github`
- `dependabot.yml` — PRs automáticos semanales para npm y GitHub Actions
- `ISSUE_TEMPLATE/bug_report.yml` — formulario estructurado para bugs
- `ISSUE_TEMPLATE/feature_request.yml` — formulario para solicitudes de funcionalidad
- `ISSUE_TEMPLATE/config.yml` — issues en blanco deshabilitados, link a Discussions
- `pull_request_template.md` — checklist para PRs
- `SECURITY.md` — política de reporte de vulnerabilidades

### CI/CD
- `ci.yml` — tests automáticos en push/PR a `main` (Node 20, pnpm)
- `publish.yml` — publicación automática en npm al crear un Release

---

## v2.2.0

### Funcionalidad de clonación
- Orquestador con 11 pasos de clonación en orden
- Selección interactiva de pasos con `@clack/prompts`
- Verificación de conectividad antes de iniciar
- Seguimiento de progreso con `ora`
- Logging de eventos por paso

### Pasos implementados
1. Categorías
2. Marcas
3. Trade Policies
4. Especificaciones
5. Productos
6. SKUs
7. Imágenes
8. Valores de Spec
9. Precios
10. Stock
11. Colecciones

### CLI
- Comando `vtex-snap init` — configura credenciales de origen y destino
- Comando `vtex-snap start` — inicia el proceso de clonación
- Credenciales guardadas en `~/.config/vtex-snap/`

### Arquitectura
- TypeScript con ESM (`"type": "module"`)
- `VtexClient` con throttling para respetar rate limits de la API VTEX
- `IdMap` para mapear IDs de origen → destino durante la migración
- Tests con Vitest
