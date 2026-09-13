if (new URLSearchParams(location.search).get('sent') === '1') {
  document.getElementById('feedbackForm').hidden = true;
  document.getElementById('thanksMessage').hidden = false;
}
