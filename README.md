# vtex-snap

> CLI to clone a complete VTEX store catalog to another VTEX store.
> CLI para clonar el catálogo completo de una tienda VTEX a otra.

[![npm version](https://img.shields.io/npm/v/vtex-snap)](https://www.npmjs.com/package/vtex-snap)
[![CI](https://github.com/zeluizr/vtex-catalog-cloner/actions/workflows/ci.yml/badge.svg)](https://github.com/zeluizr/vtex-catalog-cloner/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

🌐 **[vtexsnap.zeluizr.com](https://vtexsnap.zeluizr.com)**

---

## What it does / O que faz

`vtex-snap` migrates your entire VTEX catalog from one account to another — interactively, step by step, with progress tracking.

`vtex-snap` migra todo o catálogo VTEX de uma conta para outra — de forma interativa, etapa por etapa, com rastreamento de progresso.

**Cloned resources / Recursos clonados:**

| # | EN | PT/ES |
|---|----|----|
| 1 | Categories | Categorias |
| 2 | Brands | Marcas |
| 3 | Trade Policies | Trade Policies |
| 4 | Specifications | Especificações / Especificaciones |
| 5 | Products | Produtos / Productos |
| 6 | SKUs | SKUs |
| 7 | Images | Imagens / Imágenes |
| 8 | Spec Values | Valores de Spec |
| 9 | Prices | Preços / Precios |
| 10 | Stock | Estoque / Stock |
| 11 | Collections | Coleções / Colecciones |

---

## Installation / Instalação / Instalación

```bash
npm install -g vtex-snap
# or / ou / o
pnpm add -g vtex-snap
```

**Requirements / Requisitos:** Node.js >= 20

---

## Usage / Uso

### 1. Configure credentials / Configure as credenciais / Configure las credenciales

```bash
vtex-snap init
```

Prompts for source and target store credentials (account name + app key/token).
Solicita as credenciais das lojas de origem e destino (account name + app key/token).
Solicita las credenciales de las tiendas de origen y destino (account name + app key/token).

### 2. Start cloning / Iniciar clonagem / Iniciar clonación

```bash
vtex-snap start
```

Select all steps or pick specific ones. `vtex-snap` will validate connectivity before starting.
Selecione todas as etapas ou escolha etapas específicas. O `vtex-snap` validará a conectividade antes de iniciar.
Seleccione todos los pasos o elija pasos específicos. `vtex-snap` validará la conectividad antes de comenzar.

---

## Contributing / Contribuindo / Contribuyendo

This is an open source project — contributions are welcome!
Este é um projeto open source — contribuições são bem-vindas!
Este es un proyecto open source — ¡las contribuciones son bienvenidas!

1. Fork the repository
2. Create your branch: `git checkout -b feat/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push and open a Pull Request

Please read our [contributing guidelines](.github/pull_request_template.md) and check the [open issues](https://github.com/zeluizr/vtex-catalog-cloner/issues).

---

## Security / Segurança / Seguridad

Found a vulnerability? Please report it responsibly — see [SECURITY.md](.github/SECURITY.md).
Encontrou uma vulnerabilidade? Reporte de forma responsável — veja [SECURITY.md](.github/SECURITY.md).
¿Encontraste una vulnerabilidad? Repórtala de forma responsable — ver [SECURITY.md](.github/SECURITY.md).

---

## License / Licença / Licencia

MIT © [zeluizr](https://github.com/zeluizr)
