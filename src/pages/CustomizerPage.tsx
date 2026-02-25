import { useEffect, useMemo, useRef, useState } from 'react'
import { getRingConfig, type RingConfig, type RingConfigItem } from '../api'
import './CustomizerPage.css'

// Helper for class names
const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ')

type SelectionState = {
    shankId: string
    metalColorId: string
    diamondShapeId: string
    settingStyleId: string
    caratWeightId: string
    matchingBandCount: number // 0, 1, 2
    isTwoTone: boolean
}

type MetalColorOption = RingConfigItem & {
    headHexCode?: string
    shankHexCode?: string
}

const METAL_COLOR_HEX: Record<string, string> = {
    yellow_gold: '#e6b77e',
    white_gold: '#c2c2c3',
    rose_gold: '#f2bd9a',
}

const SHANK_CATEGORY_ORDER: string[] = []

const getLabel = (item?: RingConfigItem) =>
    item?.displayName || item?.name || item?._id || ''

const getId = (value: unknown) => {
    if (!value) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'object' && '_id' in value) {
        const typed = value as { _id?: string }
        return typed._id || ''
    }
    return ''
}

const normalizeColorKey = (value?: string) =>
    (value || '').toLowerCase().replace(/[\s-]+/g, '_')

const getColorKey = (color?: RingConfigItem | null) => {
    if (!color) return ''
    return (
        normalizeColorKey(color.name) ||
        normalizeColorKey(color.displayName) ||
        normalizeColorKey(color._id)
    )
}

const getColorSearchText = (color?: RingConfigItem | null) =>
    [color?.name, color?.displayName, color?._id]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

const canUseTwoToneForColor = (color?: RingConfigItem | null) => {
    if (!color) return false
    const key = getColorKey(color)
    const text = getColorSearchText(color)
    const hex = (color.hexCode || '').toLowerCase()

    const isWhiteLike = key.includes('white') || text.includes('white') || hex === '#c2c2c3'
    const isYellowOrRose =
        key.includes('yellow') ||
        key.includes('rose') ||
        text.includes('yellow') ||
        text.includes('rose') ||
        hex === '#e5b477' ||
        hex === '#f2af83'

    return !isWhiteLike && isYellowOrRose
}

const isWhiteGoldColor = (color?: RingConfigItem | null) => {
    if (!color) return false
    const key = getColorKey(color)
    const text = getColorSearchText(color)
    const hex = (color.hexCode || '').toLowerCase()
    return key.includes('white') || text.includes('white') || hex === '#c2c2c3'
}

const CustomizerPage = () => {
    const [config, setConfig] = useState<RingConfig | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [selection, setSelection] = useState<SelectionState | null>(null)
    const [activeShankCategory, setActiveShankCategory] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)

    // Carousel refs
    const headCarouselRef = useRef<HTMLDivElement>(null)
    const shapeCarouselRef = useRef<HTMLDivElement>(null)
    const shankCategoryRef = useRef<HTMLDivElement>(null)
    const headIgnoreClickRef = useRef(false)
    const shapeIgnoreClickRef = useRef(false)
    const shankCatIgnoreClickRef = useRef(false)

    const colorOptions = useMemo<MetalColorOption[]>(() => {
        if (!config) return []
        const normalized = config.colors.map((color) => {
            const overrideHex = METAL_COLOR_HEX[getColorKey(color)]
            return {
                ...color,
                hexCode: overrideHex || color.hexCode,
            }
        })
        return [...normalized]
    }, [config])

    const shankCategories = useMemo(() => {
        if (!config) return [] as string[]
        const seen = new Set<string>()
        const ordered: string[] = []

        const add = (cat?: string | null) => {
            const value = cat || 'Most Popular'
            if (seen.has(value)) return
            seen.add(value)
            ordered.push(value)
        }

        const categoriesFromApi = (config.shankCategories || [])
            .filter(c => c.active !== false)
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            .map(c => c.displayName || c.name)

        categoriesFromApi.forEach(add)

        if (ordered.length === 0) {
            SHANK_CATEGORY_ORDER.forEach(add)
            config.shanks.forEach((s) => add((s as any)?.category as string))
        }

        return ordered
    }, [config])

    const diamondShapes = useMemo(() => {
        if (!config) return [] as RingConfigItem[]
        const seen = new Set<string>()
        const unique: RingConfigItem[] = []

        config.diamondShapes.forEach((shape) => {
            const key = getId(shape) || (shape.displayName || shape.name || '').toLowerCase()
            if (!key || seen.has(key)) return
            seen.add(key)
            unique.push(shape)
        })

        return unique
    }, [config])

    // Initial load
    useEffect(() => {
        let isMounted = true
        setIsLoading(true)
        getRingConfig()
            .then((data) => {
                if (!isMounted) return

                setConfig(data)

                // Find default head/shank to initialize
                // Choose a shank first, then choose a head that supports that shank
                // so the first payload is already valid and doesn't trigger an immediate head swap.
                const initialShank = data.shanks.find((s: any) => s.isDefault) || data.shanks[0]
                const supportsShank = (head: any, shankId: string) => {
                    const headShankId = getId(head?.shank)
                    const headShanks = Array.isArray(head?.shanks) ? head.shanks.map((s: any) => getId(s)) : []
                    return headShankId === shankId || headShanks.includes(shankId)
                }

                const defaultHead = data.heads.find((h: any) => h.isDefault)
                const initialHead = initialShank
                    ? (defaultHead && supportsShank(defaultHead, initialShank._id)
                        ? defaultHead
                        : data.heads.find((h: any) => supportsShank(h, initialShank._id)) || data.heads[0])
                    : (defaultHead || data.heads[0])
                const initialColor = data.colors.find((c: any) => c.displayName?.toLowerCase().includes('white')) || data.colors[0]

                // If we found a head, use its properties
                const initialShapeId = getId(initialHead?.diamondShape) || data.diamondShapes[0]?._id
                const initialSettingId = getId(initialHead?.settingStyle) || data.settingStyles[0]?._id
                const initialCaratId = getId(initialHead?.caratWeight) || data.caratWeights[0]?._id

                if (initialHead && initialShank) {
                    setSelection({
                        shankId: initialShank._id,
                        metalColorId: initialColor?._id,
                        diamondShapeId: initialShapeId,
                        settingStyleId: initialSettingId,
                        caratWeightId: initialCaratId,
                        matchingBandCount: 0,
                        isTwoTone: false
                    })
                    const initialCategory = (initialShank as any)?.category || 'Most Popular'
                    setActiveShankCategory(initialCategory)
                }
                setIsLoading(false)
            })
            .catch((err) => {
                if (!isMounted) return
                setError(err instanceof Error ? err.message : 'Failed to load config')
                setIsLoading(false)
            })

        return () => { isMounted = false }
    }, [])

    // Helper to update state partially
    const updateSelection = (updates: Partial<SelectionState>) => {
        setSelection(prev => prev ? ({ ...prev, ...updates }) : null)
    }

    // Keep category in sync with selected shank
    useEffect(() => {
        if (!config || !selection) return
        const currentShank = config.shanks.find(s => s._id === selection.shankId)
        const category = (currentShank as any)?.category || 'Most Popular'
        setActiveShankCategory(category)
    }, [config, selection?.shankId])

    // Handle Setting Style Click (Special Logic from Final Project)
    const handleSettingClick = (settingId: string) => {
        if (!config || !selection) return

        // Find a head that matches Current Shape + Current Carat + NEW Setting
        const matchingHead = config.heads.find(h => {
            return getId(h.diamondShape) === selection.diamondShapeId &&
                getId(h.settingStyle) === settingId &&
                getId(h.caratWeight) === selection.caratWeightId
        })

        if (matchingHead) {
            const newShankId = getId(matchingHead.shank) ||
                (Array.isArray(matchingHead.shanks) ? getId(matchingHead.shanks[0]) : '') ||
                selection.shankId

            updateSelection({
                settingStyleId: settingId,
                shankId: newShankId
            })
        }
    }

    // Effect to ensure valid combinations (and auto-select valid setting if needed)
    useEffect(() => {
        if (!config || !selection) return

        // Check if current Setting is valid for new Shape/Carat/Shank
        const isValid = config.heads.some(h =>
            (getId(h.shank) === selection.shankId || (Array.isArray(h.shanks) && h.shanks.map((s: any) => getId(s)).includes(selection.shankId))) &&
            getId(h.diamondShape) === selection.diamondShapeId &&
            getId(h.caratWeight) === selection.caratWeightId &&
            getId(h.settingStyle) === selection.settingStyleId
        )

        if (!isValid) {
            // Try to find a valid head for this Shape+Carat+Shank combo first
            let validHead = config.heads.find(h =>
                (getId(h.shank) === selection.shankId || (Array.isArray(h.shanks) && h.shanks.map((s: any) => getId(s)).includes(selection.shankId))) &&
                getId(h.diamondShape) === selection.diamondShapeId &&
                getId(h.caratWeight) === selection.caratWeightId
            )

            // If not found for curren shank, find ANY head for Shape+Carat (relaxed)
            if (!validHead) {
                validHead = config.heads.find(h =>
                    getId(h.diamondShape) === selection.diamondShapeId &&
                    getId(h.caratWeight) === selection.caratWeightId
                )
            }

            if (validHead) {
                const newSettingId = getId(validHead.settingStyle)
                if (newSettingId && newSettingId !== selection.settingStyleId) {
                    updateSelection({ settingStyleId: newSettingId })
                }
            }
        }
    }, [selection?.diamondShapeId, selection?.caratWeightId, config])

    const payload = useMemo(() => {
        if (!config || !selection) return null

        const shank = config.shanks.find((item) => item._id === selection.shankId)

        // Find the Head based on Shape + Carat + Setting + Shank
        const head = config.heads.find(h => {
            const hShankId = getId(h.shank)
            const hShanks = Array.isArray(h.shanks) ? h.shanks.map((s: any) => getId(s)) : []
            const supportsShank = hShankId === selection.shankId || hShanks.includes(selection.shankId)

            return supportsShank &&
                getId(h.diamondShape) === selection.diamondShapeId &&
                getId(h.settingStyle) === selection.settingStyleId &&
                getId(h.caratWeight) === selection.caratWeightId
        })

        const baseMetalColor = colorOptions.find((item) => item._id === selection.metalColorId)
        const diamondShape = diamondShapes.find((item) => item._id === selection.diamondShapeId)
        const caratWeight = config.caratWeights.find((item) => item._id === selection.caratWeightId)
        const settingStyle = config.settingStyles.find((item) => item._id === selection.settingStyleId)

        let finalMetalPayload = null
        if (baseMetalColor) {
            if (selection.isTwoTone) {
                const whiteGold = colorOptions.find(c => isWhiteGoldColor(c))
                const whiteHex = whiteGold?.hexCode || '#c2c2c3'

                finalMetalPayload = {
                    id: `two-tone-${baseMetalColor._id}`,
                    label: `Two-Tone ${getLabel(baseMetalColor)}`,
                    hexCode: baseMetalColor.hexCode,
                    headHexCode: whiteHex,
                    shankHexCode: baseMetalColor.hexCode
                }
            } else {
                finalMetalPayload = {
                    id: baseMetalColor._id,
                    label: getLabel(baseMetalColor),
                    hexCode: baseMetalColor.hexCode
                }
            }
        }

        return {
            head: head ? {
                id: head._id,
                label: getLabel(head),
                file: head.file,
                scale: head.scale,
                posZ: head.posZ,
            } : null,
            shank: shank ? {
                id: shank._id,
                label: getLabel(shank),
                file: shank.file,
                matchingBandFile1: shank.matchingBandFile1,
                matchingBandFile2: shank.matchingBandFile2,
                scale: shank.scale,
                posZ: shank.posZ,
            } : null,
            metalColor: finalMetalPayload,
            diamondShape: diamondShape ? { id: diamondShape._id, label: getLabel(diamondShape) } : null,
            settingStyle: settingStyle ? { id: settingStyle._id, label: getLabel(settingStyle) } : null,
            caratWeight: caratWeight ? { id: caratWeight._id, label: getLabel(caratWeight) } : null,
            matchingBandCount: selection.matchingBandCount
        }
    }, [config, selection, colorOptions, diamondShapes])

    useEffect(() => {
        if (!payload) return
        window.parent.postMessage({ type: 'ring-selection', payload }, window.location.origin)
    }, [payload])

    const scrollCarousel = (
        ref: { current: HTMLDivElement | null },
        direction: 'left' | 'right',
        kind: 'head' | 'shape' = 'head'
    ) => {
        const carousel = ref.current
        if (!carousel) return

        const amount = 200
        const scrollLeft = carousel.scrollLeft
        const scrollWidth = carousel.scrollWidth
        const clientWidth = carousel.clientWidth
        const atEnd = scrollLeft >= scrollWidth - clientWidth - 10
        const atStart = scrollLeft <= 10

        if (kind === 'head' && shankCategories.length > 0) {
            const currentIdx = shankCategories.findIndex(c => c === activeShankCategory)
            if (direction === 'right' && atEnd && currentIdx !== -1) {
                const isLast = currentIdx === shankCategories.length - 1
                const nextCategory = isLast ? shankCategories[0] : shankCategories[currentIdx + 1]
                setActiveCategory(nextCategory)
                requestAnimationFrame(() => {
                    ref.current?.scrollTo({ left: 0, behavior: 'smooth' })
                })
                return
            }
            if (direction === 'left' && atStart && currentIdx !== -1) {
                const isFirst = currentIdx === 0
                const prevCategory = isFirst ? shankCategories[shankCategories.length - 1] : shankCategories[currentIdx - 1]
                setActiveCategory(prevCategory)
                requestAnimationFrame(() => {
                    const target = ref.current
                    if (!target) return
                    target.scrollTo({ left: target.scrollWidth, behavior: 'smooth' })
                })
                return
            }
        }

        if (kind === 'shape') {
            if (direction === 'right' && atEnd) {
                carousel.scrollTo({ left: 0, behavior: 'smooth' })
                return
            }
            if (direction === 'left' && atStart) {
                carousel.scrollTo({ left: scrollWidth, behavior: 'smooth' })
                return
            }
        }

        if (direction === 'right') {
            carousel.scrollBy({ left: amount, behavior: 'smooth' })
        } else {
            carousel.scrollBy({ left: -amount, behavior: 'smooth' })
        }
    }

    // Enable click-drag scrolling on carousels (runs after config mounts so refs exist)
    useEffect(() => {
        if (!config) return

        const attachDrag = (
            ref: React.RefObject<HTMLDivElement | null>,
            ignoreClickRef: React.MutableRefObject<boolean>
        ) => {
            const el = ref.current
            if (!el) return () => {}

            let isDown = false
            let isDragging = false
            let startX = 0
            let startScroll = 0

            const onPointerDown = (e: PointerEvent) => {
                if (e.button !== 0) return
                isDown = true
                isDragging = false
                startX = e.clientX
                startScroll = el.scrollLeft
                // add dragging class lazily after threshold
            }

            const onPointerMove = (e: PointerEvent) => {
                if (!isDown) return
                const delta = e.clientX - startX
                if (!isDragging && Math.abs(delta) > 4) {
                    isDragging = true
                    el.classList.add('is-dragging')
                }
                if (isDragging) {
                    el.scrollLeft = startScroll - delta
                }
            }

            const endDrag = () => {
                if (!isDown) return
                isDown = false
                if (isDragging) {
                    ignoreClickRef.current = true
                    window.setTimeout(() => { ignoreClickRef.current = false }, 80)
                }
                el.classList.remove('is-dragging')
                isDragging = false
            }

            el.addEventListener('pointerdown', onPointerDown)
            el.addEventListener('pointermove', onPointerMove)
            el.addEventListener('pointerup', endDrag)
            el.addEventListener('pointercancel', endDrag)
            el.addEventListener('pointerleave', endDrag)

            return () => {
                el.removeEventListener('pointerdown', onPointerDown)
                el.removeEventListener('pointermove', onPointerMove)
                el.removeEventListener('pointerup', endDrag)
                el.removeEventListener('pointercancel', endDrag)
                el.removeEventListener('pointerleave', endDrag)
            }
        }

        const cleanHead = attachDrag(headCarouselRef, headIgnoreClickRef)
        const cleanShape = attachDrag(shapeCarouselRef, shapeIgnoreClickRef)
        const cleanShankCat = attachDrag(shankCategoryRef, shankCatIgnoreClickRef)

        return () => {
            cleanHead?.()
            cleanShape?.()
            cleanShankCat?.()
        }
    }, [config])

    const scrollCategoryIntoView = (category: string) => {
        const container = shankCategoryRef.current
        if (!container) return
        const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-category]'))
        const target = buttons.find(b => b.dataset.category === category)
        if (target) {
            const left = target.offsetLeft - 40
            container.scrollTo({ left: Math.max(left, 0), behavior: 'smooth' })
        }
    }

    const setActiveCategory = (category: string) => {
        setActiveShankCategory(category)
        requestAnimationFrame(() => scrollCategoryIntoView(category))
    }

    const handleShankCategoryClick = (category: string) => {
        if (shankCatIgnoreClickRef.current) {
            shankCatIgnoreClickRef.current = false
            return
        }
        setActiveCategory(category)
        if (headCarouselRef.current) {
            headCarouselRef.current.scrollTo({ left: 0, behavior: 'smooth' })
        }
    }

    const canTwoTone = useMemo(() => {
        if (!selection || !colorOptions) return false
        const color = colorOptions.find(c => c._id === selection.metalColorId)
        return canUseTwoToneForColor(color)
    }, [selection, colorOptions])

    const filteredShanks = useMemo(() => {
        if (!config) return []
        if (!activeShankCategory) return config.shanks
        return config.shanks.filter(s => ((s as any)?.category || 'Most Popular') === activeShankCategory)
    }, [config, activeShankCategory])

    const handleToggleTwoTone = () => {
        if (!selection || !canTwoTone) return
        updateSelection({ isTwoTone: !selection.isTwoTone })
    }

    const selectedShank = useMemo(() => {
        if (!config || !selection) return null
        return config.shanks.find((item) => item._id === selection.shankId) || null
    }, [config, selection?.shankId])

    const hasMatchingBand1 = !!selectedShank?.matchingBandFile1
    const hasMatchingBand2 = !!selectedShank?.matchingBandFile2
    const availableMatchingBandCount = (hasMatchingBand1 ? 1 : 0) + (hasMatchingBand2 ? 1 : 0)

    useEffect(() => {
        if (!selection) return
        if (!canTwoTone && selection.isTwoTone) {
            updateSelection({ isTwoTone: false })
        }
    }, [canTwoTone, selection])

    useEffect(() => {
        if (!selection) return
        if (selection.matchingBandCount > availableMatchingBandCount) {
            updateSelection({ matchingBandCount: availableMatchingBandCount })
        }
    }, [selection?.matchingBandCount, availableMatchingBandCount])


    if (error) return <div className="config-panel"><p style={{ color: 'red', padding: 20 }}>{error}</p></div>
    if (!config || !selection) {
        return (
            <div className="config-panel" style={{ position: 'relative', minHeight: '100vh' }}>
                <div className="panel-loader visible">
                    <div className="dot-breath"></div>
                </div>
            </div>
        )
    }

    // HEAD VALIDATION HELPER - Checks if any valid configuration exists
    const hasCombination = (shankId: string | null, shapeId: string | null, settingId: string | null, caratId: string | null) => {
        if (!config) return false
        return config.heads.some(h => {
            const hShankId = getId(h.shank)
            const hShanks = Array.isArray(h.shanks) ? h.shanks.map((s: any) => getId(s)) : []

            const shankOk = shankId ? (hShankId === shankId || hShanks.includes(shankId)) : true
            const shapeOk = shapeId ? getId(h.diamondShape) === shapeId : true
            const settingOk = settingId ? getId(h.settingStyle) === settingId : true
            const caratOk = caratId ? getId(h.caratWeight) === caratId : true

            return shankOk && shapeOk && settingOk && caratOk
        })
    }

    return (
        <section id="customization-panel" className="config-panel">
            {/* Loading Overlay just in case */}
            <div id="panel-loader" className={cn('panel-loader', isLoading ? 'visible' : 'hidden')}>
                <div className="dot-breath"></div>
            </div>

            {/* Ring Style & Design (SHANKS) */}
            <div className="customization-section">
                <div className="section-header">
                    <span className="section-title">Ring Style & Design</span>
                </div>
                <div className="shank-category-wrap">
                    <div className="shank-category-row" ref={shankCategoryRef}>
                        {shankCategories.map(category => (
                            <button
                                key={category}
                                type="button"
                                className={cn('shank-category-pill', activeShankCategory === category && 'active')}
                                data-category={category}
                                onClick={() => handleShankCategoryClick(category)}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="carousel-shell" id="head-options">
                    <button className="carousel-button prev" onClick={() => scrollCarousel(headCarouselRef, 'left', 'head')}>❮</button>
                    <div className="carousel" ref={headCarouselRef}>
                        {filteredShanks.map((shank, index) => {
                            const available = hasCombination(shank._id, selection.diamondShapeId, selection.settingStyleId, selection.caratWeightId)
                            return (
                                <div
                                    key={shank._id}
                                    className={cn("ring-design-card", selection.shankId === shank._id && "active", !available && "disabled")}
                                    onClick={() => {
                                        if (headIgnoreClickRef.current) {
                                            headIgnoreClickRef.current = false
                                            return
                                        }
                                        if (!available) return
                                        const carousel = headCarouselRef.current
                                        if (carousel) {
                                            const cards = carousel.querySelectorAll('.ring-design-card')
                                            const cardPosition = (cards[index] as HTMLElement).offsetLeft
                                            const navPadding = 64
                                            carousel.scrollTo({ left: Math.max(cardPosition - navPadding, 0), behavior: 'smooth' })
                                        }
                                        updateSelection({ shankId: shank._id })
                                    }}
                                >
                                    <div className="ring-image-container">
                                        <img
                                            src={shank.image}
                                            alt={getLabel(shank)}
                                            className="ring-image"
                                            draggable={false}
                                        />
                                    </div>
                                    <div className="ring-label">{getLabel(shank)}</div>
                                </div>
                            )
                        })}
                    </div>
                    <button className="carousel-button next" onClick={() => scrollCarousel(headCarouselRef, 'right', 'head')}>❯</button>
                </div>
            </div>

            {/* Shape */}
            <div className="customization-section">
                <div className="section-header">
                    <span className="section-title">Shape</span>
                </div>
                <div className="carousel-shell">
                    <button className="carousel-button prev" onClick={() => scrollCarousel(shapeCarouselRef, 'left', 'shape')}>❮</button>
                    <div className="shape-grid carousel" ref={shapeCarouselRef}>
                        {diamondShapes.map((shape, index) => {
                            const available = hasCombination(selection.shankId, shape._id, selection.settingStyleId, selection.caratWeightId)
                            return (
                                <div
                                    key={shape._id}
                                    className={cn("shape-pill", selection.diamondShapeId === shape._id && "active", !available && "disabled")}
                                       // onPointerDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                        if (shapeIgnoreClickRef.current) {
                                            shapeIgnoreClickRef.current = false
                                            return
                                        }
                                        if (!available) return
                                        const carousel = shapeCarouselRef.current
                                        if (carousel) {
                                            const cards = carousel.querySelectorAll('.shape-pill')
                                            const cardPosition = (cards[index] as HTMLElement).offsetLeft
                                            const navPadding = 64
                                            carousel.scrollTo({ left: Math.max(cardPosition - navPadding, 0), behavior: 'smooth' })
                                        }
                                        updateSelection({ diamondShapeId: shape._id })
                                    }}
                                >
                                    <div className="shape-thumb">
                                        <img
                                            src={shape.image}
                                            alt={getLabel(shape)}
                                            draggable={false}
                                        />
                                    </div>
                                    <span className="shape-label">{getLabel(shape)}</span>
                                </div>
                            )
                        })}
                    </div>
                    <button className="carousel-button next" onClick={() => scrollCarousel(shapeCarouselRef, 'right', 'shape')}>❯</button>
                </div>
            </div>

            {/* Carat */}
            <div className="customization-section">
                <div className="section-header">
                    <span className="section-title">Carat</span>
                </div>
                <div className="carat-row">
                    {config.caratWeights.map(carat => {
                        const available = hasCombination(selection.shankId, selection.diamondShapeId, selection.settingStyleId, carat._id)
                        return (
                            <div
                                key={carat._id}
                                className={cn("carat-pill", selection.caratWeightId === carat._id && "active", !available && "disabled")}
                                onClick={() => available && updateSelection({ caratWeightId: carat._id })}
                            >
                                {getLabel(carat)}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Setting (SETTING STYLES) */}
            <div className="customization-section">
                <div className="section-header">
                    <span className="section-title">Setting</span>
                </div>
                <div className="setting-grid" id="shank-options">
                    {config.settingStyles.map(style => {
                        // Determine the correct image for the setting based on current shape or fallback to Round
                        let settingImage = style.image
                        const currentShapeObj = diamondShapes.find(s => s._id === selection.diamondShapeId)

                        if (style.images && currentShapeObj) {
                            const shapeKey = (currentShapeObj.name || '').toLowerCase()
                            if (style.images[shapeKey]) {
                                settingImage = style.images[shapeKey]
                            } else if (style.images['round']) {
                                // User Request: If special image missing, show Round image
                                settingImage = style.images['round']
                            }
                        }

                        // Check availability allowing any shank
                        let available = hasCombination(null, selection.diamondShapeId, style._id, selection.caratWeightId)

                        return (
                            <div
                                key={style._id}
                                className={cn("band-card", selection.settingStyleId === style._id && "active", !available && "disabled")}
                                onClick={() => available && handleSettingClick(style._id)}
                            >
                                <div className="band-image-container">
                                    {settingImage && <img
                                        src={settingImage}
                                        alt={getLabel(style)}
                                        className="band-image"
                                    />}
                                </div>
                                <div className="band-label">{getLabel(style)}</div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Ring Metal */}
            <div className="customization-section">
                <div className="section-header">
                    <span className="section-title">Ring Metal</span>
                </div>
                <div className="metal-grid" id="color-options">
                    {colorOptions.map(color => (
                        <div
                            key={color._id}
                            className={cn("metal-card", selection.metalColorId === color._id && "active")}
                            onClick={() => updateSelection({ metalColorId: color._id })}
                            style={{ backgroundColor: color.hexCode }}
                        >
                            <div className="metal-label">{getLabel(color)}</div>
                        </div>
                    ))}
                </div>

                {/* Two-tone toggle */}
                {canTwoTone && (
                    <div id="two-tone-toggle-container" style={{ marginTop: 16 }}>
                        <label className="two-tone-toggle">
                            <input
                                type="checkbox"
                                id="two-tone-checkbox"
                                checked={selection.isTwoTone}
                                onChange={handleToggleTwoTone}
                            />
                            <span className="toggle-slider"></span>
                            <span className="toggle-label">Two-Tone (White Gold Head)</span>
                        </label>
                    </div>
                )}
            </div>

            {/* Matching Bands */}
            <div className="customization-section">
                <div className="section-header">
                    <span className="section-title">Matching Bands</span>
                </div>
                <div className="matching-bands-options">
                    <button
                        className={cn("band-count-btn", selection.matchingBandCount === 0 && "active")}
                        onClick={() => updateSelection({ matchingBandCount: 0 })}
                    >No Band</button>
                    <button
                        className={cn("band-count-btn", selection.matchingBandCount === 1 && "active", availableMatchingBandCount < 1 && "disabled")}
                        disabled={availableMatchingBandCount < 1}
                        onClick={() => availableMatchingBandCount >= 1 && updateSelection({ matchingBandCount: 1 })}
                    >1 Band</button>
                    <button
                        className={cn("band-count-btn", selection.matchingBandCount === 2 && "active", availableMatchingBandCount < 2 && "disabled")}
                        disabled={availableMatchingBandCount < 2}
                        onClick={() => availableMatchingBandCount >= 2 && updateSelection({ matchingBandCount: 2 })}
                    >2 Bands</button>
                </div>
            </div>
        </section>
    )
}

export default CustomizerPage
