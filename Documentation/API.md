# API

## `export3mf(root, options?)`

Writes `.3mf` and returns a `3mfExportResult`.

### Options

| Option | Default | Meaning |
| --- | --- | --- |
| `onlyVisible` | true | Leaves out hidden objects and those under hidden parents. |
| `filter` | — | A function that decides, for each object, whether it is exported, such as one leaving out an editor's helpers. |
| `unit` | 'millimeter' | 'micron', 'millimeter', 'centimeter', 'inch', 'foot' or 'meter'. |
| `colors` | true | Writes material and vertex colours. |
| `metadata` | {} | Metadata, such as Title, Designer or Copyright. |
| `name` | 'scene' | The file's name, without extension. |

### `3mfExportResult`

| Field | Type | Meaning |
| --- | --- | --- |
| `file` | `ExportFile` | The 3MF package. |
| `stats` | object | Objects, vertices, triangles and materials. |
| `warnings` | `string[]` | What was left out, and why. |

`ExportFile` is `{ name, data, mimeType }`, with `data` a `Uint8Array`.

See the package's `index.d.ts` for every exported type and helper.
