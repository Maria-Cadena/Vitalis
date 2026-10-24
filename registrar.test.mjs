import test from 'node:test';
import assert from 'node:assert/strict';
import registrar, { validateLead } from './api/registrar.mjs';

const valid = {
  nombre: 'María Castro', institucion: 'Centro Médico Vida', email: 'MARIA@ejemplo.com',
  telefono: '71234567', ciudad: 'Tarija', tipo: 'centro_medico', plan: 'centro',
  consentimiento: true, consentimiento_sms: false,
};

function request(payload, method = 'POST') {
  return new Request('https://vitalis.vercel.app/api/registrar', {
    method,
    ...(method !== 'POST' ? {} : {
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  });
}

async function withFakeServices(callback) {
  const originalFetch = globalThis.fetch;
  const names = ['SUPABASE_URL','SUPABASE_SECRET_KEY','TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_FROM_NUMBER'];
  const originalEnv = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  try {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_FROM_NUMBER;
    return await callback();
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('plan centro, correo y teléfono normalizados', () => {
  const lead = validateLead(valid);
  assert.equal(lead.precio_bs, 219);
  assert.equal(lead.email, 'maria@ejemplo.com');
  assert.equal(lead.telefono, '+59171234567');
  assert.equal(validateLead({ ...valid, plan: 'no_existe' }), null);
  assert.equal(validateLead({ ...valid, consentimiento: false }), null);
});

test('precios de los cuatro planes', () => {
  for (const [plan, precio] of Object.entries({
    inicial: 89, profesional: 149, centro: 219, institucional: 299,
  })) {
    assert.equal(validateLead({ ...valid, plan }).precio_bs, precio);
  }
});

test('Enterprise tiene precio personalizado', () => {
  assert.equal(validateLead({ ...valid, plan: 'enterprise' }).precio_bs, null);
});

test('rechaza datos incompletos', async () => {
  assert.equal((await registrar.fetch(request({ ...valid, email: 'invalido' }))).status, 400);
  assert.equal((await registrar.fetch(request({ ...valid, tipo: 'otro_tipo' }))).status, 400);
  assert.equal((await registrar.fetch(request(undefined, 'GET'))).status, 405);
});

test('la función guarda en la tabla privada de Supabase', async () => withFakeServices(async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); return new Response(null, { status: 201 }); };
  const result = await registrar.fetch(request(valid));
  assert.equal(result.status, 201);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://example.supabase.co/rest/v1/vitalis_interesados');
  assert.equal(calls[0].options.headers.apikey, 'sb_secret_test');
  const saved = JSON.parse(calls[0].options.body);
  assert.equal(saved.precio_bs, 219);
  assert.equal(saved.institucion, valid.institucion);
}));

test('un email duplicado responde 409', async () => withFakeServices(async () => {
  globalThis.fetch = async () => Response.json({ code: '23505' }, { status: 409 });
  const result = await registrar.fetch(request(valid));
  assert.equal(result.status, 409);
}));

test('SMS por Twilio solo si se acepta y configura', async () => withFakeServices(async () => {
  process.env.TWILIO_ACCOUNT_SID = 'AC_test';
  process.env.TWILIO_AUTH_TOKEN = 'auth_test';
  process.env.TWILIO_FROM_NUMBER = '+15005550006';
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(null, { status: 201 });
  };
  const result = await registrar.fetch(request({ ...valid, consentimiento_sms: true }));
  assert.equal(result.status, 201);
  assert.equal(calls.length, 2);
  assert.match(calls[1].url, /api\.twilio\.com/);
  assert.match(calls[1].options.body, /To=%2B59171234567/);
}));

test('si falla SMS no se pierde registro', async () => withFakeServices(async () => {
  process.env.TWILIO_ACCOUNT_SID = 'AC_test';
  process.env.TWILIO_AUTH_TOKEN = 'auth_test';
  process.env.TWILIO_FROM_NUMBER = '+15005550006';
  globalThis.fetch = async (url) => String(url).includes('twilio')
    ? Response.json({ message: 'unavailable' }, { status: 400 })
    : new Response(null, { status: 201 });
  assert.equal((await registrar.fetch(request({ ...valid, consentimiento_sms: true }))).status, 201);
}));
