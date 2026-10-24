// Función serverless para Vercel: ninguna credencial de Supabase o Twilio llega al navegador.
export const PLANES = Object.freeze({ inicial: 89, profesional: 149, centro: 219, institucional: 299, enterprise: null });
export const TIPOS = Object.freeze(['consultorio', 'centro_medico', 'laboratorio', 'clinica', 'hospital', 'red', 'otro']);

function json(status, payload) {
  return new Response(JSON.stringify(payload), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  } });
}

const text = (input, max) => typeof input === 'string' ? input.trim().replace(/\s+/g, ' ').slice(0, max + 1) : '';

function normalizePhone(value) {
  if (typeof value !== 'string') return null;
  const phone = value.trim().replace(/[\s().-]/g, '');
  if (/^[67]\d{7}$/.test(phone)) return `+591${phone}`;
  if (/^591[67]\d{7}$/.test(phone)) return `+${phone}`;
  if (/^\+[1-9]\d{7,14}$/.test(phone)) return phone;
  return null;
}

export function validateLead(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const nombre = text(input.nombre, 100);
  const institucion = text(input.institucion, 140);
  const email = text(input.email, 180).toLowerCase();
  const telefono = normalizePhone(input.telefono);
  const ciudad = text(input.ciudad, 80);
  const tipo = input.tipo;
  const plan = input.plan;
  if (nombre.length < 2 || nombre.length > 100 || institucion.length < 2 || institucion.length > 140 || ciudad.length < 2 || ciudad.length > 80) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180 || !telefono) return null;
  if (!TIPOS.includes(tipo) || !Object.hasOwn(PLANES, plan) || input.consentimiento !== true || typeof input.consentimiento_sms !== 'boolean') return null;
  return {
    nombre, institucion, email, telefono, ciudad, tipo, plan,
    precio_bs: PLANES[plan], consentimiento: true,
    consentimiento_sms: input.consentimiento_sms, origen: 'landing_vitalis',
  };
}

async function sendSms(lead) {
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM_NUMBER: from } = process.env;
  if (!lead.consentimiento_sms || !sid || !token || !from) return false;
  const body = new URLSearchParams({
    To: lead.telefono, From: from,
    Body: `VITALIS: recibimos tu interés en el plan ${lead.plan}. Es solo una solicitud de información, sin cobro ni contratación. Gracias.`,
  });
  const result = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: body.toString(), signal: AbortSignal.timeout(6500),
  });
  if (!result.ok) throw new Error(`Twilio respondió ${result.status}`);
  return true;
}

export default {
  async fetch(request) {
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json(415, { error: 'El contenido debe ser JSON.' });
    let payload;
    try {
      const raw = await request.text();
      if (raw.length > 7000) return json(413, { error: 'El formulario es demasiado grande.' });
      payload = JSON.parse(raw);
    } catch { return json(400, { error: 'La solicitud no es válida.' }); }
    // Honeypot: no añadir registros de robots.
    if (typeof payload?.pagina_empresa === 'string' && payload.pagina_empresa.trim()) return json(201, { ok: true });
    const lead = validateLead(payload);
    if (!lead) return json(400, { error: 'Revisa los campos del formulario y tu consentimiento.' });

    const { SUPABASE_URL: url, SUPABASE_SECRET_KEY: key } = process.env;
    if (!url || !key) return json(503, { error: 'El registro todavía no está habilitado. Vuelve a intentarlo más adelante.' });
    try {
      const saved = await fetch(`${url.replace(/\/$/, '')}/rest/v1/vitalis_interesados`, {
        method: 'POST',
        headers: { apikey: key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(lead), signal: AbortSignal.timeout(8000),
      });
      if (!saved.ok) {
        const issue = await saved.json().catch(() => ({}));
        if (issue.code === '23505') return json(409, { error: 'Ya existe una solicitud asociada a ese correo.' });
        console.error('Error al insertar en Supabase', saved.status, issue.code || 'sin código');
        return json(502, { error: 'No se pudo guardar tu solicitud. Intenta más tarde.' });
      }
      // El SMS opcional no afecta la persistencia del registro.
      if (lead.consentimiento_sms) {
        try { await sendSms(lead); } catch (error) { console.warn('SMS no enviado después de guardar:', error.message); }
      }
      return json(201, { ok: true });
    } catch (error) {
      console.error('Error de conexión en registro:', error.name);
      return json(502, { error: 'Hubo un problema de conexión. Intenta otra vez.' });
    }
  },
};
