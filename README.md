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
| 1 | Productos — categoría y marca creadas automáticamente |
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

Seleccione todos los pasos o elija pasos específicos. La clonación es **total y automática**: una fase inicial de descubrimiento pagina todos los SKU IDs de la tienda origen (`/pvt/sku/stockkeepingunitids`) y cachea el contexto de cada uno — sin prompts de rango, sin llamadas desperdiciadas en IDs vacíos.

`vtex-snap` validará la conectividad antes de comenzar.

---

## Idioma

El CLI habla **portugués, español e inglés**. Detecta el idioma automáticamente desde el locale del SO; puedes forzarlo de tres formas (en orden de precedencia):

```bash
vtex-snap start --lang pt           # flag CLI (mayor prioridad)
VTEX_SNAP_LANG=es vtex-snap start   # variable de entorno
vtex-snap init                      # elige el idioma y queda persistido
```

Idiomas soportados: `pt`, `es`, `en`. Fallback: `en`.

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
