# Bundle analysis — recomendaciones rápidas

He ejecutado el analizador (`npm run analyze`) y el reporte quedó en `.next/analyze/client.html` y `.next/analyze/nodejs.html`.

Resumen rápido:
- First Load JS compartido: ~100 KB (aceptable), con dos chunks grandes ~54 KB y ~43 KB.

Recomendaciones prioritarias (rápidas de implementar):

1) Lazy-load componentes que no son críticos en el primer render
- `ProductListContainer` — solo carga cuando el usuario entra al catálogo.
- `ProductDetailsPresentational` — lazy-load para vistas de producto.
- `ChatHeroSection` — ya se carga en la página principal, puede mantenerse ligero o cargarse condicionalmente.

2) Revisar librerías de iconos y utilidades grandes
- `lucide-react` puede introducir peso; considerar reemplazar iconos por SVGs inlined o cargar `lucide-react` dinámicamente solo en componentes que lo requieren.

3) Mantener `ChatPanel` lazy-loaded (ya aplicado) y limitar in-memory messages
- `ChatPanel` ya se importa dinámicamente.
- Implementé un tope de `MAX_IN_MEMORY = 200` mensajes y reduje `overscan` a `100` para dispositivos Moto G5.

4) Considerar dividir código por rutas
- Cargar scripts específicos de `/products` solo para esas páginas con dynamic imports.

5) Medir de nuevo tras aplicar cambios
- Después de implementar los dynamic imports, correr `npm run analyze` y revisar `.next/analyze/client.html` para confirmar reducción de First Load JS.

Si querés, aplico los cambios concretos ahora: convertir `ProductListContainer`, `ProductCardContainer` y `ProductDetailsPresentational` a imports dinámicos y reemplazar `lucide-react` por SVGs inlined en los componentes críticos.
