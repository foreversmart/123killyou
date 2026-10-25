export type Rect = { x: number; y: number; width: number; height: number };
export type SceneLayer = {
  id: string;
  src: string;
  imageWidth: number;
  imageHeight: number;
  frame: Rect;
  rect: Rect;
  zIndex: number;
  clipRect?: Rect;
  actorId?: string;
};
export type SceneLabel = {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily?: string;
  align?: string;
  baseline?: string;
  rotation?: number;
  zIndex?: number;
};
export type SceneComposition = {
  width: number;
  height: number;
  layers: SceneLayer[];
  labels: SceneLabel[];
};
export type AuthoredLayout = {
  coordinateSpace: { width: number; height: number };
  defaultState?: Record<string, string | boolean>;
  sprites: Record<string, {
    path: string;
    width: number;
    height: number;
    sourceFrame?: Rect;
  }>;
  layers: {
    id: string;
    sprite: string;
    rect: Rect;
    zIndex: number;
    visibleWhen?: Record<string, string | boolean>;
    clipRect?: Rect;
  }[];
  labels?: SceneLabel[];
};
