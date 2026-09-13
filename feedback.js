const form = document.getElementById('feedbackForm');
const thanksMessage = document.getElementById('thanksMessage');
const submitBtn = form.querySelector('button[type="submit"]');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.textContent = '보내는 중...';

  try {
    const res = await fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      form.hidden = true;
      thanksMessage.hidden = false;
    } else {
      throw new Error('submit failed');
    }
  } catch (err) {
    alert('전송에 실패했습니다. 잠시 후 다시 시도해주세요.');
    submitBtn.disabled = false;
    submitBtn.textContent = '건의사항 보내기';
  }
});
