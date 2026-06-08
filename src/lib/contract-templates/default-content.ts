/**
 * Contenido base de las plantillas de contrato, replicando los machotes reales del cliente.
 *
 * Reglas de formato (markdown-light):
 * - `# TÍTULO` → título principal centrado
 * - `## TÍTULO` → encabezado de sección
 * - `- texto` → bullet
 * - Líneas vacías → separadores
 * - `**texto**` → negrita
 * - `{{var}}` → variable sustituida al renderizar
 */

const COMMON_HEADER = `# GRANDIR CM
# CONTRATO POR SERVICIOS PROFESIONALES

Nosotros **{{investor_name}}**, cédula **{{investor_cedula}}**, en adelante denominado **EL CONTRATANTE** y **{{representative_1_name}}**, cédula **{{representative_1_cedula}}**, en adelante denominada **LA CONTRATISTA**; hemos convenido en celebrar el presente contrato de Servicios Profesionales, el cual se regirá por las normas que regulan la materia y por las siguientes cláusulas:

## PRIMERA: OBLIGACIONES DEL CONTRATISTA
En razón del presente contrato la contratista se obliga a brindar servicios al contratante en el área de **fondos de inversión**.

## SEGUNDA: OBLIGACIONES DEL CONTRATANTE
El contratante se compromete a poner a disposición de la contratista el monto de **{{amount}}**, para la realización de sus funciones.

## TERCERA: PRECIO DEL CONTRATO Y FORMA DE PAGO
El **CONTRATANTE** cancelará a la contratista la suma establecida en la cláusula segunda, pagadera el día **{{start_date}}**, a la **CONTRATISTA** con el método de pago acordado por ambas partes.`

const CLAUSULA_CUARTA_ANUAL = `## CUARTA: PLAZO DE VIGENCIA DEL CONTRATO
El presente contrato se suscribe el día **{{start_date}}**, fecha a partir de la cual entrará en vigencia, el dinero se tendrá en inversión por un plazo de **{{term_months}} MESES**, bajo las siguientes regulaciones:

- El dinero se tendrá en inversión por un plazo de **{{term_months}} MESES** con posibilidad de extensión por un monto de ganancia del **{{annual_rate}}%** anual sobre el capital de inversión.
- Al finalizar el periodo de inversión el día **{{end_date}}**, LA CONTRATISTA hará entrega del porcentaje prometido y del capital inicial.
- LA CONTRATISTA tiene 10 días hábiles desde el vencimiento del contrato para efectuar el pago.`

const CLAUSULA_CUARTA_MENSUAL = `## CUARTA: PLAZO DE VIGENCIA DEL CONTRATO
El presente contrato se suscribe el día **{{start_date}}**, fecha a partir de la cual entrará en vigencia, el dinero se tendrá en inversión por un plazo de **{{term_months}} MESES**, bajo las siguientes regulaciones:

- El dinero se tendrá en inversión por un plazo de **{{term_months}} MESES** con posibilidad de extensión por un monto de ganancia del **{{annual_rate}}%** anual sobre el capital de inversión.
- El plan de la inversión es un plan de retiros mensuales a partir del tercer mes de inversión, ya que los primeros 2 meses no se hace entrega de ningún rendimiento, este retiro es del **10%** mensual, lo cual corresponde a **{{monthly_payment}} mensuales**.
- Al finalizar el periodo de inversión LA CONTRATISTA hará entrega del porcentaje restante prometido y la inversión inicial.
- Los depósitos mensuales quedarán establecidos a partir de **{{start_date}}** y hasta finalizar el plazo del contrato.`

const CLAUSULA_CUARTA_SEMESTRAL = `## CUARTA: PLAZO DE VIGENCIA DEL CONTRATO
El presente contrato se suscribe el día **{{start_date}}**, fecha a partir de la cual entrará en vigencia, el dinero se tendrá en inversión por un plazo de **{{term_months}} MESES**, bajo las siguientes regulaciones:

- El dinero se tendrá en inversión por un plazo de **{{term_months}} MESES** con posibilidad de extensión por un monto de ganancia del **{{annual_rate}}%** anual sobre el capital de inversión.
- El plan de la inversión es un plan de retiros semestrales, por lo cual cada seis meses se entregará una ganancia del **50%** sobre el porcentaje prometido y así sucesivamente cada seis meses según la duración de su contrato. Cada pago corresponde a **{{semestral_payment}}**.
- Al finalizar el periodo de inversión el día **{{end_date}}**, LA CONTRATISTA hará entrega del porcentaje restante prometido y la inversión inicial.`

const COMMON_FOOTER = `## QUINTA: DE LA AUSENCIA DE RELACIÓN LABORAL
El presente contrato se regirá por lo relacionado a servicios profesionales; por lo que entre las partes no se creará ningún tipo de relación laboral.

## SEXTA: MODIFICACIONES
Toda modificación del presente contrato, deberá hacerse constar por escrito y deberá ser firmada tanto por **EL CONTRATANTE** como por **LA CONTRATISTA**.

## SÉTIMA: DEL INCUMPLIMIENTO
a. En caso de que **EL CONTRATANTE** solicite retirar el dinero con anticipación a la fecha de vencimiento del contrato NO recibirá el porcentaje de ganancia acordado en la cláusula **CUARTA**, y deberá notificar a la contratista con previa anticipación, también tendrá una penalización de su capital inicial del **40%** para cubrir gastos operativos.

b. No hay opción de pérdida del capital.

c. El incumplimiento de cualquiera de las partes a las obligaciones que les corresponden de conformidad con este contrato dará derecho a dar por resuelto el mismo, previa comunicación por escrito de los extremos que se tienen por incumplidos.

## OCTAVA: RESPALDO
En caso de muerte o desaparición derivada de un acto delincuencial por parte de **LA CONTRATISTA**, el dinero no se perderá, dicho fondo tiene un respaldo y seguro por medio de la sociedad **{{company_name}}**, cédula jurídica **{{company_cedula}}**, suscrita bajo el gobierno de COSTA RICA.

Sus representantes legales:

- **{{representative_1_name}}**, cédula identidad: **{{representative_1_cedula}}**
- **{{representative_2_name}}**, cédula identidad: **{{representative_2_cedula}}**

## NOVENA: BENEFICIARIOS
Las partes acuerdan que los beneficios, derechos y obligaciones derivados del presente contrato podrán designarse a favor de uno o varios beneficiarios, quienes serán expresamente señalados por el Contratante en el momento de la suscripción o mediante comunicación escrita posterior dirigida al Contratista.

El contratante desea agregar al siguiente contrato los siguientes beneficiarios:

{{beneficiaries_list}}

El Contratista queda obligado a reconocer y respetar los derechos de los beneficiarios debidamente designados, siempre que se cumplan las formalidades establecidas en la presente cláusula y en la legislación aplicable.

## DÉCIMA: CLÁUSULA DE MEDIOS DE CONTACTO
Para todos los efectos derivados del presente contrato, las partes señalan como medios oficiales de contacto los siguientes:

**1. CONTRATANTE:**
{{investor_name}}, correo electrónico: {{investor_email}}, teléfono: {{investor_phone}}.

**2. CONTRATISTA:**
{{representative_1_name}}, correos electrónicos: apri2901@gmail.com y info.grandircm@gmail.com.

Cualquier notificación, comunicación o gestión relacionada con el presente contrato deberá realizarse mediante los correos electrónicos antes indicados. Las partes se obligan a informar por escrito cualquier cambio en sus medios de contacto con al menos cinco (5) días naturales de antelación; de lo contrario, las notificaciones enviadas a los correos aquí consignados se considerarán válidamente realizadas.

## UNDÉCIMA: DE LOS DAÑOS Y PERJUICIOS
El incumplimiento de alguna de las cláusulas quedará sujeto a la indemnización de los daños y perjuicios que puedan llegar a causar en razón del incumplimiento de sus obligaciones.

**ES TODO.** Ambas partes manifestamos nuestra conformidad con las anteriores disposiciones y en fe de lo anterior firmamos en la ciudad de **Alajuela** el **{{start_date}}**.`

export const DEFAULT_ANUAL_CONTENT = `${COMMON_HEADER}

${CLAUSULA_CUARTA_ANUAL}

${COMMON_FOOTER}`

export const DEFAULT_MENSUAL_CONTENT = `${COMMON_HEADER}

${CLAUSULA_CUARTA_MENSUAL}

${COMMON_FOOTER}`

export const DEFAULT_SEMESTRAL_CONTENT = `${COMMON_HEADER}

${CLAUSULA_CUARTA_SEMESTRAL}

${COMMON_FOOTER}`

export function defaultContentForPlanType(planType: 'annual' | 'monthly' | 'semestral'): string {
  switch (planType) {
    case 'annual':
      return DEFAULT_ANUAL_CONTENT
    case 'monthly':
      return DEFAULT_MENSUAL_CONTENT
    case 'semestral':
      return DEFAULT_SEMESTRAL_CONTENT
  }
}
