const menuButton = document.querySelector('.menu-button');
const mobileMenu = document.getElementById('mobile-menu');
const form = document.getElementById('lead-form');
const feedback = document.getElementById('form-feedback');
const submitButton = form?.querySelector('button[type="submit"]');

document.getElementById('year').textContent = String(new Date().getFullYear());

menuButton?.addEventListener('click', () => {
  const expanded = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!expanded));
  menuButton.setAttribute('aria-label', expanded ? 'Abrir menú' : 'Cerrar menú');
  mobileMenu.hidden = expanded;
});

mobileMenu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  mobileMenu.hidden = true;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Abrir menú');
}));

document.querySelectorAll('[data-plan]').forEach((link) => {
  link.addEventListener('click', () => {
    const radio = form?.querySelector(`input[name="plan"][value="${link.dataset.plan}"]`);
    if (radio) radio.checked = true;
  });
});

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  feedback.className = 'form-feedback';
  feedback.textContent = '';
  if (!form.reportValidity()) return;

  const data = new FormData(form);
  const payload = {
    nombre: String(data.get('nombre') || ''),
    institucion: String(data.get('institucion') || ''),
    email: String(data.get('email') || ''),
    telefono: String(data.get('telefono') || ''),
    ciudad: String(data.get('ciudad') || ''),
    tipo: String(data.get('tipo') || ''),
    plan: String(data.get('plan') || ''),
    consentimiento: data.get('consentimiento') === 'on',
    consentimiento_sms: data.get('consentimiento_sms') === 'on',
    pagina_empresa: String(data.get('pagina_empresa') || ''),
  };

  submitButton.disabled = true;
  form.querySelector('.submit-text').textContent = 'Enviando solicitud…';
  try {
    const result = await fetch('/api/registrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });
    const body = await result.json().catch(() => ({}));
    if (!result.ok) throw new Error(body.error || 'No se pudo completar el registro.');
    feedback.classList.add('success');
    feedback.textContent = '¡Solicitud registrada! Te contactaremos cuando tengamos novedades de VITALIS.';
    const chosen = payload.plan;
    form.reset();
    const chosenRadio = form.querySelector(`input[name="plan"][value="${chosen}"]`);
    if (chosenRadio) chosenRadio.checked = true;
  } catch (error) {
    feedback.classList.add('error');
    feedback.textContent = error.name === 'TimeoutError'
      ? 'La conexión tardó demasiado. Intenta nuevamente.'
      : (error instanceof TypeError ? 'No pudimos conectar con el servidor de registro.' : error.message);
  } finally {
    submitButton.disabled = false;
    form.querySelector('.submit-text').textContent = 'Enviar mi solicitud';
  }
});
