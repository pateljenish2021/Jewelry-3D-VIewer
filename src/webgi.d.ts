declare module 'webgi' {
  export class ViewerApp {
    constructor(options: { canvas: HTMLCanvasElement })
    scene?: any
    addPlugin(plugin: any): Promise<any>
    setDirty?(): void
    dispose?(): void
  }

  export class AssetManagerPlugin {
    addFromPath(path: string): Promise<any>
    clear?(): void
  }

  export class DiamondPlugin {
    diamonds?: any[]
    addDiamond?(material: any): void
    removeDiamond?(material: any): void
    dispose?(): Promise<void>
  }

  export class GBufferPlugin {}

  export class TonemapPlugin {
    constructor(enabled: boolean, preserveAlpha: boolean)
    config?: {
      contrast?: number
      saturation?: number
      exposure?: number
      [key: string]: any
    }
  }

  export class GroundPlugin {
    groundReflection?: boolean
    bakedShadows?: boolean
    smoothShadow?: boolean
    shadowIntensity?: number
    bakeShadows?(): Promise<void>
    refresh?(): void
  }

  export class TemporalAAPlugin {
    enabled?: boolean
    useTotalFrameCount?: boolean
    frameCount?: number
  }

  export class CameraViewPlugin {
    addView?(name: string, camera: any): void
    removeView?(name: string): void
    animateToView?(name: string, duration?: number): Promise<void>
    views?: Map<string, any>
  }

  export class RandomizedDirectionalLightPlugin {}

  export class Object3D {
    name?: string
    position: { z: number }
    scale: { set: (x: number, y: number, z: number) => void }
    add: (...objects: any[]) => void
  }

  export class Color {
    constructor(hex: string)
  }

  export function addBasePlugins(viewer: ViewerApp): Promise<void>
}
