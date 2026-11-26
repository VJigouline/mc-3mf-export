# Getting started

## Install

```sh
npm install three github:VJigouline/mc-3mf-export
```

## Write a file

`export3mf(root, options)` writes the meshes under `root`, usually a scene, as `.3mf`. It returns the result.

```ts
import { export3mf } from 'mc-3mf-export';

const result = export3mf(scene, { name: 'model' });
for (const warning of result.warnings) console.warn(warning);
const file = result.file;

// In a browser, download it:
const link = document.createElement('a');
link.href = URL.createObjectURL(new Blob([file.data], { type: file.mimeType }));
link.download = file.name;
link.click();

// In Node, write it:
// fs.writeFileSync(file.name, file.data);
```

## Units and orientation

Coordinates are written Z up, in the model's unit, millimetres by default.

## Options

- **`onlyVisible`** (default true): Leaves out hidden objects and those under hidden parents.
- **`filter`** (default —): A function that decides, for each object, whether it is exported, such as one leaving out an editor's helpers.
- **`unit`** (default 'millimeter'): 'micron', 'millimeter', 'centimeter', 'inch', 'foot' or 'meter'.
- **`colors`** (default true): Writes material and vertex colours.
- **`metadata`** (default {}): Metadata, such as Title, Designer or Copyright.
- **`name`** (default 'scene'): The file's name, without extension.

See the [API](API.md) for the whole result.
