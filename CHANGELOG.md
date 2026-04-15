# Changelog

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
