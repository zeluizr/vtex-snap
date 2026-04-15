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

**Recursos clonados (3 etapas, en orden):**

| # | Recurso |
|---|---------|
| 1 | Productos (por rango de IDs) — categoría y marca creadas automáticamente |
| 2 | SKUs |
| 3 | Valores de Especificaciones — grupo y campo creados automáticamente |

> Pensado para clonar catálogos a **ambientes de prueba**. Aprovecha endpoints de VTEX que crean categoría, marca, grupo de specs y specs sob demanda — eliminando los pasos intermedios. Los IDs de origen se preservan en el destino siempre que la API lo permite. No incluye imágenes, precios, stock ni colecciones.

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

### 2. Iniciar clonación

```bash
vtex-snap start
```

Seleccione todos los pasos o elija pasos específicos. Se le pedirá un rango de IDs de producto (`productIdFrom..productIdTo`) — los IDs inexistentes (404) se ignoran automáticamente.

`vtex-snap` validará la conectividad antes de comenzar.

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
