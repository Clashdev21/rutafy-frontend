# Ideas de Diseño - PORTEX Mobile App

## Enfoque Seleccionado: Logística Moderna con Estética Portuaria

<response>
<text>
### Idea 1: Neo-Industrial Portuario

**Movimiento de Diseño**: Industrial Moderno con toques náuticos

**Principios Fundamentales**:
- Funcionalidad sobre decoración - cada elemento tiene propósito
- Contraste alto para legibilidad en exteriores
- Jerarquía visual clara para uso rápido durante operaciones

**Filosofía de Color**:
- Navy Blue (#1E3A5F) como ancla visual - evoca el mar y profesionalismo
- Teal Green (#2A9D8F) para acciones - representa movimiento y confirmación
- Grises neutros para fondos - reduce fatiga visual
- Blanco para contenido principal - máxima legibilidad

**Paradigma de Layout**:
- Bottom navigation para acceso con una mano
- Cards flotantes sobre mapas
- Botones grandes (mínimo 48px) para uso táctil
- Safe areas respetadas para notch y home indicator

**Elementos Distintivos**:
- Iconografía de línea fina estilo blueprint
- Bordes redondeados suaves (12-16px)
- Sombras sutiles para profundidad
- Indicadores de estado con colores semánticos

**Filosofía de Interacción**:
- Feedback háptico simulado con animaciones
- Transiciones suaves entre estados
- Pull-to-refresh en listas
- Swipe gestures para acciones rápidas

**Animaciones**:
- Entrada de cards desde abajo (slide-up)
- Pulse en botones de acción principal
- Skeleton loading para estados de carga
- Ripple effect en botones táctiles

**Sistema Tipográfico**:
- SF Pro Display para títulos (bold, 24-28px)
- SF Pro Text para cuerpo (regular, 16px)
- Números tabulares para precios y distancias
- Espaciado generoso entre líneas (1.5)
</text>
<probability>0.08</probability>
</response>

<response>
<text>
### Idea 2: Minimalismo Escandinavo Logístico

**Movimiento de Diseño**: Nordic Minimalism aplicado a logística

**Principios Fundamentales**:
- Espacios en blanco como elemento activo
- Tipografía como decoración principal
- Colores limitados, máximo impacto

**Filosofía de Color**:
- Blanco predominante (#FAFBFC)
- Negro para texto (#1A1A1A)
- Un solo acento: Teal (#2A9D8F)
- Sin gradientes, colores planos

**Paradigma de Layout**:
- Asimetría calculada
- Grids de 8px estrictos
- Márgenes amplios (24-32px)
- Contenido centrado verticalmente

**Elementos Distintivos**:
- Sin bordes, solo espaciado
- Iconos monocromáticos
- Tipografía oversized para títulos
- Líneas divisorias ultra finas

**Filosofía de Interacción**:
- Transiciones lentas y elegantes (400ms)
- Hover states sutiles
- Sin animaciones innecesarias
- Focus en contenido

**Animaciones**:
- Fade-in suave
- Scale sutil en hover
- Sin bounces ni efectos llamativos
- Transiciones de página con crossfade

**Sistema Tipográfico**:
- Inter para todo
- Pesos: Light (300), Regular (400), Semibold (600)
- Títulos en mayúsculas con letter-spacing
- Cuerpo en sentence case
</text>
<probability>0.05</probability>
</response>

<response>
<text>
### Idea 3: Mobile-Native Glassmorphism

**Movimiento de Diseño**: iOS-inspired Glassmorphism con identidad logística

**Principios Fundamentales**:
- Capas de profundidad con transparencias
- Blur como elemento de diseño
- Colores vibrantes pero profesionales
- Sensación de app nativa premium

**Filosofía de Color**:
- Fondos con blur y transparencia (rgba con 0.8-0.9 opacity)
- Navy Blue (#1E3A5F) para headers sólidos
- Teal Green (#2A9D8F) vibrante para CTAs
- Gradientes sutiles en backgrounds
- Bordes con 1px white/10%

**Paradigma de Layout**:
- Cards con backdrop-blur
- Tab bar con efecto glass
- Modales que emergen desde abajo (sheet)
- Mapas como fondo con overlay

**Elementos Distintivos**:
- Bordes con brillo sutil (inner glow)
- Iconos SF Symbols style
- Badges con blur background
- Status bar integrada con diseño

**Filosofía de Interacción**:
- Spring animations (iOS-like)
- Gestos nativos (swipe, long-press)
- Haptic feedback visual
- Context menus en long-press

**Animaciones**:
- Spring physics para modales
- Scale + opacity en transiciones
- Parallax sutil en scroll
- Micro-interactions en cada tap

**Sistema Tipográfico**:
- SF Pro (system font) para autenticidad
- Dynamic Type support
- Pesos variados para jerarquía
- Números proporcionales para texto, tabulares para datos
</text>
<probability>0.07</probability>
</response>

---

## Decisión Final: Neo-Industrial Portuario

He seleccionado el enfoque **Neo-Industrial Portuario** porque:

1. **Alineación con el brief**: Refleja la identidad de ciudad portuaria y logística
2. **Usabilidad**: Optimizado para uso rápido por conductores en movimiento
3. **Profesionalismo**: Transmite confianza sin ser aburrido
4. **Diferenciación**: No es el típico diseño de app de transporte

### Implementación de Estilo

```css
/* Colores principales */
--navy-blue: #1E3A5F;
--teal-green: #2A9D8F;
--light-gray: #F5F7FA;
--dark-gray: #4A5568;
--success: #38A169;
--warning: #ECC94B;
--error: #E53E3E;

/* Tipografía */
font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;

/* Espaciado */
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;

/* Bordes */
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-full: 9999px;

/* Sombras */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 4px 6px rgba(0,0,0,0.07);
--shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
```
