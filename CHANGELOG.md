# Changelog

## Unreleased

### Categorías
- Nuevo archivo de configuración `~/.config/vtex-snap/categories.txt` — un ID por línea para definir explícitamente qué categorías clonar
- Soporta categorías **inactivas** (que el endpoint de árbol de VTEX omite)
- Las categorías se ordenan topológicamente (padres antes que hijos) antes de crearlas en el destino, garantizando el mapeo correcto de `FatherCategoryId`
- Si el archivo no existe, el CLI aborta con instrucciones claras

### Correcciones
- **Categorías**: `CategoryTreeNode` corregido a PascalCase (`Id`, `Name`, `Children`, `HasChildren`, `Url`) — coincide con la respuesta real del endpoint `/api/catalog_system/pvt/category/tree/{levels}`. Antes resultaba en `category undefined` y `Name is required` al crear
- **Trade Policies**: endpoint corregido a `/api/catalog_system/pvt/saleschannel/list` (antes devolvía 404)
- **Productos** y **Especificaciones**: `collectIds` actualizado para usar el casing PascalCase del árbol de categorías

### Cliente HTTP
- Nuevo método `VtexClient.getCategoryByIdSafe` — devuelve `null` en lugar de lanzar error en HTTP 404

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
