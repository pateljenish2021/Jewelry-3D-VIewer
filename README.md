import { useCallback, useEffect, useRef, useState } from 'react'

// ========== RING CONFIGURATION - EASY TO MODIFY ==========
// Change these values to adjust the ring appearance
const RING_ROTATION_X = -0.25  // Tilt ring upward (0 = flat, positive = tilt up, try 0.2 to 0.4)
const RING_ROTATION_Y = 0      // Rotate ring left/right (0 = front view)
const RING_ROTATION_Z = 0      // Roll the ring (0 = normal)
const RING_POSITION_Y = -0.3     // Vertical position (negative = down, try -0.1 to -0.3)
// =========================================================

const RingViewerPage = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const viewerRef = useRef<any>(null)
  const managerRef = useRef<any>(null)
  const diamondPluginRef = useRef<any>(null)
  const object3dRef = useRef<any>(null)
  const currentHeadRef = useRef<any>(null)
  const currentShankRef = useRef<any>(null)

  // Track loaded file paths to optimize updates
  const currentHeadFileRef = useRef<string | null>(null)
  const currentShankFileRef = useRef<string | null>(null)

  const loadIdRef = useRef(0)
  const [isLoading, setIsLoading] = useState(false)

  // Ring rotation and position state
  const ringRotationRef = useRef({ x: RING_ROTATION_X, y: RING_ROTATION_Y, z: RING_ROTATION_Z })
  const ringPositionRef = useRef({ y: RING_POSITION_Y })

  // Function to update ring rotation
  const updateRingRotation = useCallback(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    const { x, y, z } = ringRotationRef.current
    if (currentHeadRef.current) {
      currentHeadRef.current.rotation.set(x, y, z, 'XYZ')
    }
    if (currentShankRef.current) {
      currentShankRef.current.rotation.set(x, y, z, 'XYZ')
    }
    viewer.setDirty?.()
  }, [])

  // Function to update ring position
  const updateRingPosition = useCallback(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    const { y } = ringPositionRef.current
    if (currentHeadRef.current) {
      currentHeadRef.current.position.y = y
    }
    if (currentShankRef.current) {
      currentShankRef.current.position.y = y
    }
    viewer.setDirty?.()
  }, [])

  // Expose control functions globally for console access
  useEffect(() => {
    ; (window as any).updateRingRotation = updateRingRotation
      ; (window as any).updateRingPosition = updateRingPosition
      ; (window as any).getRingRotationX = () => ringRotationRef.current.x
      ; (window as any).setRingRotationX = (value: number) => {
        ringRotationRef.current.x = value
        updateRingRotation()
      }
      ; (window as any).getRingRotationY = () => ringRotationRef.current.y
      ; (window as any).setRingRotationY = (value: number) => {
        ringRotationRef.current.y = value
        updateRingRotation()
      }
      ; (window as any).getRingRotationZ = () => ringRotationRef.current.z
      ; (window as any).setRingRotationZ = (value: number) => {
        ringRotationRef.current.z = value
        updateRingRotation()
      }
      ; (window as any).getRingPositionY = () => ringPositionRef.current.y
      ; (window as any).setRingPositionY = (value: number) => {
        ringPositionRef.current.y = value
        updateRingPosition()
      }
  }, [updateRingRotation, updateRingPosition])

  const loadModels = useCallback(async (
    viewer: any,
    manager: any,
    headData: { file: string | null; scale?: number; posZ?: number; name?: string } | null,
    shankData: { file: string | null; scale?: number; posZ?: number; name?: string } | null,
    metalHex?: string,
    headMetalHex?: string,
    shankMetalHex?: string
  ) => {
    const loadId = (loadIdRef.current += 1)

    // Debounce to prevent rapid double-loading
    await new Promise(r => setTimeout(r, 50))
    if (loadId !== loadIdRef.current) return

    setIsLoading(true)
    // NOTE: We do NOT set viewer.enabled = false because we want to animate opacity.

    try {
      console.log('Starting load...')

      // Helpers
      const hexTo0x = (hex: string): number => {
        const cleaned = hex.replace('#', '')
        return parseInt(cleaned, 16)
      }

      const applyColorToModel = (root: any, colorHex: string) => {
        if (!root?.traverse || !colorHex) return
        const color0x = hexTo0x(colorHex)
        root.traverse((child: any) => {
          if (child?.material?.name?.toLowerCase().includes('diamond') ||
            child?.material?.name?.toLowerCase().includes('gem')) {
            return
          }
          if (child.isMesh) {
            const materials = Array.isArray(child.material) ? child.material : [child.material]
            materials.forEach((mat: any) => {
              if (mat?.color && typeof mat.color.setHex === 'function') {
                mat.color.setHex(color0x)
                mat.needsUpdate = true
              }
            })
          }
        })
      }

      const animateOpacity = (root: any, start: number, end: number, duration = 300) => {
        if (!root?.traverse) return Promise.resolve()

        const mats: any[] = []
        root.traverse((child: any) => {
          if (child.isMesh) {
            const materials = Array.isArray(child.material) ? child.material : [child.material]
            materials.forEach((m: any) => {
              const name = (m.name || '').toLowerCase()
              if (name.includes('diamond') || name.includes('gem')) return

              m.transparent = true
              m.opacity = start
              mats.push(m)
            })
          }
        })

        if (mats.length === 0) return Promise.resolve()

        return new Promise<void>((resolve) => {
          const startTime = performance.now()
          const animate = (time: number) => {
            const elapsed = time - startTime
            const progress = Math.min(elapsed / duration, 1)
            const ease = 1 - Math.pow(1 - progress, 3) // Cubic ease out

            const val = start + (end - start) * ease
            mats.forEach(m => m.opacity = val)

            viewer.setDirty?.()

            if (progress < 1) {
              requestAnimationFrame(animate)
            } else {
              if (end === 1) {
                mats.forEach(m => m.transparent = false)
              }
              resolve()
            }
          }
          requestAnimationFrame(animate)
        })
      }

      const disposeObject = (obj: any) => {
        if (!obj) return
        obj.traverse?.((child: any) => {
          child.geometry?.dispose?.()
          const mats = Array.isArray(child.material) ? child.material : [child.material]
          mats.filter(Boolean).forEach((mat: any) => mat.dispose?.())
        })
        obj.parent?.remove?.(obj)
      }

      // Check what needs updating
      const updateShank = shankData?.file !== currentShankFileRef.current
      const updateHead = headData?.file !== currentHeadFileRef.current

      console.log('Updates needed:', { updateShank, updateHead })

      if (!updateShank && !updateHead) {
        // Just update colors if needed
        if (metalHex || headMetalHex || shankMetalHex) {
          const defaultColor = metalHex || '#c2c2c3'
          if (headMetalHex) applyColorToModel(currentHeadRef.current, headMetalHex)
          else applyColorToModel(currentHeadRef.current, defaultColor)

          if (shankMetalHex) applyColorToModel(currentShankRef.current, shankMetalHex)
          else applyColorToModel(currentShankRef.current, defaultColor)

          viewer.setDirty?.()
        }
        setIsLoading(false)
        return
      }

      // 1. Animate Out (Parallel)
      const fadeOutPromises: Promise<void>[] = []
      if (updateShank && currentShankRef.current) fadeOutPromises.push(animateOpacity(currentShankRef.current, 1, 0))
      if (updateHead && currentHeadRef.current) fadeOutPromises.push(animateOpacity(currentHeadRef.current, 1, 0))

      if (fadeOutPromises.length > 0) {
        await Promise.all(fadeOutPromises)
      }

      if (loadId !== loadIdRef.current) return

      // 2. Load New Models (Internal Helper)
      const loadPart = async (variant: any, isHead: boolean) => {
        if (!variant?.file) return null

        if (loadId !== loadIdRef.current) return null

        const scene = viewer.scene
        // Capture existing meshes to diff
        const before = new Set<any>()
        scene.traverse((o: any) => {
          if (o.type === 'Mesh' || o.type === 'SkinnedMesh') before.add(o)
        })

        await manager.addFromPath(variant.file)

        if (loadId !== loadIdRef.current) return null

        const added: any[] = []
        scene.traverse((o: any) => {
          if ((o.type === 'Mesh' || o.type === 'SkinnedMesh') && !before.has(o)) {
            added.push(o)
            // Set initial state invisible/transparent for fade in
            if (o.material) {
              const mats = Array.isArray(o.material) ? o.material : [o.material]
              mats.forEach((m: any) => {
                const name = (m.name || '').toLowerCase()
                if (!name.includes('diamond') && !name.includes('gem')) {
                  m.transparent = true
                  m.opacity = 0
                }
              })
            }
          }
        })

        if (added.length === 0) return null

        // Container setup
        const Object3D = object3dRef.current
        const container = Object3D ? new Object3D() : null
        if (!container) return null // Should not happen

        container.name = variant?.name || (isHead ? 'head' : 'shank')
        const scale = 0.17
        container.scale.set(scale, scale, scale)
        if (typeof variant?.posZ === 'number') container.position.z = variant.posZ

        const { x, y, z } = ringRotationRef.current
        container.rotation.set(x, y, z, 'XYZ')
        container.position.y = ringPositionRef.current.y

        // Add container to scene
        scene.add(container)

        // Move meshes to container
        added.forEach(mesh => container.add(mesh))

        return container
      }

      // 3. Process Updates
      let newShankContainer = null
      let newHeadContainer = null

      // Dispose Old & Load New Shank
      if (updateShank) {
        if (currentShankRef.current) {
          scene.remove(currentShankRef.current)
          disposeObject(currentShankRef.current)
          currentShankRef.current = null
        }
        if (shankData?.file) {
          newShankContainer = await loadPart(shankData, false)
          if (newShankContainer) {
            currentShankRef.current = newShankContainer
            currentShankFileRef.current = shankData.file
          }
        }
      }

      // Dispose Old & Load New Head
      if (updateHead) {
        if (currentHeadRef.current) {
          scene.remove(currentHeadRef.current)
          disposeObject(currentHeadRef.current)
          currentHeadRef.current = null
        }
        if (headData?.file) {
          newHeadContainer = await loadPart(headData, true)
          if (newHeadContainer) {
            currentHeadRef.current = newHeadContainer
            currentHeadFileRef.current = headData.file
          }
        }
      }

      if (loadId !== loadIdRef.current) return

      // 4. Apply Properties (Colors, etc)
      // We apply colors NOW before fade in, so they fade in with correct color
      // Also apply to existing parts if they didn't update but color changed?
      // Logic above handled "no update" case.
      // But if "updateShank" is true, we must color new shank.
      // If "head" didn't update, we should re-color it if needed? 
      // Yes, in case `loadModels` was called with new color but same file.
      // Actually `loadModels` checks diffs merely for loading.
      // Colors should always be applied.

      const defaultColor = metalHex || '#c2c2c3'
      if (currentHeadRef.current) {
        applyColorToModel(currentHeadRef.current, headMetalHex || defaultColor)
      }
      if (currentShankRef.current) {
        applyColorToModel(currentShankRef.current, shankMetalHex || defaultColor)
      }

      // Configure Diamonds
      if (diamondPluginRef.current) {
        const materials = viewer.scene?.materials || []
        const diamondMaterials = materials.filter((mat: any) => {
          const matName = String(mat?.name || '').toLowerCase()
          return matName.includes('diamond') || matName.includes('gem')
        })
        diamondMaterials.forEach((diamondMat: any) => {
          diamondPluginRef.current.addDiamond?.(diamondMat)
        })
      }

      // 5. Animate In (Parallel)
      const fadeInPromises: Promise<void>[] = []
      if (updateShank && newShankContainer) fadeInPromises.push(animateOpacity(newShankContainer, 0, 1))
      if (updateHead && newHeadContainer) fadeInPromises.push(animateOpacity(newHeadContainer, 0, 1))

      if (fadeInPromises.length > 0) {
        await Promise.all(fadeInPromises)
      }

      console.log('Load complete')

    } catch (error) {
      console.error('Load error:', error)
    } finally {
      // Ensure viewer updated
      viewer.setDirty?.()
      requestAnimationFrame(() => {
        viewer.setDirty?.()
        if (viewer.scene?.setDirty) viewer.scene.setDirty()
      })
      setTimeout(() => viewer.setDirty?.(), 100)

      setIsLoading(false)
    }
  }, [updateRingRotation, updateRingPosition, setIsLoading])

  useEffect(() => {
    const init = async () => {
      if (!canvasRef.current) {
        return
      }

      const {
        ViewerApp,
        AssetManagerPlugin,
        addBasePlugins,
        DiamondPlugin,
        Object3D,
        Color,
        RandomizedDirectionalLightPlugin,
      } = await import('webgi')

      const viewer = new ViewerApp({ canvas: canvasRef.current })
      viewerRef.current = viewer

      await addBasePlugins(viewer)

      await viewer.addPlugin(RandomizedDirectionalLightPlugin)
      const manager = await viewer.addPlugin(AssetManagerPlugin)
      managerRef.current = manager

      // Initialize DiamondPlugin for enhanced diamond rendering
      const diamondPlugin = await viewer.addPlugin(DiamondPlugin)
      diamondPluginRef.current = diamondPlugin

      object3dRef.current = Object3D

      // Load initial models from query params
      const params = new URLSearchParams(window.location.search)
      const headFile = params.get('headFile')
      const headScale = params.get('headScale')
      const headPosZ = params.get('headPosZ')
      const shankFile = params.get('shankFile')
      const shankScale = params.get('shankScale')
      const shankPosZ = params.get('shankPosZ')
      const metalHex = params.get('metalHex')
      const headMetalHex = params.get('headMetalHex')
      const shankMetalHex = params.get('shankMetalHex')

      const headData = headFile
        ? {
          file: headFile,
          scale: headScale ? parseFloat(headScale) : undefined,
          posZ: headPosZ ? parseFloat(headPosZ) : undefined,
        }
        : null
      const shankData = shankFile
        ? {
          file: shankFile,
          scale: shankScale ? parseFloat(shankScale) : undefined,
          posZ: shankPosZ ? parseFloat(shankPosZ) : undefined,
        }
        : null

      if (headData || shankData) {
        await loadModels(
          viewer,
          manager,
          headData,
          shankData,
          metalHex || undefined,
          headMetalHex || undefined,
          shankMetalHex || undefined
        )
      }
    }

    init()
  }, [loadModels]) // Re-run if loadModels changes (it shouldn't often)

  // Listen for messages from CustomizerPage
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data
      if (data?.type === 'ring-selection' && viewerRef.current && managerRef.current) {
        const headPayload = data.payload?.head
        const shankPayload = data.payload?.shank
        const metalPayload = data.payload?.metalColor

        // Safe check
        if (!managerRef.current || !viewerRef.current) {
          return
        }

        const headData = headPayload?.file
          ? {
            file: headPayload.file,
            scale: headPayload.scale,
            posZ: headPayload.posZ,
            name: headPayload.name || headPayload.label,
          }
          : null

        const shankData = shankPayload?.file
          ? {
            file: shankPayload.file,
            scale: shankPayload.scale,
            posZ: shankPayload.posZ,
            name: shankPayload.name || shankPayload.label,
          }
          : null

        const metalHex = metalPayload?.hexCode
        const headMetalHex = metalPayload?.headHexCode
        const shankMetalHex = metalPayload?.shankHexCode

        loadModels(
          viewerRef.current,
          managerRef.current,
          headData,
          shankData,
          metalHex,
          headMetalHex,
          shankMetalHex
        )
      }
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [loadModels])

  return (
    <section className="page viewer-page">
      <canvas ref={canvasRef} className="viewer-canvas" />
      {isLoading && (
        <div className="viewer-loader">
          <div className="dot-loader">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        </div>
      )}
    </section>
  )
}

export default RingViewerPage