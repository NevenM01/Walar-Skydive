import { ShaderGradient, ShaderGradientCanvas } from '@shadergradient/react'
import { useTheme } from '../../context/ThemeContext'

/**
 * WebGL water-plane background (ShaderGradient) tinted for WALAR sky / navy / teal.
 * Renders behind CSS atmosphere layers in ScrollAltitudeScene.
 */
export function WalarShaderBackdrop() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className={isDark ? 'absolute inset-0 z-0 bg-[#0c1929]' : 'absolute inset-0 z-0 bg-[#e0f2fe]'}>
      <ShaderGradientCanvas
        key={theme}
        className="absolute inset-0 size-full"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        pointerEvents="none"
        pixelDensity={1}
        fov={45}
        lazyLoad
        powerPreference="default"
      >
        <ShaderGradient
          animate="off"
          brightness={isDark ? 0.72 : 1.08}
          cAzimuthAngle={180}
          cDistance={3.91}
          cPolarAngle={115}
          cameraZoom={1}
          color1={isDark ? '#0ea5e9' : '#38bdf8'}
          color2={isDark ? '#075985' : '#0284c7'}
          color3={isDark ? '#020617' : '#0c4a6e'}
          envPreset={isDark ? 'city' : 'dawn'}
          grain="off"
          lightType="3d"
          positionX={-0.5}
          positionY={0.1}
          positionZ={0}
          range="disabled"
          rangeEnd={40}
          rangeStart={0}
          reflection={isDark ? 0.06 : 0.1}
          rotationX={0}
          rotationY={0}
          rotationZ={235}
          shader="defaults"
          type="waterPlane"
          uAmplitude={0}
          uDensity={1.1}
          uFrequency={5.5}
          uSpeed={0.1}
          uStrength={2.4}
          uTime={0.2}
          wireframe={false}
        />
      </ShaderGradientCanvas>
    </div>
  )
}
