// Initialize Supabase
const supabase = supabase.createClient(
    'https://gvnzckeyeypbpvqzzepr.supabase.co',
    'your-public-anon-key-here'
  );
  
  // Auth
  document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
  
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  
    if (error) {
      document.getElementById('login-error').textContent = error.message;
    } else {
      showApp(data.user.email);
    }
  });
  
  document.getElementById('magic-link-btn').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
  
    const { error } = await supabase.auth.signInWithOtp({ email });
    document.getElementById('login-error').textContent = error ? error.message : 'Magic link sent!';
  });
  
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
  });
  
  function showApp(userEmail) {
    document.getElementById('current-user').textContent = userEmail;
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
  }
  
  // QR Scanner
  let scanner;
  document.getElementById('start-scanner').addEventListener('click', () => {
    scanner = new Instascan.Scanner({ video: document.getElementById('qr-video') });
    scanner.addListener('scan', content => {
      document.getElementById('garment-id').value = content;
      scanner.stop();
      document.getElementById('stop-scanner').classList.add('hidden');
    });
  
    Instascan.Camera.getCameras().then(cameras => {
      if (cameras.length > 0) {
        scanner.start(cameras[0]);
        document.getElementById('stop-scanner').classList.remove('hidden');
      } else {
        alert('No camera found');
      }
    });
  });
  
  document.getElementById('stop-scanner').addEventListener('click', () => {
    if (scanner) scanner.stop();
    document.getElementById('stop-scanner').classList.add('hidden');
  });
  
  // Save Garment
  document.getElementById('save-garment').addEventListener('click', async () => {
    const id = document.getElementById('garment-id').value;
    const name = document.getElementById('customer-name').value;
    const desc = document.getElementById('garment-desc').value;
    const rack = document.getElementById('rack-select').value;
    const section = document.getElementById('section-select').value;
    const date = document.getElementById('storage-date').value;
  
    const { error } = await supabase.from('garments').insert([{ id, name, desc, rack, section, date }]);
  
    document.getElementById('save-status').textContent = error ? error.message : 'Saved successfully!';
  });
  
  // Search Garment
  document.getElementById('search-btn').addEventListener('click', async () => {
    const input = document.getElementById('search-input').value;
  
    const { data, error } = await supabase.from('garments')
      .select('*')
      .ilike('name', `%${input}%`);
  
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '';
  
    if (error) {
      resultsContainer.textContent = error.message;
      return;
    }
  
    if (data.length === 0) {
      resultsContainer.textContent = 'No garments found.';
      return;
    }
  
    data.forEach(item => {
      const div = document.createElement('div');
      div.classList.add('result-card');
      div.innerHTML = `
        <strong>${item.name}</strong><br>
        ID: ${item.id}<br>
        Desc: ${item.desc}<br>
        Rack: ${item.rack}, Section: ${item.section}<br>
        Date: ${item.date}
      `;
      resultsContainer.appendChild(div);
    });
  });
  