# 🚴 Ciclo Rutas Seguras

Aplicación web de mapas para ciclistas en Bogotá. Permite explorar rutas, planificar trayectos y reportar incidentes.

## Características

### Rutas
- Visualización de rutas en mapa interactivo (Leaflet + OpenStreetMap)
- Filtrado por nivel de seguridad (Seguras / Moderadas / Peligrosas)
- Selección y detalle de cada ruta

### Planificador de ruta
- Definir punto de inicio y destino por coordenadas, ubicaciones predefinidas o clic directo en mapa
- Línea de ruta proyectada entre los dos puntos

### Al terminar una ruta 🏁
- Calificación de 1 a 5 estrellas
- Selección de impresiones (Muy segura, Mal pavimento, Paisaje bonito, etc.)
- Comentario libre
- Las calificaciones se agregan al promedio visible en cada tarjeta

### Reportes e incidentes ⚠️
- Tipos de incidente: Accidente, Hueco, Robo, Tráfico peligroso, Carril bloqueado, etc.
- Ubicación y descripción opcionales
- Historial visible en la pestaña Stats

### Rutas guardadas ⭐
- Guardar / quitar rutas favoritas
- Pestaña dedicada con contador

### Modelo Freemium
- **Trial gratuito 15 días**: acceso a todas las rutas, con publicidad
- **Pro Mensual**: $10.000/mes — sin publicidad, historial, soporte estándar
- **Pro Anual**: $100.000/año — licencia completa por 1 año + soporte prioritario (ahorras $20.000 frente a pagar 12 meses)
- Al suscribirse, el usuario recibe cuenta Pro sin publicidad

## Stack técnico

| Tecnología | Uso |
|---|---|
| React 18 + TypeScript | UI |
| Vite 5 | Build tool |
| Leaflet + react-leaflet | Mapas |
| OpenStreetMap | Tiles gratuitos |

## Arrancar localmente

```bash
npm install
npm run dev
```

Luego abre [http://localhost:5173](http://localhost:5173)

## Estructura del proyecto

```
src/
├── components/
│   ├── BikeMap.tsx          # Mapa Leaflet
│   ├── FilterPanel.tsx      # Filtros de seguridad
│   ├── FinishRouteModal.tsx # Modal calificación al terminar ruta
│   ├── Modal.tsx            # Base modal + helpers (ChipSelector)
│   ├── ReportModal.tsx      # Modal reporte de incidente
│   ├── RouteCard.tsx        # Tarjeta de ruta con acciones
│   ├── RoutePlanner.tsx     # Planificador inicio/destino
│   ├── StarRating.tsx       # Widget de estrellas interactivo
│   ├── SubscribeModal.tsx   # Modal planes de suscripción
│   └── Toast.tsx            # Notificaciones tipo toast
├── App.tsx                  # Shell principal + estado global
├── data.ts                  # Datos semilla (rutas, marcadores)
├── index.css                # Tokens de diseño + estilos globales
├── main.tsx                 # Entry point
├── types.ts                 # Tipos TypeScript compartidos
└── utils.ts                 # Helpers (colores, ratings, labels)
```

## Personalización

- **Añadir rutas**: editar `src/data.ts` → array `bikeRoutes`
- **Cambiar ciudad**: ajustar coordenadas en `data.ts` y el centro del mapa en `BikeMap.tsx`
- **Precios**: editar el array `plans` en `SubscribeModal.tsx`
