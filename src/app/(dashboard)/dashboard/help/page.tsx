import {
  HelpCircle,
  Zap,
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  BarChart2,
  Newspaper,
  Bell,
  GitBranch,
  Settings,
  Globe,
  Info,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  ChevronRight,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TocSection {
  id: string
  label: string
  icon: React.ElementType
}

interface QuickStartStep {
  number: number
  title: string
  description: string
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------
const tocSections: TocSection[] = [
  { id: 'quick-start', label: 'Quick Start', icon: Zap },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'investors', label: 'Inversionistas', icon: Users },
  { id: 'contracts', label: 'Contratos', icon: FileText },
  { id: 'payments', label: 'Pagos y Depósitos', icon: CreditCard },
  { id: 'reports', label: 'Reportes periódicos', icon: BarChart2 },
  { id: 'bulletins', label: 'Boletines', icon: Newspaper },
  { id: 'notifications', label: 'Notificaciones', icon: Bell },
  { id: 'referrals', label: 'Referidos', icon: GitBranch },
  { id: 'portal', label: 'Portal del inversionista', icon: Globe },
  { id: 'settings', label: 'Configuración', icon: Settings },
  { id: 'faq', label: 'Preguntas frecuentes', icon: HelpCircle },
]

const quickStartSteps: QuickStartStep[] = [
  {
    number: 1,
    title: 'Crear tu primer inversionista',
    description:
      'Antes de hacer cualquier cosa, registrá a la persona que va a invertir. Ve a "Inversionistas" en el menú, hacé clic en "Nuevo inversionista" y completá sus datos: nombre, cédula, teléfono y correo electrónico.',
  },
  {
    number: 2,
    title: 'Crear un contrato',
    description:
      'Una vez que tenés el inversionista, ve a "Contratos" y creá un nuevo contrato. Seleccioná el plan de inversión, el inversionista, el monto y el plazo. El contrato empieza como "Borrador".',
  },
  {
    number: 3,
    title: 'Enviar a aprobación',
    description:
      'Cuando el contrato esté listo, envialo a aprobación. El estado cambia a "Pendiente de aprobación". El inversionista puede ver su contrato en el Portal usando su link único.',
  },
  {
    number: 4,
    title: 'El inversionista aprueba',
    description:
      'El inversionista entra al portal, revisa los términos y hace clic en "Aprobar contrato". Una vez aprobado, el contrato se activa automáticamente.',
  },
  {
    number: 5,
    title: 'Registrar el depósito',
    description:
      'Ve a "Pagos", registrá el depósito del inversionista con el monto y el comprobante. Un administrador debe verificarlo.',
  },
  {
    number: 6,
    title: 'Generar reportes',
    description:
      'Cada 2 meses (o según la frecuencia del contrato), ve a "Reportes" y generá un nuevo reporte con la tasa de crecimiento del período. Podés subir el PDF y enviarlo por email al inversionista.',
  },
]

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
      <Info size={16} className="mt-0.5 shrink-0 text-blue-500" />
      <span>{children}</span>
    </div>
  )
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-yellow-500" />
      <span>{children}</span>
    </div>
  )
}

function StepBullet({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white">
        {n}
      </span>
      <span className="text-sm text-zinc-700 leading-relaxed">{children}</span>
    </div>
  )
}

function SectionTitle({
  id,
  icon: Icon,
  children,
}: {
  id: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <h2
      id={id}
      className="flex items-center gap-2 text-lg font-semibold text-zinc-900 scroll-mt-6"
    >
      <span className="flex size-7 items-center justify-center rounded-md bg-zinc-100">
        <Icon size={15} className="text-zinc-600" strokeWidth={1.75} />
      </span>
      {children}
    </h2>
  )
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-zinc-800">{children}</h3>
  )
}

function FieldRow({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 text-sm">
      <span className="font-medium text-zinc-800 sm:w-44 sm:shrink-0">{name}</span>
      <span className="text-zinc-500">{desc}</span>
    </div>
  )
}

function StatusBadge({
  label,
  color,
  description,
}: {
  label: string
  color: 'gray' | 'yellow' | 'orange' | 'green' | 'blue' | 'red'
  description: string
}) {
  const colorMap: Record<typeof color, string> = {
    gray: 'bg-zinc-100 text-zinc-600',
    yellow: 'bg-yellow-100 text-yellow-700',
    orange: 'bg-orange-100 text-orange-700',
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    red: 'bg-red-100 text-red-700',
  }
  return (
    <div className="flex items-start gap-3 text-sm">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${colorMap[color]}`}
      >
        {label}
      </span>
      <span className="text-zinc-500 leading-relaxed">{description}</span>
    </div>
  )
}

function NotifRow({ icon, label, desc }: { icon: string; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="text-base leading-none mt-0.5">{icon}</span>
      <div>
        <span className="font-medium text-zinc-800">{label}: </span>
        <span className="text-zinc-500">{desc}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function HelpPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      {/* ── Header ── */}
      <div className="bg-zinc-900 px-4 sm:px-8 py-8 sm:py-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-4">
            <span>Dashboard</span>
            <ChevronRight size={12} />
            <span className="text-zinc-200">Centro de Ayuda</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            Centro de Ayuda
          </h1>
          <p className="mt-1.5 text-zinc-400 text-sm">
            Guía completa del sistema Grandir CM
          </p>

          {/* Barra de búsqueda visual */}
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 max-w-md">
            <Search size={15} className="text-zinc-500 shrink-0" />
            <span className="text-sm text-zinc-500">Buscá en la ayuda…</span>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        <div className="flex gap-8 items-start">

          {/* ── TOC ── */}
          <aside className="hidden lg:block w-52 shrink-0 sticky top-6">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                Contenido
              </p>
              <nav className="space-y-0.5">
                {tocSections.map(({ id, label, icon: Icon }) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    <Icon size={13} strokeWidth={1.75} className="shrink-0 text-zinc-400" />
                    {label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* ── Main content ── */}
          <main className="flex-1 min-w-0 space-y-10">

            {/* ══ QUICK START ══ */}
            <section id="quick-start" className="scroll-mt-6">
              <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                <div className="bg-zinc-900 px-6 py-5">
                  <div className="flex items-center gap-2">
                    <Zap size={16} className="text-yellow-400" />
                    <h2 className="text-base font-semibold text-white">
                      Quick Start — ¿Cómo empezar?
                    </h2>
                  </div>
                  <p className="mt-1 text-sm text-zinc-400">
                    Seguí estos 6 pasos para procesar tu primera inversión de principio a fin.
                  </p>
                </div>
                <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {quickStartSteps.map((step) => (
                    <div
                      key={step.number}
                      className="rounded-lg border border-zinc-100 p-4 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-full border-2 border-green-500 text-xs font-bold text-green-600">
                          {step.number}
                        </span>
                        <span className="text-sm font-semibold text-zinc-900">
                          {step.title}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed pl-9">
                        {step.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ══ DASHBOARD ══ */}
            <section id="dashboard" className="scroll-mt-6">
              <div className="rounded-xl border border-zinc-200 bg-white shadow-sm p-4 sm:p-6 space-y-5">
                <SectionTitle id="dashboard-title" icon={LayoutDashboard}>
                  El Dashboard (Inicio)
                </SectionTitle>
                <p className="text-sm text-zinc-500">
                  La pantalla principal muestra un resumen en tiempo real del estado del fondo. Cada elemento tiene un propósito específico.
                </p>

                <div className="space-y-4">
                  <SubTitle>Tarjetas de métricas</SubTitle>
                  <div className="space-y-3">
                    <FieldRow
                      name="Capital activo"
                      desc="Suma total del dinero en contratos con estado Activo en este momento."
                    />
                    <FieldRow
                      name="Inversionistas activos"
                      desc="Cantidad de personas que tienen al menos un contrato activo."
                    />
                    <FieldRow
                      name="Contratos activos"
                      desc="Cantidad de contratos que están en curso."
                    />
                    <FieldRow
                      name="Pagos sin verificar"
                      desc="Pagos registrados que aún no fueron confirmados por un admin. Si este número es mayor a 0, hay trabajo pendiente."
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <SubTitle>Secciones adicionales</SubTitle>
                  <FieldRow
                    name="Contratos por estado"
                    desc="Muestra cuántos contratos hay en cada etapa (Borrador, Pendiente, Activo, Vencido, Cancelado)."
                  />
                  <FieldRow
                    name="Próximos a vencer"
                    desc="Contratos activos que terminan en los próximos 60 días. Los que están en rojo vencen en menos de 30 días; los amarillos entre 30 y 60 días."
                  />
                  <FieldRow
                    name="Pagos pendientes de verificar"
                    desc="Lista de los últimos pagos que necesitan revisión por parte del administrador."
                  />
                </div>
              </div>
            </section>

            {/* ══ INVERSIONISTAS ══ */}
            <section id="investors" className="scroll-mt-6">
              <div className="rounded-xl border border-zinc-200 bg-white shadow-sm p-4 sm:p-6 space-y-5">
                <SectionTitle id="investors-title" icon={Users}>
                  Inversionistas
                </SectionTitle>

                <div className="space-y-2">
                  <SubTitle>¿Qué es un inversionista?</SubTitle>
                  <p className="text-sm text-zinc-500">
                    Es la persona que pone su dinero en el fondo. Cada inversionista tiene un perfil con su información personal y puede tener uno o más contratos.
                  </p>
                </div>

                <div className="space-y-2">
                  <SubTitle>Ver la lista</SubTitle>
                  <p className="text-sm text-zinc-500">
                    En la tabla podés ver todos los inversionistas. Podés buscar por nombre o cédula, y filtrar entre Activos e Inactivos.
                  </p>
                </div>

                <div className="space-y-3">
                  <SubTitle>Crear un inversionista — campos</SubTitle>
                  <div className="rounded-lg border border-zinc-100 p-4 space-y-3">
                    <FieldRow name="Nombre completo" desc="Nombre y apellidos de la persona." />
                    <FieldRow name="Cédula" desc="Número de identificación. Debe ser único en el sistema." />
                    <FieldRow name="Teléfono" desc="Número de contacto (opcional)." />
                    <FieldRow
                      name="Email"
                      desc="Correo electrónico principal. Se usa para enviarle reportes y boletines."
                    />
                    <FieldRow
                      name="Referidor"
                      desc="Si esta persona fue recomendada por otro inversionista, seleccionalo aquí para registrar la comisión de referido."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <SubTitle>Ver el detalle de un inversionista</SubTitle>
                  <p className="text-sm text-zinc-500">
                    Al hacer clic en un inversionista ves su información personal, todos sus correos registrados, sus contratos activos e históricos, y su estado Activo o Inactivo.
                  </p>
                </div>

                <Tip>
                  Un inversionista inactivo no recibe boletines del grupo "Activos". Sus contratos existentes no se ven afectados por el cambio de estado.
                </Tip>
              </div>
            </section>

            {/* ══ CONTRATOS ══ */}
            <section id="contracts" className="scroll-mt-6">
              <div className="rounded-xl border border-zinc-200 bg-white shadow-sm p-4 sm:p-6 space-y-5">
                <SectionTitle id="contracts-title" icon={FileText}>
                  Contratos
                </SectionTitle>

                <div className="space-y-2">
                  <SubTitle>¿Qué es un contrato?</SubTitle>
                  <p className="text-sm text-zinc-500">
                    Es el acuerdo formal entre Grandir CM y el inversionista. Define cuánto dinero invierte, en qué plan, por cuánto tiempo y qué rendimiento recibirá.
                  </p>
                </div>

                <div className="space-y-3">
                  <SubTitle>Estados del contrato</SubTitle>
                  <div className="rounded-lg border border-zinc-100 p-4 space-y-3">
                    <StatusBadge
                      label="Borrador"
                      color="gray"
                      description="Recién creado, todavía se puede editar. El inversionista no lo ve aún."
                    />
                    <StatusBadge
                      label="Pendiente de aprobación"
                      color="yellow"
                      description="Fue enviado al inversionista para que lo revise y apruebe."
                    />
                    <StatusBadge
                      label="Revisión solicitada"
                      color="orange"
                      description="El inversionista pidió cambios. Hay que volver al borrador y corregir."
                    />
                    <StatusBadge
                      label="Activo"
                      color="green"
                      description="Aprobado y en curso. Ya NO se puede editar."
                    />
                    <StatusBadge
                      label="Vencido"
                      color="blue"
                      description="El plazo terminó."
                    />
                    <StatusBadge
                      label="Cancelado"
                      color="red"
                      description="Se canceló antes de tiempo."
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <SubTitle>Crear un contrato — campos</SubTitle>
                  <div className="rounded-lg border border-zinc-100 p-4 space-y-3">
                    <FieldRow name="Plan" desc="El tipo de inversión: Anual, Mensual o Semestral." />
                    <FieldRow name="Inversionista" desc="Quién es el titular del contrato." />
                    <FieldRow
                      name="Monto"
                      desc="Cuánto dinero invierte (debe ser mayor o igual al mínimo del plan)."
                    />
                    <FieldRow
                      name="Plazo en meses"
                      desc="Duración del contrato (entre 1 y 48 meses)."
                    />
                    <FieldRow
                      name="Fecha de inicio"
                      desc="Cuándo empieza. Opcional; se puede definir después."
                    />
                    <FieldRow
                      name="Frecuencia de reportes"
                      desc="Cada cuántos meses se genera un reporte. Por defecto: 2 meses."
                    />
                    <FieldRow
                      name="Notas"
                      desc="Cualquier observación interna. El inversionista no la ve."
                    />
                  </div>
                </div>

                <Warning>
                  Los contratos ACTIVOS no se pueden editar. Si necesitás hacer un cambio, debés crear un addendum o una nueva versión del contrato.
                </Warning>

                <div className="space-y-2">
                  <SubTitle>El link del portal</SubTitle>
                  <p className="text-sm text-zinc-500">
                    Cada contrato tiene un link único para que el inversionista lo pueda ver. Se genera automáticamente cuando creás el contrato. Lo encontrás en la sección de detalle del contrato.
                  </p>
                </div>

                <div className="space-y-2">
                  <SubTitle>Documentos</SubTitle>
                  <p className="text-sm text-zinc-500">
                    Podés subir archivos al contrato: el borrador del contrato, el contrato firmado, comprobantes de pago, reportes o addendums.
                  </p>
                </div>
              </div>
            </section>

            {/* ══ PAGOS ══ */}
            <section id="payments" className="scroll-mt-6">
              <div className="rounded-xl border border-zinc-200 bg-white shadow-sm p-4 sm:p-6 space-y-5">
                <SectionTitle id="payments-title" icon={CreditCard}>
                  Pagos y Depósitos
                </SectionTitle>

                <div className="space-y-3">
                  <SubTitle>Tipos de movimientos</SubTitle>
                  <div className="rounded-lg border border-zinc-100 p-4 space-y-3">
                    <FieldRow name="Deposito" desc="Dinero que el inversionista pone en el fondo." />
                    <FieldRow
                      name="Retiro"
                      desc="Dinero que se le paga al inversionista (rendimientos o capital)."
                    />
                    <FieldRow name="Comision" desc="Pago de comisión por referido." />
                  </div>
                </div>

                <div className="space-y-3">
                  <SubTitle>Registrar un pago — campos</SubTitle>
                  <div className="rounded-lg border border-zinc-100 p-4 space-y-3">
                    <FieldRow name="Contrato" desc="A qué contrato corresponde este movimiento." />
                    <FieldRow name="Tipo" desc="Si es un depósito, retiro o comisión." />
                    <FieldRow name="Monto" desc="La cantidad en dólares." />
                    <FieldRow name="Fecha de pago" desc="Cuándo se realizó." />
                    <FieldRow
                      name="Comprobante"
                      desc="Foto o PDF del recibo. Opcional pero muy recomendado."
                    />
                    <FieldRow name="Notas" desc="Observaciones adicionales." />
                  </div>
                </div>

                <div className="space-y-2">
                  <SubTitle>Verificar un pago</SubTitle>
                  <p className="text-sm text-zinc-500">
                    Todo pago registrado queda como "Pendiente" hasta que un administrador lo verifica. Para verificarlo, hacé clic en el botón de verificación. Una vez verificado, no se puede modificar ni eliminar.
                  </p>
                </div>

                <Tip>
                  La verificación es una doble confirmación de que el dinero realmente entró o salió. Es como la firma del jefe en un documento.
                </Tip>
              </div>
            </section>

            {/* ══ REPORTES ══ */}
            <section id="reports" className="scroll-mt-6">
              <div className="rounded-xl border border-zinc-200 bg-white shadow-sm p-4 sm:p-6 space-y-5">
                <SectionTitle id="reports-title" icon={BarChart2}>
                  Reportes Periódicos
                </SectionTitle>

                <div className="space-y-2">
                  <SubTitle>¿Qué es un reporte?</SubTitle>
                  <p className="text-sm text-zinc-500">
                    Es un resumen del desempeño de la inversión durante un período específico. Se genera cada 2 meses (o según la frecuencia del contrato) y se envía al inversionista por correo.
                  </p>
                </div>

                <div className="space-y-3">
                  <SubTitle>Estados del reporte</SubTitle>
                  <div className="rounded-lg border border-zinc-100 p-4 space-y-3">
                    <StatusBadge
                      label="Pendiente"
                      color="yellow"
                      description="Creado pero sin PDF todavía."
                    />
                    <StatusBadge
                      label="PDF listo"
                      color="blue"
                      description="Tiene el archivo subido, listo para enviar."
                    />
                    <StatusBadge
                      label="Enviado"
                      color="green"
                      description="Ya fue enviado al inversionista por email."
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <SubTitle>Generar un reporte — paso a paso</SubTitle>
                  <div className="space-y-2.5">
                    <StepBullet n={1}>Ir a Reportes y hacer clic en "Nuevo reporte".</StepBullet>
                    <StepBullet n={2}>Seleccionar el contrato.</StepBullet>
                    <StepBullet n={3}>
                      Definir el período (fecha inicio y fecha fin del bimestre).
                    </StepBullet>
                    <StepBullet n={4}>
                      Ingresar la tasa de crecimiento del período (ej: 20%).
                    </StepBullet>
                    <StepBullet n={5}>
                      Opcionalmente, el monto calculado actual de la inversión.
                    </StepBullet>
                    <StepBullet n={6}>
                      Guardar — queda en estado "Pendiente".
                    </StepBullet>
                    <StepBullet n={7}>
                      Subir el PDF del reporte (botón "Subir PDF") — pasa a "PDF listo".
                    </StepBullet>
                    <StepBullet n={8}>
                      Enviar por email (botón "Enviar reporte") — pasa a "Enviado".
                    </StepBullet>
                  </div>
                </div>
              </div>
            </section>

            {/* ══ BOLETINES ══ */}
            <section id="bulletins" className="scroll-mt-6">
              <div className="rounded-xl border border-zinc-200 bg-white shadow-sm p-4 sm:p-6 space-y-5">
                <SectionTitle id="bulletins-title" icon={Newspaper}>
                  Boletines
                </SectionTitle>

                <div className="space-y-2">
                  <SubTitle>¿Qué es un boletín?</SubTitle>
                  <p className="text-sm text-zinc-500">
                    Es un email masivo que se envía a un grupo de inversionistas. Se usa para comunicar noticias, resultados del fondo, cambios, etc.
                  </p>
                </div>

                <div className="space-y-3">
                  <SubTitle>Grupos de envío</SubTitle>
                  <div className="rounded-lg border border-zinc-100 p-4 space-y-3">
                    <FieldRow
                      name="Todos los activos"
                      desc="Todos los inversionistas con estado Activo."
                    />
                    <FieldRow
                      name="Todos los inactivos"
                      desc="Inversionistas con estado Inactivo."
                    />
                    <FieldRow
                      name="Por plan"
                      desc="Solo los que tienen un contrato activo con un plan específico."
                    />
                    <FieldRow
                      name="Personalizado"
                      desc="Una lista específica de destinatarios seleccionados manualmente."
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <SubTitle>Crear y enviar un boletín — paso a paso</SubTitle>
                  <div className="space-y-2.5">
                    <StepBullet n={1}>Ir a Boletines y hacer clic en "Nuevo boletín".</StepBullet>
                    <StepBullet n={2}>Escribir el asunto (aparece como título del email).</StepBullet>
                    <StepBullet n={3}>
                      Escribir el contenido (se formatea automáticamente).
                    </StepBullet>
                    <StepBullet n={4}>Elegir el grupo de destinatarios.</StepBullet>
                    <StepBullet n={5}>Guardar como borrador.</StepBullet>
                    <StepBullet n={6}>Revisar y hacer clic en "Enviar boletín".</StepBullet>
                  </div>
                </div>

                <Warning>
                  Una vez enviado, no se puede modificar ni reenviar. Revisá bien el contenido y los destinatarios antes de enviar.
                </Warning>
              </div>
            </section>

            {/* ══ NOTIFICACIONES ══ */}
            <section id="notifications" className="scroll-mt-6">
              <div className="rounded-xl border border-zinc-200 bg-white shadow-sm p-4 sm:p-6 space-y-5">
                <SectionTitle id="notifications-title" icon={Bell}>
                  Notificaciones
                </SectionTitle>

                <p className="text-sm text-zinc-500">
                  Las notificaciones son alertas internas del sistema. Aparecen en la campanita del header.
                </p>

                <div className="space-y-3">
                  <SubTitle>Tipos de notificaciones</SubTitle>
                  <div className="rounded-lg border border-zinc-100 p-4 space-y-3">
                    <NotifRow
                      icon="✅"
                      label="Aprobación"
                      desc="Un inversionista aprobó su contrato."
                    />
                    <NotifRow
                      icon="⚠️"
                      label="Revisión solicitada"
                      desc="Un inversionista pidió cambios en su contrato."
                    />
                    <NotifRow
                      icon="📄"
                      label="Nueva solicitud"
                      desc="Se creó un nuevo contrato."
                    />
                    <NotifRow
                      icon="🕐"
                      label="Reporte vencido"
                      desc="Hay un reporte que debería haberse generado y aún no existe."
                    />
                    <NotifRow
                      icon="📅"
                      label="Contrato por vencer"
                      desc="Un contrato activo está próximo a su fecha de vencimiento."
                    />
                    <NotifRow
                      icon="💰"
                      label="Desembolso pendiente"
                      desc="Hay un pago de rendimiento que debe realizarse."
                    />
                    <NotifRow
                      icon="🚨"
                      label="Proceso demorado"
                      desc="Algún proceso lleva más tiempo del esperado."
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ══ REFERIDOS ══ */}
            <section id="referrals" className="scroll-mt-6">
              <div className="rounded-xl border border-zinc-200 bg-white shadow-sm p-4 sm:p-6 space-y-5">
                <SectionTitle id="referrals-title" icon={GitBranch}>
                  Referidos
                </SectionTitle>

                <div className="space-y-2">
                  <SubTitle>¿Cómo funciona el sistema de referidos?</SubTitle>
                  <p className="text-sm text-zinc-500">
                    Cuando un inversionista recomienda a alguien nuevo y esa persona invierte, el referidor recibe una comisión. El sistema lleva el registro de esas comisiones automáticamente.
                  </p>
                </div>

                <div className="space-y-2">
                  <SubTitle>Ver las comisiones</SubTitle>
                  <p className="text-sm text-zinc-500">
                    En la tabla de Referidos ves: quién refirió, a quién refirió, a qué contrato corresponde, el monto de la comisión y si ya fue pagada.
                  </p>
                </div>

                <div className="space-y-2">
                  <SubTitle>Registrar una comisión</SubTitle>
                  <p className="text-sm text-zinc-500">
                    Las comisiones se pueden registrar manualmente. Para que funcione, el inversionista referido debe tener configurado su "referidor" en su perfil.
                  </p>
                </div>

                <div className="space-y-2">
                  <SubTitle>Marcar como pagada</SubTitle>
                  <p className="text-sm text-zinc-500">
                    Cuando se le paga la comisión al referidor, hacé clic en "Marcar pagada" y confirmá. Se registra la fecha de pago automáticamente.
                  </p>
                </div>

                <Tip>
                  Para que el sistema calcule las comisiones correctamente, asegurate de seleccionar el referidor al momento de crear el perfil del inversionista nuevo.
                </Tip>
              </div>
            </section>

            {/* ══ PORTAL ══ */}
            <section id="portal" className="scroll-mt-6">
              <div className="rounded-xl border border-zinc-200 bg-white shadow-sm p-4 sm:p-6 space-y-5">
                <SectionTitle id="portal-title" icon={Globe}>
                  Portal del Inversionista
                </SectionTitle>

                <div className="space-y-2">
                  <SubTitle>¿Qué es el portal?</SubTitle>
                  <p className="text-sm text-zinc-500">
                    Es una página especial para cada inversionista donde puede ver su contrato, pagos y reportes. No requiere contraseña — se accede con un link único y seguro.
                  </p>
                </div>

                <div className="space-y-2">
                  <SubTitle>¿Cómo accede el inversionista?</SubTitle>
                  <p className="text-sm text-zinc-500">
                    Le enviás el link que aparece en el detalle del contrato. El link tiene este formato:
                  </p>
                  <div className="rounded-md bg-zinc-100 px-3 py-2 font-mono text-xs text-zinc-600">
                    tudominio.com/portal/[código-único]
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-zinc-100 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-800">
                      <CheckCircle2 size={14} className="text-green-500" />
                      ¿Qué puede VER?
                    </div>
                    <ul className="space-y-1 text-xs text-zinc-500 pl-5 list-disc">
                      <li>Resumen de su inversión (monto, plan, tasa, fechas)</li>
                      <li>Sus pagos verificados</li>
                      <li>Sus documentos (puede descargarlos)</li>
                      <li>Sus reportes enviados</li>
                    </ul>
                  </div>
                  <div className="rounded-lg border border-zinc-100 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-800">
                      <Clock size={14} className="text-blue-500" />
                      ¿Qué puede HACER?
                    </div>
                    <ul className="space-y-1 text-xs text-zinc-500 pl-5 list-disc">
                      <li>Aprobar su contrato (cuando está pendiente)</li>
                      <li>Solicitar revisión con un comentario</li>
                      <li>Subir documentos (contrato firmado, comprobante)</li>
                    </ul>
                  </div>
                </div>

                <Warning>
                  El portal es de solo lectura excepto esas tres acciones. El inversionista NO puede modificar montos, fechas ni ningún dato del contrato.
                </Warning>
              </div>
            </section>

            {/* ══ CONFIGURACIÓN ══ */}
            <section id="settings" className="scroll-mt-6">
              <div className="rounded-xl border border-zinc-200 bg-white shadow-sm p-4 sm:p-6 space-y-5">
                <SectionTitle id="settings-title" icon={Settings}>
                  Configuración
                </SectionTitle>

                <div className="space-y-3">
                  <SubTitle>Usuarios del sistema</SubTitle>
                  <p className="text-sm text-zinc-500">
                    Acá se crean y administran las cuentas de las personas que trabajan en Grandir CM. Solo los administradores pueden ver esta sección.
                  </p>
                  <div className="rounded-lg border border-zinc-100 p-4 space-y-3">
                    <FieldRow
                      name="Administrador"
                      desc="Acceso completo. Puede crear usuarios, verificar pagos, cambiar estados de contratos activos y más."
                    />
                    <FieldRow
                      name="Asistente"
                      desc="Acceso limitado. No puede eliminar ni hacer acciones destructivas."
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <SubTitle>Crear un usuario — paso a paso</SubTitle>
                  <div className="space-y-2.5">
                    <StepBullet n={1}>Hacé clic en "Nuevo usuario".</StepBullet>
                    <StepBullet n={2}>Ingresá el email, contraseña, nombre y rol.</StepBullet>
                    <StepBullet n={3}>El usuario puede iniciar sesión inmediatamente.</StepBullet>
                  </div>
                </div>

                <div className="space-y-3">
                  <SubTitle>Planes de inversión</SubTitle>
                  <p className="text-sm text-zinc-500">
                    Acá se administran los planes disponibles (Anual, Mensual, Semestral). Podés crear nuevos planes, modificar tasas y montos mínimos, y activar o desactivar planes.
                  </p>
                </div>

                <Warning>
                  Cambiar la tasa o el monto de un plan NO afecta los contratos ya existentes. Solo aplica a contratos nuevos.
                </Warning>
              </div>
            </section>

            {/* ══ FAQ ══ */}
            <section id="faq" className="scroll-mt-6">
              <div className="rounded-xl border border-zinc-200 bg-white shadow-sm p-4 sm:p-6 space-y-5">
                <SectionTitle id="faq-title" icon={HelpCircle}>
                  Preguntas Frecuentes
                </SectionTitle>

                <div className="space-y-5">
                  {[
                    {
                      q: '¿Qué pasa si el inversionista no aprueba el contrato?',
                      a: 'El contrato queda en "Pendiente de aprobación" indefinidamente. Podés contactar al inversionista y reenviarle el link. Si pidió revisión, volvé a borrador, corregí y reenvialo.',
                    },
                    {
                      q: '¿Puedo editar un contrato activo?',
                      a: 'No. Los contratos activos no se pueden editar para mantener la integridad del acuerdo firmado. Si necesitás cambiar algo, contactá al administrador para crear un addendum.',
                    },
                    {
                      q: '¿Se pueden eliminar pagos?',
                      a: 'Solo los pagos que NO han sido verificados. Una vez verificado, el pago es permanente.',
                    },
                    {
                      q: '¿Qué pasa si el link del portal expira?',
                      a: 'Los links tienen una validez de 1 año. Si expiran, un administrador debe generar uno nuevo desde el detalle del contrato.',
                    },
                    {
                      q: '¿Los emails se envían en desarrollo (localhost)?',
                      a: 'No. En desarrollo, los emails se simulan y aparecen en la consola del servidor. Solo se envían emails reales en producción (Vercel).',
                    },
                  ].map(({ q, a }) => (
                    <div key={q} className="space-y-1.5 border-b border-zinc-100 pb-5 last:border-0 last:pb-0">
                      <p className="text-sm font-semibold text-zinc-900">{q}</p>
                      <p className="text-sm text-zinc-500 leading-relaxed">{a}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Footer */}
            <div className="text-center text-xs text-zinc-400 pb-4">
              Grandir CRM — Sistema interno de Grandir CM SRL
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
