import { useCallback, useEffect, useRef, useState } from 'react'

// ========== RING CONFIGURATION - EASY TO MODIFY ==========
// Change these values to adjust the ring appearance
const RING_ROTATION_X = -0.2  // Tilt ring upward (0 = flat, positive = tilt up, try 0.2 to 0.4)
const RING_ROTATION_Y = 0      // Rotate ring left/right (0 = front view)
const RING_ROTATION_Z = 0      // Roll the ring (0 = normal)
const RING_POSITION_Y = -0.3     // Vertical position (negative = down, try -0.1 to -0.3)
const RING_SCALE_MULTIPLIER = 1.4 // Match legacy viewer sizing
const MATCHING_BAND_GAP = 0.33 // Vertical gap for matching bands above/below center

// Viewer quality settings
const PROGRESSIVE_PLUGIN_SAMPLES = 60
const DISPLAY_CANVAS_SCALING = 1.5
const TONEMAP_CONTRAST = 1.1
const TONEMAP_SATURATION = 1.05
const TEMPORAL_AA_ENABLED = true
const TEMPORAL_AA_USE_TOTAL_FRAME_COUNT = true
const CAMERA_FOV_MOBILE = 65
const ENABLE_MSAA = false
const BACKGROUND_COLOR = '#ffffff'
// =========================================================

const RingViewerPage = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const viewerRef = useRef<any>(null)
    const managerRef = useRef<any>(null)
    const diamondPluginRef = useRef<any>(null)
    const temporalAAPluginRef = useRef<any>(null)
    const object3dRef = useRef<any>(null)
    const colorRef = useRef<any>(null)
    const currentHeadRef = useRef<any>(null)
    const currentShankRef = useRef<any>(null)
    const currentBandRefs = useRef<Array<any | null>>([null, null])
    const currentBandBaseZRefs = useRef<Array<number | null>>([null, null])

    // Track loaded file paths to optimize updates
    const currentHeadFileRef = useRef<string | null>(null)
    const currentShankFileRef = useRef<string | null>(null)
    const currentBandFileRefs = useRef<Array<string | null>>([null, null])
    const lastMatchingBandCountRef = useRef(0)

    // Cache loaded models by file URL to avoid reloading
    // Maps file URL -> array of original mesh objects
    const modelCacheRef = useRef<Map<string, any[]>>(new Map())

    const loadIdRef = useRef(0)
    const [isLoading, setIsLoading] = useState(true)

    // Ring rotation and position state
    const ringRotationRef = useRef({ x: RING_ROTATION_X, y: RING_ROTATION_Y, z: RING_ROTATION_Z })
    const ringPositionRef = useRef({ y: RING_POSITION_Y })

    // Track applied colors to avoid redundant updates
    const lastHeadHexRef = useRef<string | null>(null)
    const lastShankHexRef = useRef<string | null>(null)

    const getBandOffset = (index: number, rotationX = ringRotationRef.current.x) => {
        const signedGap = (index === 0 ? -1 : 1) * MATCHING_BAND_GAP
        return {
            y: Math.cos(rotationX) * signedGap,
            z: Math.sin(rotationX) * signedGap,
        }
    }



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
        const baseY = ringPositionRef.current.y
        currentBandRefs.current.forEach((band, index) => {
            if (!band) return
            band.rotation.set(x, y, z, 'XYZ')
            const offset = getBandOffset(index, x)
            const baseZ = currentBandBaseZRefs.current[index] ?? band.position.z
            band.position.y = baseY + offset.y
            band.position.z = baseZ + offset.z
        })
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
        currentBandRefs.current.forEach((band, index) => {
            if (!band) return
            const offset = getBandOffset(index)
            const baseZ = currentBandBaseZRefs.current[index] ?? band.position.z
            band.position.y = y + offset.y
            band.position.z = baseZ + offset.z
        })
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
        bandData: Array<{ file: string | null; scale?: number; posZ?: number; name?: string } | null> = [null, null],
        matchingBandCount: number = 0,
        metalHex?: string,
        headMetalHex?: string,
        shankMetalHex?: string
    ) => {
        const loadId = (loadIdRef.current += 1)

        // Debounce to prevent rapid double-loading
        if (loadId !== loadIdRef.current) return

        setIsLoading(true)

        try {
            console.log('Starting load...')

            // Helpers
            const hexTo0x = (hex: string): number => {
                const cleaned = hex.replace('#', '')
                return parseInt(cleaned, 16)
            }

            const isDiamond = (name: string) => {
                const n = name.toLowerCase()
                return n.includes('diamond') ||
                    n.includes('gem') ||
                    n.includes('stone')
            }

            const applyColorToModel = (root: any, colorHex: string) => {
                if (!root?.traverse || !colorHex) return

                const ColorCtor = colorRef.current
                const linear = ColorCtor ? new ColorCtor(colorHex).convertSRGBToLinear() : null
                const color0x = hexTo0x(colorHex)

                root.traverse((child: any) => {
                    const materials = Array.isArray(child.material) ? child.material : [child.material]
                    const meshIsDiamond = child.isMesh && isDiamond(child.name || '')

                    if (child.isMesh && materials.length > 0) {
                        materials.forEach((mat: any) => {
                            if (!mat) return
                            const matName = mat.name?.toLowerCase() || ''

                            if (meshIsDiamond || isDiamond(matName)) {
                                return
                            }

                            if (mat.color) {
                                if (linear && typeof mat.color.copy === 'function') {
                                    mat.color.copy(linear)
                                } else if (typeof mat.color.setHex === 'function') {
                                    mat.color.setHex(color0x)
                                }
                                mat.needsUpdate = true
                            }
                        })
                    }
                })
            }

            const refreshDiamonds = (root: any) => {
                if (!root?.traverse || !diamondPluginRef.current) return

                // Use a set to avoid re-registering the same material multiple times in one pass
                const processed = new Set()

                root.traverse((child: any) => {
                    if (child.isMesh) {
                        const meshIsDiamond = isDiamond(child.name || '')
                        const materials = Array.isArray(child.material) ? child.material : [child.material]



                        materials.forEach((mat: any, index: number) => {
                            if (!mat || processed.has(mat.uuid)) return

                            // CRITICAL: Check if already registered in a previous pass to avoid double-processing
                            if (mat.userData?.diamondPluginApplied) {
                                processed.add(mat.uuid)
                                return
                            }

                            // Checking for name corruption or pre-existing suffix from auto-runs
                            const finalName = mat.name || ''
                            const hasSuffix = finalName.includes('_0_1_')

                            if (meshIsDiamond || isDiamond(finalName)) {
                                let targetMat = mat

                                if (finalName.includes('NaN')) {
                                    console.log(`[refreshDiamonds] Corruption detected in "${finalName}". replacing with fresh material.`)
                                    // Clone to detach from any shared cache state
                                    targetMat = mat.clone()
                                    targetMat.name = finalName.split('_0_1_')[0]
                                    targetMat.userData = { ...targetMat.userData, diamondPluginApplied: false }

                                    // Replace in the mesh
                                    if (Array.isArray(child.material)) {
                                        child.material[index] = targetMat
                                    } else {
                                        child.material = targetMat
                                    }
                                } else if (hasSuffix) {
                                    console.log(`[refreshDiamonds] Skipping diamond: Mesh="${child.name}", Mat="${finalName}" (Already processed)`)
                                    processed.add(mat.uuid)
                                    return
                                }

                                console.log(`[refreshDiamonds] Registering diamond: Mesh="${child.name}", Mat="${targetMat.name}"`)
                                diamondPluginRef.current.addDiamond?.(targetMat)
                                targetMat.userData = { ...targetMat.userData, diamondPluginApplied: true }
                                processed.add(targetMat.uuid)
                            }
                        })
                    }
                })
            }



            const disposeObject = (obj: any) => {
                if (!obj) return
                // We ONLY dispose geometries, not materials, because materials might be shared 
                // between Head and Shank (e.g. Diamond material). If we dispose it here, 
                // it breaks the other part of the ring.
                obj.traverse?.((child: any) => {
                    child.geometry?.dispose?.()
                    // DO NOT dispose materials
                })
                obj.parent?.remove?.(obj)
            }

            const setBandVisibility = (count: number) => {
                currentBandRefs.current.forEach((band, index) => {
                    if (!band) return
                    const fileExists = !!currentBandFileRefs.current[index]
                    band.visible = index < count && fileExists
                })
            }

            // Check what needs updating - ONLY if new file is provided
            const updateShank = !!shankData?.file && shankData.file !== currentShankFileRef.current
            const updateHead = !!headData?.file && headData.file !== currentHeadFileRef.current
            const incomingBandFile1 = bandData?.[0]?.file || null
            const incomingBandFile2 = bandData?.[1]?.file || null
            const updateBand1 = incomingBandFile1 !== currentBandFileRefs.current[0]
            const updateBand2 = incomingBandFile2 !== currentBandFileRefs.current[1]
            const matchingBandCountSafe = Math.max(0, Math.min(2, Number(matchingBandCount) || 0))
            const matchingBandCountChanged = matchingBandCountSafe !== lastMatchingBandCountRef.current

            console.log('loadModels called with:', {
                headDataFile: headData?.file,
                shankDataFile: shankData?.file,
                bandFile1: bandData?.[0]?.file,
                bandFile2: bandData?.[1]?.file,
                matchingBandCount: matchingBandCountSafe,
                currentHeadRef: currentHeadFileRef.current,
                currentShankRef: currentShankFileRef.current,
                currentBandFiles: currentBandFileRefs.current,
                updateHead,
                updateShank,
                updateBand1,
                updateBand2,
                loadId
            })

            if (!updateShank && !updateHead && !updateBand1 && !updateBand2 && !matchingBandCountChanged) {
                // Just update colors if needed
                if (metalHex || headMetalHex || shankMetalHex) {
                    const defaultColor = metalHex || '#c2c2c3'
                    if (headMetalHex) applyColorToModel(currentHeadRef.current, headMetalHex)
                    else applyColorToModel(currentHeadRef.current, defaultColor)

                    if (shankMetalHex) applyColorToModel(currentShankRef.current, shankMetalHex)
                    else applyColorToModel(currentShankRef.current, defaultColor)

                    currentBandRefs.current.forEach((band) => {
                        if (!band) return
                        if (shankMetalHex) applyColorToModel(band, shankMetalHex)
                        else applyColorToModel(band, defaultColor)
                    })

                    viewer.setDirty?.()
                }
                console.log('No model updates needed, only colors applied if any.')
                setIsLoading(false)
                return
            }

            if (!updateShank && !updateHead && !updateBand1 && !updateBand2 && matchingBandCountChanged) {
                setBandVisibility(matchingBandCountSafe)
                lastMatchingBandCountRef.current = matchingBandCountSafe
                viewer.setDirty?.()
                setIsLoading(false)
                return
            }




            // Dispose old models immediately
            if (updateShank && currentShankRef.current) {
                console.log('Disposing old shank:', currentShankFileRef.current)
                // CRITICAL: Remove from scene FIRST, then dispose
                if (currentShankRef.current.parent) {
                    currentShankRef.current.parent.remove(currentShankRef.current)
                }
                disposeObject(currentShankRef.current)
                currentShankRef.current = null
                currentShankFileRef.current = null // FORCE RESET to ensure we don't think we have this file if reload fails
            }
            if (updateHead && currentHeadRef.current) {
                console.log('Disposing old head:', currentHeadFileRef.current)
                // CRITICAL: Remove from scene FIRST, then dispose
                if (currentHeadRef.current.parent) {
                    currentHeadRef.current.parent.remove(currentHeadRef.current)
                }
                disposeObject(currentHeadRef.current)
                currentHeadRef.current = null
                currentHeadFileRef.current = null // FORCE RESET
            }
            if (updateBand1 && currentBandRefs.current[0]) {
                console.log('Disposing old matching band 1:', currentBandFileRefs.current[0])
                if (currentBandRefs.current[0].parent) {
                    currentBandRefs.current[0].parent.remove(currentBandRefs.current[0])
                }
                disposeObject(currentBandRefs.current[0])
                currentBandRefs.current[0] = null
                currentBandFileRefs.current[0] = null
                currentBandBaseZRefs.current[0] = null
            }
            if (updateBand2 && currentBandRefs.current[1]) {
                console.log('Disposing old matching band 2:', currentBandFileRefs.current[1])
                if (currentBandRefs.current[1].parent) {
                    currentBandRefs.current[1].parent.remove(currentBandRefs.current[1])
                }
                disposeObject(currentBandRefs.current[1])
                currentBandRefs.current[1] = null
                currentBandFileRefs.current[1] = null
                currentBandBaseZRefs.current[1] = null
            }

            if (loadId !== loadIdRef.current) {
                console.log('Aborted after dispose due to new load request')
                return
            }

            // 2. Load New Models (Internal Helper)
            const loadPart = async (variant: any, isHead: boolean) => {
                if (!variant?.file) return null
                if (loadId !== loadIdRef.current) return null

                const scene = viewer.scene
                const fileUrl = variant.file

                // Check if we have this model cached
                const cachedMeshes = modelCacheRef.current.get(fileUrl)

                if (cachedMeshes && cachedMeshes.length > 0) {
                    console.log(`[loadPart] Using cached model for ${fileUrl} (${cachedMeshes.length} meshes)`)

                    // Add a small delay to show the loader
                    await new Promise(resolve => setTimeout(resolve, 300))

                    // Check if load was cancelled during delay
                    if (loadId !== loadIdRef.current) {
                        console.log(`Aborted cached load - loadId changed during delay`)
                        return null
                    }

                    // Clone the cached meshes
                    // Helper to clean material
                    // Clone the cached meshes
                    const clonedMeshes: any[] = []
                    cachedMeshes.forEach((originalMesh: any) => {
                        const clonedMesh = originalMesh.clone()

                        // DEEP CLONE MATERIAL to ensure we have a fresh instance 
                        // that hasn't been touched by DiamondPlugin in a previous run
                        if (clonedMesh.material) {
                            if (Array.isArray(clonedMesh.material)) {
                                clonedMesh.material = clonedMesh.material.map((m: any) => {
                                    const newMat = m.clone()
                                    // Clear plugin flag on clone to ensure fresh start if needed
                                    if (newMat.userData) delete newMat.userData.diamondPluginApplied
                                    return newMat
                                })
                            } else {
                                const newMat = clonedMesh.material.clone()
                                if (newMat.userData) delete newMat.userData.diamondPluginApplied
                                clonedMesh.material = newMat
                            }
                        }

                        clonedMeshes.push(clonedMesh)
                    })

                    // Create container and add cloned meshes
                    const Object3D = object3dRef.current
                    const container = Object3D ? new Object3D() : null
                    if (!container) return null

                    container.name = variant?.name || (isHead ? 'head' : 'shank')
                    const baseScale = typeof variant?.scale === 'number' ? variant.scale : 0.17
                    const finalScale = baseScale * RING_SCALE_MULTIPLIER
                    container.scale.set(finalScale, finalScale, finalScale)
                    if (typeof variant?.posZ === 'number') container.position.z = variant.posZ

                    const { x, y, z } = ringRotationRef.current
                    container.rotation.set(x, y, z, 'XYZ')

                    clonedMeshes.forEach(mesh => container.add(mesh))

                    console.log(`[loadPart] Created container with ${clonedMeshes.length} cloned meshes`)
                    return container
                }

                // Not cached - load from file
                console.log(`[loadPart] Loading ${fileUrl} for the first time`)

                // Capture existing meshes to diff
                const before = new Set<any>()
                scene.traverse((o: any) => {
                    if (o.type === 'Mesh' || o.type === 'SkinnedMesh') before.add(o)
                })
                const beforeSceneChildren = new Set<any>(scene.children || [])

                const removeAddedMeshes = () => {
                    const leakedRoots = (scene.children || []).filter((child: any) => !beforeSceneChildren.has(child))
                    leakedRoots.forEach((child: any) => {
                        scene.remove(child)
                    })
                    if (leakedRoots.length > 0) {
                        console.log(`[loadPart] Removed ${leakedRoots.length} leaked scene roots for cancelled load: ${fileUrl}`)
                    }
                }

                console.log(`[loadPart] Before loading ${fileUrl}: ${before.size} meshes in scene`)

                // For HEAD models, disable importing scene settings (lights, cameras, env) 
                // to prevent overriding the SHANK's environment/ground settings.
                const options = isHead ? {
                    importCameras: false,
                    importLights: false,
                    // If the viewer uses specific config loading which might be triggered by GLB extras
                    useConfig: false,
                    autoScale: false,
                } : undefined

                console.log(`[loadPart] Loading ${fileUrl} with options:`, options)
                await manager.addFromPath(fileUrl, options)

                if (loadId !== loadIdRef.current) {
                    console.log(`Aborted loading part ${fileUrl} - loadId changed`)
                    removeAddedMeshes()
                    return null
                }

                const added: any[] = []
                scene.traverse((o: any) => {
                    if ((o.type === 'Mesh' || o.type === 'SkinnedMesh') && !before.has(o)) {
                        added.push(o)
                    }
                })

                console.log(`[loadPart] After loading ${fileUrl}: found ${added.length} new meshes`)

                if (added.length === 0) {
                    console.error(`[loadPart] No meshes found after loading ${fileUrl} - file may be invalid`)
                    return null
                }

                // Cache the loaded meshes for future use
                console.log(`[loadPart] Caching ${added.length} meshes for ${fileUrl}`)

                // DEEP CLONE for cache storage
                const cacheEntry = added.map((mesh: any) => {
                    const m = mesh.clone()
                    if (m.material) {
                        if (Array.isArray(m.material)) {
                            m.material = m.material.map((mat: any) => mat.clone())
                        } else {
                            m.material = m.material.clone()
                        }
                    }
                    return m
                })

                modelCacheRef.current.set(fileUrl, cacheEntry)

                // No sanitization needed for fresh meshes here, refreshDiamonds will handle them


                // Container setup
                const Object3D = object3dRef.current
                const container = Object3D ? new Object3D() : null
                if (!container) {
                    removeAddedMeshes()
                    return null // Should not happen
                }

                container.name = variant?.name || (isHead ? 'head' : 'shank')
                const baseScale = typeof variant?.scale === 'number' ? variant.scale : 0.17
                const finalScale = baseScale * RING_SCALE_MULTIPLIER
                container.scale.set(finalScale, finalScale, finalScale)
                if (typeof variant?.posZ === 'number') container.position.z = variant.posZ

                const { x, y, z } = ringRotationRef.current
                container.rotation.set(x, y, z, 'XYZ')

                // Move meshes to container
                added.forEach(mesh => container.add(mesh))

                return container
            }

            // 3. Load New Models (sequentially to avoid scene-diff overlap between parts)
            let newShankContainer: any = null
            let newHeadContainer: any = null
            let newBandContainer1: any = null
            let newBandContainer2: any = null

            if (updateShank && shankData?.file) {
                newShankContainer = await loadPart(shankData, false)
                if (loadId !== loadIdRef.current) {
                    console.log('Aborted after shank load - loadId changed')
                    return
                }
            }

            if (updateHead && headData?.file) {
                newHeadContainer = await loadPart(headData, true)
                if (loadId !== loadIdRef.current) {
                    console.log('Aborted after head load - loadId changed')
                    return
                }
            }

            if (updateBand1 && bandData?.[0]?.file) {
                newBandContainer1 = await loadPart(bandData[0], false)
                if (loadId !== loadIdRef.current) {
                    console.log('Aborted after band 1 load - loadId changed')
                    return
                }
            }

            if (updateBand2 && bandData?.[1]?.file) {
                newBandContainer2 = await loadPart(bandData[1], false)
                if (loadId !== loadIdRef.current) {
                    console.log('Aborted after band 2 load - loadId changed')
                    return
                }
            }

            if (newShankContainer || newHeadContainer || newBandContainer1 || newBandContainer2 || updateBand1 || updateBand2) {
                // Add both to scene in a single commit so they appear together
                const scene = viewer.scene
                const posY = ringPositionRef.current.y

                console.log(`[loadModels] Setting position.y to ${posY} before adding to scene`)

                if (newShankContainer) {
                    // Ensure position is set before adding to scene
                    newShankContainer.position.y = posY
                    console.log(`[loadModels] Shank position before add:`, newShankContainer.position.y)
                    scene.add(newShankContainer)
                    console.log(`[loadModels] Shank position after add:`, newShankContainer.position.y)
                    currentShankRef.current = newShankContainer
                    currentShankFileRef.current = shankData!.file



                    console.log('Shank updated successfully:', shankData!.file)
                }

                if (newHeadContainer) {
                    // Ensure position is set before adding to scene
                    newHeadContainer.position.y = posY
                    console.log(`[loadModels] Head position before add:`, newHeadContainer.position.y)
                    scene.add(newHeadContainer)
                    console.log(`[loadModels] Head position after add:`, newHeadContainer.position.y)
                    currentHeadRef.current = newHeadContainer
                    currentHeadFileRef.current = headData!.file



                    console.log('Head updated successfully:', headData!.file)
                }

                const setBandPlacement = (container: any, index: number, posZ?: number) => {
                    if (!container) return
                    const { x, y, z } = ringRotationRef.current
                    container.rotation.set(x, y, z, 'XYZ')
                    const baseZ = typeof posZ === 'number' ? posZ : (container.position.z || 0)
                    currentBandBaseZRefs.current[index] = baseZ
                    const offset = getBandOffset(index, x)
                    container.position.y = posY + offset.y
                    container.position.z = baseZ + offset.z
                }

                if (newBandContainer1) {
                    setBandPlacement(newBandContainer1, 0, bandData?.[0]?.posZ)
                    scene.add(newBandContainer1)
                    currentBandRefs.current[0] = newBandContainer1
                    currentBandFileRefs.current[0] = bandData?.[0]?.file || null
                    console.log('Matching band 1 updated successfully:', bandData?.[0]?.file)
                } else if (updateBand1 && !bandData?.[0]?.file) {
                    currentBandRefs.current[0] = null
                    currentBandFileRefs.current[0] = null
                    currentBandBaseZRefs.current[0] = null
                }

                if (newBandContainer2) {
                    setBandPlacement(newBandContainer2, 1, bandData?.[1]?.posZ)
                    scene.add(newBandContainer2)
                    currentBandRefs.current[1] = newBandContainer2
                    currentBandFileRefs.current[1] = bandData?.[1]?.file || null
                    console.log('Matching band 2 updated successfully:', bandData?.[1]?.file)
                } else if (updateBand2 && !bandData?.[1]?.file) {
                    currentBandRefs.current[1] = null
                    currentBandFileRefs.current[1] = null
                    currentBandBaseZRefs.current[1] = null
                }
            }

            if (loadId !== loadIdRef.current) return

            // 4. Apply Properties (Colors, etc)
            // Smart update: only apply color if model changed OR color changed
            const targetHeadHex = headMetalHex || metalHex || '#c2c2c3'
            const targetShankHex = shankMetalHex || metalHex || '#c2c2c3'

            // Check if we need to update head color
            if (currentHeadRef.current) {
                const headColorChanged = targetHeadHex !== lastHeadHexRef.current
                if (updateHead || headColorChanged) {
                    console.log(`[loadModels] Applying color ${targetHeadHex} to head (update=${updateHead}, changed=${headColorChanged})`)
                    applyColorToModel(currentHeadRef.current, targetHeadHex)
                    lastHeadHexRef.current = targetHeadHex
                }
            }

            // Check if we need to update shank color
            if (currentShankRef.current) {
                const shankColorChanged = targetShankHex !== lastShankHexRef.current
                if (updateShank || shankColorChanged) {
                    console.log(`[loadModels] Applying color ${targetShankHex} to shank (update=${updateShank}, changed=${shankColorChanged})`)
                    applyColorToModel(currentShankRef.current, targetShankHex)
                    lastShankHexRef.current = targetShankHex
                }
            }

            currentBandRefs.current.forEach((band, index) => {
                if (!band) return
                if (updateBand1 || updateBand2 || updateShank || targetShankHex !== lastShankHexRef.current) {
                    applyColorToModel(band, targetShankHex)
                }
                const fileExists = !!currentBandFileRefs.current[index]
                band.visible = index < matchingBandCountSafe && fileExists
            })

            lastMatchingBandCountRef.current = matchingBandCountSafe

            viewer.renderer?.refreshPipeline?.()
            viewer.setDirty?.()

            // 5. Restore Environment & Diamonds
            if (viewer.scene) {


                // Fallback: Check everything just in case something was missed or not in the new containers
                if (diamondPluginRef.current) {
                    // Scan the entire scene materials as a backup using the new traversal helper
                    // Note: viewer.scene is an Object3D so traversal works
                    refreshDiamonds(viewer.scene)
                    try {
                        await diamondPluginRef.current.refresh?.()
                    } catch (e) { }
                }
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
        let viewerInstance: any = null
        let isMounted = true
        const cleanupStack: Array<() => void> = []

        const init = async () => {
            if (!canvasRef.current) {
                return
            }

            const webgi = await import('webgi') as any
            const {
                ViewerApp,
                AssetManagerPlugin,
                GBufferPlugin,
                ProgressivePlugin,
                TonemapPlugin,
                DiamondPlugin,
                TemporalAAPlugin,
                RandomizedDirectionalLightPlugin,
                mobileAndTabletCheck,
                Color,
                Object3D,
            } = webgi

            colorRef.current = Color

            if (!isMounted) return

            const viewer = new ViewerApp({
                canvas: canvasRef.current,
                useGBufferDepth: true,
                isAntialiased: ENABLE_MSAA,
            } as any)

            const viewerAny = viewer as any
            const renderer = viewerAny.renderer
            if (renderer && typeof renderer.displayCanvasScaling !== 'undefined') {
                renderer.displayCanvasScaling = Math.min(window.devicePixelRatio || 1, DISPLAY_CANVAS_SCALING)
            }
            viewerInstance = viewer
            viewerRef.current = viewer

            const manager = await viewer.addPlugin(AssetManagerPlugin)
            managerRef.current = manager

            await viewer.addPlugin(GBufferPlugin)
            await viewer.addPlugin(new ProgressivePlugin(PROGRESSIVE_PLUGIN_SAMPLES))
            const tonemapPlugin = await viewer.addPlugin(
                new (TonemapPlugin as any)(true, false, [
                    `// Tonemap pass without vignette`,
                    ``,
                ])
            )
            if (tonemapPlugin?.config) {
                tonemapPlugin.config.contrast = TONEMAP_CONTRAST
                tonemapPlugin.config.saturation = TONEMAP_SATURATION
            }
            const diamondPlugin = await viewer.addPlugin(DiamondPlugin)
            diamondPluginRef.current = diamondPlugin
            await viewer.addPlugin(RandomizedDirectionalLightPlugin as any)

            const temporalAAPlugin = await viewer.addPlugin(TemporalAAPlugin)
            temporalAAPluginRef.current = temporalAAPlugin
            if (temporalAAPlugin) {
                temporalAAPlugin.enabled = TEMPORAL_AA_ENABLED
                temporalAAPlugin.useTotalFrameCount = TEMPORAL_AA_USE_TOTAL_FRAME_COUNT
            }

            const applyPresetCameraView = (name: string) => {
                const activeCamera = viewerRef.current?.scene?.activeCamera as any
                if (!activeCamera?.position) return false

                const controls = activeCamera.controls as any
                const target = (controls && (controls.target || controls._target)) || { x: 0, y: 0, z: 0 }
                const dx = activeCamera.position.x - target.x
                const dy = activeCamera.position.y - target.y
                const dz = activeCamera.position.z - target.z
                const distance = Math.max(0.001, Math.sqrt(dx * dx + dy * dy + dz * dz))

                let dir = { x: 0, y: 0, z: 1 }
                if (name === 'side') dir = { x: 1, y: 0, z: 0 }
                if (name === 'top') dir = { x: 0.15, y: 1, z: 0.15 }

                const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z) || 1
                const nx = dir.x / len
                const ny = dir.y / len
                const nz = dir.z / len

                activeCamera.position.set(
                    target.x + nx * distance,
                    target.y + ny * distance,
                    target.z + nz * distance,
                )

                if (controls?.target?.set) {
                    controls.target.set(target.x, target.y, target.z)
                } else if (controls?._target?.set) {
                    controls._target.set(target.x, target.y, target.z)
                }

                activeCamera.lookAt?.(target)
                viewerRef.current?.setDirty?.()
                return true
            }

            ;(window as any).goToCameraView = async (name: string) => {
                if (!name) return

                applyPresetCameraView(name)
            }

            cleanupStack.push(() => {
                delete (window as any).goToCameraView
            })

            object3dRef.current = Object3D

            if (Color) {
                const bg = new Color(BACKGROUND_COLOR) as any
                const bgLinear = bg.convertSRGBToLinear ? bg.convertSRGBToLinear() : bg
                viewerAny.setBackground?.(bgLinear)
            }

            renderer?.refreshPipeline?.()
            viewer.setDirty?.()

            // Camera / control tuning aligned with legacy viewer
            const cameraView = viewer.scene.activeCamera
            const controls = cameraView?.controls as any

            if (controls) {
                const isMobile = window.innerWidth <= 768
                const minDist = isMobile ? 5.5 : 6.5
                const maxDist = isMobile ? 9.5 : 13

                const clampDistance = () => {
                    try {
                        const tgt = (controls && (controls.target || controls._target)) || { x: 0, y: 0, z: 0 }
                        const dx = cameraView.position.x - tgt.x
                        const dy = cameraView.position.y - tgt.y
                        const dz = cameraView.position.z - tgt.z
                        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.0001
                        if (dist < minDist || dist > maxDist) {
                            const scale = dist < minDist ? (minDist / dist) : (maxDist / dist)
                            cameraView.position.set(
                                tgt.x + dx * scale,
                                tgt.y + dy * scale,
                                tgt.z + dz * scale,
                            )
                            viewerRef.current?.setDirty?.()
                        }
                    } catch (e) { }
                }

                try { controls.enableZoom = true } catch (e) { }
                try { controls.minDistance = minDist } catch (e) { }
                try { controls.maxDistance = maxDist } catch (e) { }
                try { controls.enableDamping = true } catch (e) { }
                try { controls.dampingFactor = 0.07 } catch (e) { }
                try { controls.smoothZoom = true } catch (e) { }
                try { controls.smoothTime = 0.08 } catch (e) { }
                try { controls.zoomSpeed = isMobile ? 0.55 : 0.8 } catch (e) { }
                try { controls.autoRotate = false } catch (e) { }

                // Guard pinch/wheel drift beyond min/max
                try { controls.addEventListener?.('change', clampDistance) } catch (e) { }
                cleanupStack.push(() => {
                    try { controls.removeEventListener?.('change', clampDistance) } catch (e) { }
                })
            }

            // Wheel guard to respect min/max distance
            const CONTROL_MIN_DISTANCE = window.innerWidth <= 768 ? 5.5 : 6.5
            const CONTROL_MAX_DISTANCE = window.innerWidth <= 768 ? 9.5 : 13
            const EPS = 0.01
            const canvasEl = canvasRef.current
            if (canvasEl) {
                const wheelHandler = (ev: WheelEvent) => {
                    try {
                        const ctrl: any = cameraView?.controls
                        const tgt = (ctrl && (ctrl.target || ctrl._target)) || { x: 0, y: 0, z: 0 }
                        const dx = cameraView.position.x - tgt.x
                        const dy = cameraView.position.y - tgt.y
                        const dz = cameraView.position.z - tgt.z
                        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
                        if (ev.deltaY < 0 && dist <= CONTROL_MIN_DISTANCE + EPS) {
                            ev.preventDefault()
                            ev.stopImmediatePropagation()
                            return
                        }
                        if (ev.deltaY > 0 && dist >= CONTROL_MAX_DISTANCE - EPS) {
                            ev.preventDefault()
                            ev.stopImmediatePropagation()
                            return
                        }
                    } catch (e) { }
                }
                canvasEl.addEventListener('wheel', wheelHandler, { passive: false, capture: true })
                cleanupStack.push(() => canvasEl.removeEventListener('wheel', wheelHandler, { capture: true } as any))

                // Block right-click drag from orbiting
                let rightBtnDown = false
                const onPointerDown = (e: PointerEvent) => {
                    if (e.button === 2) {
                        rightBtnDown = true
                        e.preventDefault()
                        e.stopImmediatePropagation()
                    }
                }
                const onPointerMove = (e: PointerEvent) => {
                    if (rightBtnDown) {
                        e.preventDefault()
                        e.stopImmediatePropagation()
                    }
                }
                const onPointerUp = (e: PointerEvent) => {
                    if (e.button === 2) {
                        rightBtnDown = false
                        e.preventDefault()
                        e.stopImmediatePropagation()
                    }
                }
                const onContext = (ev: Event) => {
                    ev.preventDefault()
                }
                canvasEl.addEventListener('pointerdown', onPointerDown, { passive: false, capture: true })
                canvasEl.addEventListener('pointermove', onPointerMove, { passive: false, capture: true })
                canvasEl.addEventListener('pointerup', onPointerUp, { passive: false, capture: true })
                canvasEl.addEventListener('contextmenu', onContext, { capture: true })

                cleanupStack.push(() => {
                    canvasEl.removeEventListener('pointerdown', onPointerDown, { capture: true } as any)
                    canvasEl.removeEventListener('pointermove', onPointerMove, { capture: true } as any)
                    canvasEl.removeEventListener('pointerup', onPointerUp, { capture: true } as any)
                    canvasEl.removeEventListener('contextmenu', onContext, { capture: true } as any)
                })
            }

            if (mobileAndTabletCheck?.()) {
                cameraView?.setCameraOptions?.({ fov: CAMERA_FOV_MOBILE })
            }

            // Load initial models from query params
            const params = new URLSearchParams(window.location.search)
            const headFile = params.get('headFile')
            const headScale = params.get('headScale')
            const headPosZ = params.get('headPosZ')
            const shankFile = params.get('shankFile')
            const shankScale = params.get('shankScale')
            const shankPosZ = params.get('shankPosZ')
            const bandFile1 = params.get('bandFile1')
            const bandFile2 = params.get('bandFile2')
            const matchingBandCountParam = params.get('matchingBandCount')
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
            const matchingBandCount = Math.max(0, Math.min(2, Number(matchingBandCountParam) || 0))
            const bandData = [
                bandFile1
                    ? {
                        file: bandFile1,
                        scale: shankScale ? parseFloat(shankScale) : undefined,
                        posZ: shankPosZ ? parseFloat(shankPosZ) : undefined,
                    }
                    : null,
                bandFile2
                    ? {
                        file: bandFile2,
                        scale: shankScale ? parseFloat(shankScale) : undefined,
                        posZ: shankPosZ ? parseFloat(shankPosZ) : undefined,
                    }
                    : null,
            ]

            if (headData || shankData || bandData[0] || bandData[1]) {
                await loadModels(
                    viewer,
                    manager,
                    headData,
                    shankData,
                    bandData,
                    matchingBandCount,
                    metalHex || undefined,
                    headMetalHex || undefined,
                    shankMetalHex || undefined
                )
            }

            cleanupStack.push(() => {
                viewer.dispose?.()
            })
        }

        init()

        return () => {
            isMounted = false
            cleanupStack.forEach(fn => {
                try { fn() } catch (e) { }
            })
            if (viewerInstance) {
                viewerInstance.dispose?.()
                viewerInstance = null
            }
            viewerRef.current = null
            managerRef.current = null
            temporalAAPluginRef.current = null
        }
    }, [loadModels]) // Re-run if loadModels changes (it shouldn't often)

    // Listen for messages from CustomizerPage
    useEffect(() => {
        const handler = (event: MessageEvent) => {
            const data = event.data
            if (data?.type === 'ring-selection' && viewerRef.current && managerRef.current) {
                console.log('[RingViewerPage] Received ring-selection message:', data.payload)

                const headPayload = data.payload?.head
                const shankPayload = data.payload?.shank
                const metalPayload = data.payload?.metalColor
                const matchingBandCount = Math.max(0, Math.min(2, Number(data.payload?.matchingBandCount) || 0))

                // Safe check
                if (!managerRef.current || !viewerRef.current) {
                    console.warn('[RingViewerPage] Manager or viewer not ready')
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

                const bandData = [
                    shankPayload?.matchingBandFile1
                        ? {
                            file: shankPayload.matchingBandFile1,
                            scale: shankPayload.scale,
                            posZ: shankPayload.posZ,
                            name: `${shankPayload.name || shankPayload.label || 'shank'}-band-1`,
                        }
                        : null,
                    shankPayload?.matchingBandFile2
                        ? {
                            file: shankPayload.matchingBandFile2,
                            scale: shankPayload.scale,
                            posZ: shankPayload.posZ,
                            name: `${shankPayload.name || shankPayload.label || 'shank'}-band-2`,
                        }
                        : null,
                ]

                const metalHex = metalPayload?.hexCode
                const headMetalHex = metalPayload?.headHexCode
                const shankMetalHex = metalPayload?.shankHexCode

                console.log('[RingViewerPage] Calling loadModels with:', {
                    headFile: headData?.file,
                    shankFile: shankData?.file,
                    bandFile1: bandData[0]?.file,
                    bandFile2: bandData[1]?.file,
                    matchingBandCount,
                    metalHex,
                    headMetalHex,
                    shankMetalHex
                })

                loadModels(
                    viewerRef.current,
                    managerRef.current,
                    headData,
                    shankData,
                    bandData,
                    matchingBandCount,
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
            <canvas
                ref={canvasRef}
                className="viewer-canvas"
                style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.2s ease' }}
            />
            {isLoading && (
                <div className="viewer-loader">
                    <div className="dot-loader">
                        <div className="dot"></div>
                        <div className="dot"></div>
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