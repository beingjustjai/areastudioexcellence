/* ============================================
   AREA Discovery Questionnaire Engine
   Handles: step navigation, validation-light UX,
   local persistence via window.storage, and
   confirmation screen.
   ============================================ */

class DiscoveryForm {
  constructor({ formEl, sections, storageKeyPrefix, formLabel }) {
    this.formEl = formEl;
    this.sections = sections; // array of {title, fields:[{id,label,type,options}]}
    this.storageKeyPrefix = storageKeyPrefix;
    this.formLabel = formLabel;
    this.current = 0;
    this.answers = {};
    this.render();
  }

  fieldHtml(field) {
    const val = this.answers[field.id] || '';
    if (field.type === 'textarea') {
      return `<textarea class="df-input" data-field="${field.id}" rows="3" placeholder="${field.placeholder||''}">${val}</textarea>`;
    }
    if (field.type === 'scale') {
      let opts = '';
      for (let i = 1; i <= 10; i++) {
        opts += `<button type="button" class="df-scale-btn ${val==i?'active':''}" data-field="${field.id}" data-val="${i}">${i}</button>`;
      }
      return `<div class="df-scale">${opts}</div>`;
    }
    return `<input class="df-input" type="text" data-field="${field.id}" value="${val.replace ? val.replace(/"/g,'&quot;') : val}" placeholder="${field.placeholder||''}">`;
  }

  render() {
    const total = this.sections.length;
    const section = this.sections[this.current];
    const progressPct = Math.round(((this.current) / total) * 100);

    let fieldsHtml = section.fields.map(f => `
      <div class="df-field">
        <label>${f.label}${f.optional ? ' <span class="df-optional">(optional)</span>' : ''}</label>
        ${this.fieldHtml(f)}
      </div>
    `).join('');

    let stepsIndicator = this.sections.map((s, i) => `
      <div class="df-step-dot ${i===this.current?'active':''} ${i<this.current?'done':''}">
        <span class="star">${i < this.current ? '✓' : ''}</span>
      </div>
    `).join('<div class="df-step-line"></div>');

    this.formEl.innerHTML = `
      <div class="df-progress-track"><div class="df-progress-fill" style="width:${progressPct}%"></div></div>
      <div class="df-steps-row">${stepsIndicator}</div>
      <div class="df-section-label">Section ${this.current+1} of ${total}</div>
      <h3 class="df-section-title">${section.title}</h3>
      ${section.subtitle ? `<p class="df-section-sub">${section.subtitle}</p>` : ''}
      <div class="df-fields">${fieldsHtml}</div>
      <div class="df-nav">
        ${this.current > 0 ? `<button type="button" class="btn btn-outline-navy" id="df-back">Back</button>` : '<span></span>'}
        ${this.current < total - 1
          ? `<button type="button" class="btn btn-gold" id="df-next">Continue</button>`
          : `<button type="button" class="btn btn-gold" id="df-submit">Submit Discovery Profile</button>`}
      </div>
    `;

    this.bindEvents();
    this.formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  bindEvents() {
    this.formEl.querySelectorAll('.df-input').forEach(el => {
      el.addEventListener('input', (e) => {
        this.answers[e.target.dataset.field] = e.target.value;
      });
    });
    this.formEl.querySelectorAll('.df-scale-btn').forEach(el => {
      el.addEventListener('click', (e) => {
        const field = e.target.dataset.field;
        this.answers[field] = e.target.dataset.val;
        this.formEl.querySelectorAll(`.df-scale-btn[data-field="${field}"]`).forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
      });
    });
    const back = this.formEl.querySelector('#df-back');
    if (back) back.addEventListener('click', () => { this.current--; this.render(); });
    const next = this.formEl.querySelector('#df-next');
    if (next) next.addEventListener('click', () => { this.current++; this.render(); });
    const submit = this.formEl.querySelector('#df-submit');
    if (submit) submit.addEventListener('click', () => this.submit());
  }

  async submit() {
    const submission = {
      form: this.formLabel,
      submittedAt: new Date().toISOString(),
      answers: this.answers
    };
    const key = `${this.storageKeyPrefix}:${Date.now()}`;

    // Save locally as a backup record
    try {
      if (window.storage) {
        await window.storage.set(key, JSON.stringify(submission), false);
      }
    } catch (err) {
      console.error('Storage error', err);
    }

    // Submit to Netlify Forms so AREA receives an email notification
    try {
      const formData = new URLSearchParams();
      formData.append('form-name', this.storageKeyPrefix);
      formData.append('submitted-at', submission.submittedAt);
      Object.entries(this.answers).forEach(([k, v]) => formData.append(k, v));

      await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      });
    } catch (err) {
      console.error('Netlify Forms submission error', err);
    }

    this.showConfirmation();
  }

  showConfirmation() {
    this.formEl.innerHTML = `
      <div class="df-confirm">
        <div class="df-confirm-star"><img src="images/brand/compass_star_new.png" alt=""></div>
        <h3>Thank You. Your Profile Has Been Received.</h3>
        <p>Your responses have been saved and will inform your upcoming Executive Discovery Session with AREA Studio Excellence™.</p>
        <p class="df-confirm-note">No assumptions. Just answers. We'll be in touch to schedule your session.</p>
        <a href="index.html" class="btn btn-outline-navy" style="margin-top:1.5rem;">Return to Home</a>
      </div>
    `;
    this.formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
