import { useEffect, useRef, useState } from 'react'

const CombinedPage = () => {
  const viewerRef = useRef<HTMLIFrameElement | null>(null)
  const customizerRef = useRef<HTMLIFrameElement | null>(null)
  // Initialize with default params including matching band support
  const [viewerSrc, setViewerSrc] = useState(() => {
    const params = new URLSearchParams()
    params.set('metalHex', '%23c2c2c3')
    params.set('matchingBandCount', '1')  // Default to showing 1 band if available
    return `/ring-viewer?${params.toString()}`
  })

  useEffect(() => {
    let hasInitialLoad = false

    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return
      }

      if (event.source !== customizerRef.current?.contentWindow) {
        return
      }

      // Pass initial selection as query params to viewer
      if (!hasInitialLoad && event.data?.type === 'ring-selection') {
        hasInitialLoad = true
        const { payload } = event.data
        
        const params = new URLSearchParams()
        if (payload?.head?.file) params.set('headFile', payload.head.file)
        if (payload?.head?.scale !== undefined) params.set('headScale', payload.head.scale.toString())
        if (payload?.head?.posZ !== undefined) params.set('headPosZ', payload.head.posZ.toString())
        if (payload?.shank?.file) params.set('shankFile', payload.shank.file)
        if (payload?.shank?.scale !== undefined) params.set('shankScale', payload.shank.scale.toString())
        if (payload?.shank?.posZ !== undefined) params.set('shankPosZ', payload.shank.posZ.toString())
        if (payload?.shank?.matchingBandFile1) params.set('bandFile1', payload.shank.matchingBandFile1)
        if (payload?.shank?.matchingBandFile2) params.set('bandFile2', payload.shank.matchingBandFile2)
        if (payload?.matchingBandCount !== undefined) params.set('matchingBandCount', payload.matchingBandCount.toString())
        params.set('metalHex', payload?.metalColor?.hexCode || '#c2c2c3')
        if (payload?.metalColor?.headHexCode) params.set('headMetalHex', payload.metalColor.headHexCode)
        if (payload?.metalColor?.shankHexCode) params.set('shankMetalHex', payload.metalColor.shankHexCode)
        
        setViewerSrc(`/ring-viewer?${params.toString()}`)
        return
      }

      // Relay all messages to viewer
      viewerRef.current?.contentWindow?.postMessage(event.data, event.origin)
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  return (
    <section className="page split">
      <div className="panel viewer">
        <iframe ref={viewerRef} title="Viewer" src={viewerSrc} />
      </div>
      <div className="panel customizer">
        <iframe ref={customizerRef} title="Customizer" src="/customizer" />
      </div>
    </section>
  )
}

export default CombinedPage
