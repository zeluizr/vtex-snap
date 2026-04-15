# vtex-snap

> CLI para clonar el catálogo completo de una tienda VTEX a otra.

[![npm version](https://img.shields.io/npm/v/vtex-snap)](https://www.npmjs.com/package/vtex-snap)
[![CI](https://github.com/zeluizr/vtex-catalog-cloner/actions/workflows/ci.yml/badge.svg)](https://github.com/zeluizr/vtex-catalog-cloner/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

🌐 **[vtexsnap.zeluizr.com](https://vtexsnap.zeluizr.com)**

---

## ¿Qué hace?

`vtex-snap` migra todo el catálogo VTEX de una cuenta a otra — de forma interactiva, paso a paso, con seguimiento de progreso.

**Recursos clonados:**

| # | Recurso |
|---|---------|
| 1 | Categorías |
| 2 | Marcas |
| 3 | Trade Policies |
| 4 | Especificaciones |
| 5 | Productos |
| 6 | SKUs |
| 7 | Imágenes |
| 8 | Valores de Spec |
| 9 | Precios |
| 10 | Stock |
| 11 | Colecciones |

---

## Instalación

```bash
npm install -g vtex-snap
# o
pnpm add -g vtex-snap
```

**Requisitos:** Node.js >= 20

---

## Uso

### 1. Configurar credenciales

```bash
vtex-snap init
```

Solicita las credenciales de las tiendas de origen y destino (account name + app key/token).

### 2. Definir categorías a clonar

Los pasos de **Categorías** y **Productos** requieren un archivo con los IDs de categoría de la tienda origen — uno por línea. Esto permite incluir categorías inactivas (que el endpoint de árbol de VTEX omite) y evita escaneos innecesarios.

Crea el archivo en `~/.config/vtex-snap/categories.txt`:

```text
1
2
5
42
```

> 💡 Puedes obtener los IDs desde el admin de VTEX en **Catálogo → Categorías**, o consultando la API `GET /api/catalog/pvt/category/{id}`.

### 3. Iniciar clonación

```bash
vtex-snap start
```

Seleccione todos los pasos o elija pasos específicos. `vtex-snap` validará la conectividad y cargará los IDs de categoría desde el archivo antes de comenzar.

---

## Contribuir

Este es un proyecto open source — ¡las contribuciones son bienvenidas!

1. Fork del repositorio
2. Crea tu rama: `git checkout -b feat/mi-feature`
3. Commit: `git commit -m 'feat: agregar mi feature'`
4. Push y abre un Pull Request

Revisa las [issues abiertas](https://github.com/zeluizr/vtex-catalog-cloner/issues) y las [discusiones](https://github.com/zeluizr/vtex-catalog-cloner/discussions).

---

## Seguridad

¿Encontraste una vulnerabilidad? Repórtala de forma responsable — ver [SECURITY.md](.github/SECURITY.md).

---

## Licencia

MIT © [zeluizr](https://github.com/zeluizr)
