# PACE — Intelligent Running Platform

Plataforma SaaS de inteligencia deportiva para corredores (fondo y medio fondo: 800 / 1500 / 3000 / 5K / 10K / media / maratón).

Stack: **React 19 + TypeScript + TanStack Start (Vite) + TailwindCSS v4 + Motion + Recharts + Supabase**.

---

## 1. Qué necesitas instalar (una sola vez)

1. **Node.js 20 o superior** → https://nodejs.org (elige la versión LTS).
   Comprueba en la terminal: `node -v`
2. **VS Code** → https://code.visualstudio.com
3. (Opcional) **Git** → https://git-scm.com

## 2. Abrir el proyecto en VS Code

1. Descomprime el ZIP en tu escritorio (por ejemplo `Escritorio/pace-app`).
2. Abre VS Code → **Archivo → Abrir carpeta…** → selecciona la carpeta `pace-app`
   (la que contiene `package.json`). **Importante: abre la carpeta, no un archivo suelto.**
3. VS Code te sugerirá instalar extensiones recomendadas → pulsa **Instalar**.
   Son: Prettier, ESLint, Tailwind CSS IntelliSense y Error Lens.

## 3. Arrancar la app

Abre la terminal integrada en VS Code (**Terminal → Nueva terminal**, o `Ctrl+ñ` / `Ctrl+``) y ejecuta:

```bash
npm install     # instala dependencias (tarda 1-3 min, solo la primera vez)
npm run dev     # arranca el servidor de desarrollo
```

Verás algo como `Local: http://localhost:8080`. Abre esa dirección en el navegador
(`Ctrl+clic` sobre el enlace en la terminal). Cada cambio que guardes se recarga solo.

Para parar el servidor: `Ctrl+C` en la terminal.

## 4. Comandos disponibles

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente (puerto 8080) |
| `npm run build` | Compila la versión de producción en `dist/` |
| `npm run preview` | Sirve localmente la versión ya compilada |
| `npm run lint` | Revisa errores de código con ESLint |
| `npm run format` | Formatea todo el proyecto con Prettier |

## 5. Variables de entorno

El archivo `.env` ya viene incluido con las claves **públicas** de la base de datos,
así que la app funciona nada más arrancar (login, perfiles, actividades, IA Coach).

Si algún día cambias de proyecto de base de datos, copia `.env.example` a `.env`
y sustituye los valores. Tras editar `.env` hay que **reiniciar** `npm run dev`.

> Nunca pongas claves secretas (service role, Stripe secret, etc.) en variables `VITE_*`:
> esas se envían al navegador. Las secretas van solo en variables sin prefijo y se leen
> dentro de los handlers del servidor.

## 6. Mapa del proyecto (dónde tocar cada cosa)

```
src/
├─ routes/                     ← cada archivo es una URL de la app
│  ├─ index.tsx                landing pública ( / )
│  ├─ auth.tsx                 login / registro ( /auth )
│  ├─ dashboard.tsx            panel principal ( /dashboard )
│  ├─ __root.tsx               layout global, <head>, fuentes
│  └─ api/                     endpoints de servidor
│     ├─ chat.ts               IA Coach (streaming)
│     └─ pie-insight.ts        interpretaciones IA del motor PIE
│
├─ components/
│  ├─ landing/                 hero, secciones, pricing + FAQ
│  ├─ dashboard/
│  │  ├─ sidebar.tsx           menú lateral + barra inferior móvil
│  │  ├─ mission-control.tsx   resumen "cómo estoy hoy"
│  │  ├─ panels.tsx            gráficas (ritmo, volumen, carga, zonas)
│  │  ├─ pie.tsx               PACE Intelligence Engine (Runner IQ, etc.)
│  │  ├─ sections.tsx          Entrenamientos, Planes, Carreras, Objetivos,
│  │  │                        Calculadoras, Estadísticas, Perfil, Ajustes
│  │  ├─ week-compare.tsx      comparativa semana actual vs anterior
│  │  ├─ ai-coach.tsx          chat del entrenador IA
│  │  └─ plan.tsx              planes Free/Pro/Elite y bloqueos
│  └─ ui/                      componentes base (shadcn/ui)
│
├─ lib/
│  ├─ pace-data.ts             datos de ejemplo de entrenamientos
│  ├─ pie/engine.ts            fórmulas: Runner IQ, ACWR, eficiencia, fatiga
│  ├─ i18n.tsx                 textos e idiomas
│  └─ mcp/                     servidor MCP (integración con agentes IA)
│
├─ integrations/supabase/      cliente de base de datos (autogenerado, no editar)
└─ styles.css                  design system: colores, tipografía, animaciones
```

**Reglas rápidas al editar:**

- Los colores se definen como tokens en `src/styles.css`; usa `bg-surface`, `text-muted-foreground`, etc.
  en lugar de `bg-black` o `text-white`, así el tema se mantiene coherente.
- Para crear una página nueva, añade un archivo en `src/routes/` (por ejemplo `precios.tsx`)
  y aparecerá en `/precios`. **No edites `src/routeTree.gen.ts`**, se genera solo.
- Los datos del dashboard salen de `src/lib/pace-data.ts` (ficticios) y de la base de datos.

## 7. Códigos de creador

En **Perfil → Acceso de creador** puedes desbloquear planes sin pagar:
`PACE-PRO-2026`, `PACE-ELITE-2026`, y `PACE-FREE` para volver al plan gratuito.

## 8. Problemas frecuentes

- **`npm: command not found`** → falta Node.js, instálalo y reinicia VS Code.
- **El puerto 8080 está ocupado** → cierra la otra terminal, o ejecuta `npx kill-port 8080`.
- **Errores rojos raros tras cambiar de rama o actualizar** → borra `node_modules` y `.tanstack`,
  y vuelve a ejecutar `npm install`.
- **La app no carga datos** → revisa que el archivo `.env` existe y tiene las 6 variables.

## 9. Volver a Lovable

Si editas en VS Code y quieres sincronizar con Lovable, conecta el proyecto a GitHub
desde Lovable (menú **+ → GitHub**) y trabaja contra ese repositorio: los cambios
viajan en los dos sentidos.
