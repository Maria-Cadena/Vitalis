# VITALIS — landing page comercial con visor 3D

Sitio web de **VITALIS**, propuesta de SaaS para gestión de instituciones de salud en Bolivia. Diseñado con HTML, CSS y JavaScript, con Three.js local para una escultura conceptual 3D de salud digital y una función JavaScript de Vercel que registra interesados en Supabase. Incluye SMS opcional mediante Twilio, sujeto a consentimiento.

> **Importante:** esta es una landing de presentación y captación de interés, no un software médico operativo, ni una plataforma de diagnóstico, pagos, historias clínicas o alta automática de tenants. Los módulos, funcionalidades y precios se describen como **propuestos/referenciales**. La visualización 3D es simbólica y no es un modelo anatómico.

## Archivos

| Archivo | Función |
| --- | --- |
| `index.html` | Landing, logotipo y formulario |
| `styles.css` | Diseño responsive, azul y turquesa corporativos |
| `script.js` | Menú, selección de plan y envío seguro |
| `health-3d.js` | Modelo 3D interactivo procedimental del corazón simbólico |
| `assets/vitalis-logo.png` | Logotipo de referencia de la empresa, aislado desde la imagen suministrada |
| `vendor/` | Three.js y controles OrbitControls con su licencia |
| `api/registrar.mjs` | Función serverless: Supabase + Twilio opcional |
| `supabase.sql` | Estructura de la tabla y protección de acceso |
| `.env.example` | Variables privadas necesarias |
| `vercel.json` | Configuración de cabeceras del hosting |
| `registrar.test.mjs` | Pruebas automáticas de validación e integración simulada |

## 1. Crear Supabase

1. En [Supabase](https://supabase.com/dashboard), crea un proyecto para **captar interesados**, separado de las bases clínicas de VITALIS.
2. Abre **SQL Editor**, pega `supabase.sql` y ejecútalo. Se creará `public.vitalis_interesados` con los campos `nombre`, `institucion`, `email`, `telefono`, `ciudad`, `tipo`, `plan`, `precio_bs`, consentimientos, estado y fecha.
3. Copia la URL del proyecto y la clave **secreta** de acceso del servidor (en instalaciones antiguas puede llamarse `service_role`). No utilices la clave pública `anon` para la función si la tabla no expone políticas públicas.
4. Esta tabla tiene RLS activado. Solo la función del servidor debe utilizar la clave con privilegios. No crees una política pública para leer los registros.

## 2. Subir a GitHub

1. Extrae el ZIP y entra en la carpeta `vitalis-landing`.
2. Crea un repositorio vacío en GitHub, por ejemplo `vitalis-landing`.
3. En esa carpeta ejecuta, sustituyendo la URL por tu repositorio:

```bash
git init
git add .
git commit -m "Landing VITALIS 3D, planes y registro"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/vitalis-landing.git
git push -u origin main
```

Nunca subas un archivo `.env` con secretos.

## 3. Conectar GitHub con Vercel

1. En [Vercel](https://vercel.com/new) pulsa **Add New → Project** e importa tu repositorio de GitHub.
2. Para este sitio HTML/CSS/JS selecciona **Framework Preset: Other**. La carpeta raíz es `./` si subiste solo el contenido de `vitalis-landing`. No requiere build ni directorio de salida personalizado.
3. En **Settings → Environment Variables** crea:

   - `SUPABASE_URL` = URL del proyecto de Supabase.
   - `SUPABASE_SECRET_KEY` = clave secreta del servidor con acceso a la tabla.

4. Haz **Deploy** (o **Redeploy** si añadiste las variables después). La URL pública será algo como `https://tu-proyecto.vercel.app/`.
5. Abre esa URL y registra un correo de prueba. Confirma en Supabase → **Table Editor** que el registro aparece en `vitalis_interesados`. La página guardará **qué plan quiere** cada persona.

El sitio estático se puede previsualizar en local, pero el botón **Enviar mi solicitud** necesita la función `/api/registrar` de Vercel; al abrir `index.html` como archivo local no funcionará el registro.

## 4. Twilio, opcional

Para SMS de confirmación:

1. Obtén una cuenta y un emisor SMS habilitado en [Twilio](https://console.twilio.com/).
2. En Vercel agrega `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`.
3. Redeploy. El servidor enviará un SMS solo a interesados que marquen la casilla **opcional**.
4. Verifica que el emisor de Twilio pueda enviar a números bolivianos y que tu cuenta tenga los permisos/saldo necesarios. Si Twilio falla, el registro guardado en Supabase se conserva.

No expongas tokens de Twilio en `script.js`, HTML o GitHub.

## 5. Planes que aparecen en la landing

| Plan | Mensualidad de referencia |
| --- | ---: |
| Inicial | Bs 89 |
| Profesional | Bs 149 |
| Centro | Bs 219 |
| Institucional | Bs 299 |
| Enterprise | Cotización individual |

El formulario permite seleccionar cualquiera de ellos. Son **precios ilustrativos, no cobros reales**. No hay pasarela de pagos ni provisionamiento de tenants.

## 6. Visor 3D

El usuario puede girar la escultura de un corazón simbólico arrastrando, acercarla con rueda/pellizco, pausar la rotación y restaurar la vista. El modelo se genera en tiempo real con Three.js sin descargar activos externos. Si el navegador no soporta WebGL, aparece una ilustración de reserva.

Si necesitas representar un órgano con anatomía exacta para uso académico o clínico, será necesario sustituir esta escultura por un modelo validado y con licencia de uso; el modelo de esta landing no cumple ese fin.

## 7. Pruebas y privacidad

Desde la carpeta raíz:

```bash
node --version
npm test
```

Se requieren Node.js 20 o superior para las pruebas locales. La función valida campos y consentimientos, limita tamaño de solicitud y rechaza duplicados de correo; la tabla no es pública. Para una campaña abierta de alto tráfico, añade protección antispam/rate limiting y el aviso de privacidad adaptado a la institución antes de recoger datos reales.

**No usar** este formulario para pacientes ni para información clínica. Debe existir una política de privacidad y un canal para solicitar actualización o eliminación de datos de contacto antes de campañas reales.

---

VITALIS — *La gestión vital, en un solo lugar.*
