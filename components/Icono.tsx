type Props = {
  nombre: Nombre
  tam?: number
  className?: string
}

export type Nombre =
  | 'mas'
  | 'basura'
  | 'guardar'
  | 'copiar'
  | 'balanza'
  | 'reloj'
  | 'caja'
  | 'alerta'
  | 'calculadora'
  | 'lista'
  | 'carpeta'
  | 'escalar'
  | 'lapiz'
  | 'listo'
  | 'descargar'
  | 'camara'
  | 'buscar'
  | 'orden'
  | 'libro'
  | 'cruz'
  | 'volver'
  | 'sube'
  | 'baja'

/** Un solo sistema de trazo: 1.75px, puntas rectas, sin relleno. */
const TRAZOS: Record<Nombre, React.ReactNode> = {
  mas: <path d="M12 5v14M5 12h14" />,
  basura: (
    <>
      <path d="M4 7h16M10 7V4h4v3M6 7l1 13h10l1-13" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  guardar: (
    <>
      <path d="M5 3h11l3 3v15H5z" />
      <path d="M8 3v6h7V3M8 14h8v7H8z" />
    </>
  ),
  copiar: (
    <>
      <path d="M9 9h11v11H9z" />
      <path d="M15 9V4H4v11h5" />
    </>
  ),
  balanza: (
    <>
      <path d="M12 4v16M6 20h12" />
      <path d="M3 9h18M7 9l-3 6h6zM17 9l-3 6h6z" />
    </>
  ),
  reloj: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  caja: (
    <>
      <path d="M3 8l9-4 9 4v9l-9 4-9-4z" />
      <path d="M3 8l9 4 9-4M12 12v9" />
    </>
  ),
  alerta: (
    <>
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  calculadora: (
    <>
      <path d="M5 3h14v18H5z" />
      <path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" />
    </>
  ),
  lista: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  carpeta: <path d="M3 6h7l2 3h9v11H3z" />,
  escalar: <path d="M4 20L20 4M14 4h6v6M10 20H4v-6" />,
  lapiz: (
    <>
      <path d="M4 20l1-5L16 4l4 4L9 19z" />
      <path d="M14 6l4 4" />
    </>
  ),
  listo: <path d="M4 12l6 6L20 6" />,
  descargar: <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v3h16v-3" />,
  camara: (
    <>
      <path d="M3 8h4l2-3h6l2 3h4v12H3z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  buscar: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M15.5 15.5L20 20" />
    </>
  ),
  orden: <path d="M4 7h16M6 12h12M9 17h6" />,
  libro: (
    <>
      <path d="M4 4h7a2 2 0 012 2v14a2 2 0 00-2-2H4z" />
      <path d="M20 4h-7a2 2 0 00-2 2v14a2 2 0 012-2h7z" />
    </>
  ),
  cruz: <path d="M6 6l12 12M18 6L6 18" />,
  volver: <path d="M19 12H5m0 0l6-6m-6 6l6 6" />,
  sube: <path d="M12 19V5m0 0l-6 6m6-6l6 6" />,
  baja: <path d="M12 5v14m0 0l-6-6m6 6l6-6" />,
}

export function Icono({ nombre, tam = 20, className }: Props) {
  return (
    <svg
      className={className}
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      {TRAZOS[nombre]}
    </svg>
  )
}
