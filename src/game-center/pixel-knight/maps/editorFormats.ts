/** Shapes produced by `PixelKnightMapEditorView` export buttons. */

export type EditorImageSize = {
  width: number
  height: number
}

export type EditorObstaclesV1 = {
  tile: number
  cols: number
  rows: number
  image: EditorImageSize
  blocked: Array<{ col: number; row: number }>
}

export type EditorPlacementV1 = {
  id: string
  assetKey: string
  x: number
  y: number
  scale: number
}

export type EditorPlacementsV1 = {
  image: EditorImageSize
  placements: EditorPlacementV1[]
}
