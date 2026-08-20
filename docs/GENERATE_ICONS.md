# 🎨 Generar Iconos PWA para JarBees

## Tamaños Necesarios

Los iconos deben ser **PNG** con fondo sólido:

| Tamaño | Propósito | Archivo |
|--------|-----------|---------|
| 72x72 | Android small | `public/icons/icon-72x72.png` |
| 96x96 | Android medium | `public/icons/icon-96x96.png` |
| 128x128 | Android large | `public/icons/icon-128x128.png` |
| 144x144 | Windows tile | `public/icons/icon-144x144.png` |
| 152x152 | iOS medium | `public/icons/icon-152x152.png` |
| 192x192 | Android standard | `public/icons/icon-192x192.png` |
| 384x384 | Android large | `public/icons/icon-384x384.png` |
| 512x512 | Android splash | `public/icons/icon-512x512.png` |

## Diseño Recomendado

### Colores:
- **Fondo**: `#0f172a` (slate-950, azul oscuro)
- **Gradiente**: De cyan (`#06b6d4`) a blue (`#2563eb`)
- **Logo**: El logo actual de JarBees (abeja)

### Padding:
- Dejar **10% de padding** en todos los lados
- Esto es importante para el modo "maskable" (iconos adaptativos en Android)

### Estilo:
- Logo centrado con gradiente circular de fondo
- Efecto de sombra suave con color cyan (`shadow-cyan-500/20`)
- Mantener el estilo actual que ya tenemos en la UI

## 🚀 Opción A: PWA Builder (Recomendado)

### Paso 1: Crear icono base
1. Abrir el logo actual en un editor (Figma, Photoshop, GIMP)
2. Canvas de **512x512px**
3. Fondo: `#0f172a`
4. Logo centrado con padding de 51px (10%)
5. Agregar círculo con gradiente cyan-blue detrás del logo
6. Exportar como PNG

### Paso 2: Generar todos los tamaños
1. Ir a: https://www.pwabuilder.com/imageGenerator
2. Subir el PNG de 512x512
3. Descargar el ZIP
4. Extraer en `public/icons/`

## 🎨 Opción B: ImageMagick (Terminal)

Si tenés ImageMagick instalado:

```bash
# Crear directorio
mkdir -p public/icons

# Generar todos los tamaños desde el base
convert icon-base-512.png -resize 72x72 public/icons/icon-72x72.png
convert icon-base-512.png -resize 96x96 public/icons/icon-96x96.png
convert icon-base-512.png -resize 128x128 public/icons/icon-128x128.png
convert icon-base-512.png -resize 144x144 public/icons/icon-144x144.png
convert icon-base-512.png -resize 152x152 public/icons/icon-152x152.png
convert icon-base-512.png -resize 192x192 public/icons/icon-192x192.png
convert icon-base-512.png -resize 384x384 public/icons/icon-384x384.png
cp icon-base-512.png public/icons/icon-512x512.png
```

## 🎯 Opción C: Servicio Online

1. **Favicon.io**: https://favicon.io/favicon-converter/
2. **RealFaviconGenerator**: https://realfavicongenerator.net/
3. **Icon Kitchen**: https://icon.kitchen/

## ✅ Verificar

Después de generar los iconos:

1. Verificar que existan todos los archivos en `public/icons/`
2. Hacer build: `npm run build`
3. Revisar que los iconos se copien a `out/icons/`
4. Abrir Lighthouse y verificar PWA score

## 🐝 Mockup del Icono

```
┌─────────────────────────┐
│  #0f172a (fondo)        │
│                         │
│   ┌───────────────┐     │
│   │  Gradiente    │     │
│   │  Cyan → Blue  │     │
│   │               │     │
│   │   🐝 Logo     │     │
│   │   JarBees     │     │
│   │               │     │
│   └───────────────┘     │
│                         │
│  Padding 10%            │
└─────────────────────────┘
```

## 📐 Plantilla Figma/SVG

Si necesitás una plantilla, el gradiente actual del logo está definido como:

```css
background: linear-gradient(135deg, #06b6d4 0%, #2563eb 100%);
box-shadow: 0 10px 40px rgba(6, 182, 212, 0.2);
```

---

**Una vez generados los iconos**, commitealos y pusheá:
```bash
git add public/icons/
git commit -m "feat: add PWA icons"
git push
```
