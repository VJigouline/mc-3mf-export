# mc-3mf-export

A 3MF exporter for [three.js](https://threejs.org/), written in TypeScript. It writes three.js meshes as 3MF packages for 3D printing: one object per mesh, with its colours, placed by build items, Z up, in millimetres by default. It was made for [SceneEditor](https://github.com/VJigouline/SceneEditor), and works in any three.js application.

```ts
import { export3mf } from 'mc-3mf-export';

const { file } = export3mf(scene);
// file.data is a Uint8Array: download it, or write it to disk.
const url = URL.createObjectURL(new Blob([file.data], { type: file.mimeType }));
```

## What it writes

- One object per mesh, with its vertices and triangles, in world coordinates.
- Material colours and opacity as base materials, several per object where a mesh has several materials.
- Vertex colours as a colour group.
- The model's unit and metadata, such as Title and Designer.

Lines and points are left out, with a warning. Textures are not written. See [Format and limits](Documentation/Support.md) for the details.

## Install

The package is not on the npm registry. Install it from GitHub:

```sh
npm install github:VJigouline/mc-3mf-export
```

`three` (r160 or later) is a peer dependency. The package builds itself on install.

## Documentation

- [Getting started](Documentation/GettingStarted.md)
- [API](Documentation/API.md)
- [Format and limits](Documentation/Support.md)
- [Using it in SceneEditor](Documentation/SceneEditor.md)

## Development

```sh
npm install
npm test           # unit tests, with Vitest
npm run typecheck
npm run build      # dist/
```

The tests write files and read them back with three.js's loaders. It needs Node.js 22 or later.

## Licence

[MIT](LICENSE)
