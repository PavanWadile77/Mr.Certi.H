import{initializeApp}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";import{getAuth,onAuthStateChanged,signOut}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";import{getFirestore,collection,doc,getDoc,getDocs,query,where,updateDoc}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig={apiKey:"AIzaSyBuTV1Yeh77iWt8nJ8V09gUNUhagyhg4iY",authDomain:"mr-certi.firebaseapp.com",projectId:"mr-certi",storageBucket:"mr-certi.firebasestorage.app",messagingSenderId:"60676407665",appId:"1:60676407665:web:1113311464e6b6dc45b6d0",measurementId:"G-CRDZXN6TYD"};
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
let currentUser=null;

function toast(msg,type='info'){let c=document.getElementById('toastContainer');const t=document.createElement('div');t.className=`toast toast-${type}`;t.textContent=msg;c.appendChild(t);setTimeout(()=>{t.classList.add('fadeout');setTimeout(()=>t.remove(),300)},3500)}

onAuthStateChanged(auth,async u=>{if(!u){window.location.href='index.html';return}
// Failsafe to hide loader
setTimeout(() => {
  const loader = document.getElementById('pageLoading');
  if (loader && loader.style.display !== 'none') {
    loader.style.display = 'none';
    document.getElementById('dashboardWrapper').style.display='flex';
  }
}, 8000);
let isParticipant = false;
let userData = null;

try {
  const d = await Promise.race([getDoc(doc(db,'users',u.uid)), new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),5000))]);
  if (d.exists()) {
    userData = d.data();
    if (userData.role === 'participant') {
      isParticipant = true;
    }
  }
} catch(e) {
  console.warn('Firestore unavailable:',e.message);
}

const savedRole = localStorage.getItem('mr_certi_role');
// Default behavior: if no role is found in DB but localStorage says participant, we let them in.
// If localStorage says organizer, or DB says organizer, kick out to index.
if (savedRole === 'organizer' || (userData && userData.role === 'organizer')) {
  window.location.href = 'index.html';
  return;
}

userData = userData || { name: localStorage.getItem('mr_certi_name') || 'Participant', email: u.email, role: 'participant' };
currentUser={uid:u.uid,...userData};document.getElementById('userName').textContent=currentUser.name||'Participant';document.getElementById('userAvatar').textContent=(currentUser.name||'P')[0].toUpperCase();document.getElementById('heroGreeting').textContent=`Welcome, ${currentUser.name||'Participant'}!`;document.getElementById('profileName').textContent=currentUser.name;document.getElementById('profileEmail').textContent=currentUser.email;document.getElementById('profileAvatar').textContent=(currentUser.name||'P')[0].toUpperCase();document.getElementById('editName').value=currentUser.name||'';
document.getElementById('pageLoading').style.display='none';document.getElementById('dashboardWrapper').style.display='flex';try{await loadCerts()}catch(e){console.warn('loadCerts error:',e)}});

async function loadCerts(){try{
// Try matching by email
const snap=await getDocs(query(collection(db,'participants'),where('email','==',currentUser.email)));
const certs=[];snap.forEach(d=>{const data=d.data();if(data.certificateUrl)certs.push({id:d.id,...data})});
const container=document.getElementById('certsContainer');
if(!certs.length){container.innerHTML='<div class="table-empty" style="padding:60px"><span class="empty-icon">📜</span><br/>No certificates available yet.<br/><span style="font-size:.8rem;color:var(--gray-400)">Certificates will appear here once issued by an organizer.</span></div>';document.getElementById('heroSubtext').textContent='No certificates issued yet';return}

document.getElementById('heroSubtext').textContent=`You have ${certs.length} certificate${certs.length>1?'s':''}`;
container.innerHTML=certs.map(c=>`
<div class="cert-view-card" style="margin-bottom:24px">
  <div class="cert-view-header">
    <div class="cert-view-badge">🏆</div>
    <div class="cert-view-subtitle">Certificate of Achievement</div>
    <div class="cert-view-name">${c.name}</div>
    <div class="cert-view-text">Certificate has been issued</div>
    <div style="margin-top:16px">
      <img src="${c.certificateUrl}" style="max-width:100%;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.1)" alt="Certificate" onerror="this.style.display='none'"/>
    </div>
  </div>
  <div class="cert-view-body">
    <div class="cert-view-meta">
      <div class="cert-meta-item"><label>Status</label><span>${c.status==='sent'?'✅ Delivered':'📋 Generated'}</span></div>
      <div class="cert-meta-item"><label>Email</label><span>${c.email}</span></div>
    </div>
    <div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap">
      <a href="${c.certificateUrl}" download="${c.name}_certificate.png" class="btn-primary" style="text-decoration:none;display:inline-flex;align-items:center;gap:8px">⬇ Download Certificate</a>
      <a href="${c.certificateUrl}" target="_blank" class="btn-ghost" style="text-decoration:none;display:inline-flex;align-items:center;gap:8px">🔍 View Full Size</a>
    </div>
  </div>
</div>`).join('')}catch(e){console.error(e);document.getElementById('certsContainer').innerHTML='<div class="table-empty" style="padding:60px"><span class="empty-icon">⚠️</span><br/>Error loading certificates</div>'}}

// Panel nav
document.querySelectorAll('.nav-item[data-panel]').forEach(n=>n.addEventListener('click',()=>{document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));document.getElementById('panel-'+n.dataset.panel)?.classList.add('active');document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));n.classList.add('active')}));

// Mobile sidebar
document.getElementById('menuBtn')?.addEventListener('click',()=>{document.getElementById('sidebar').classList.toggle('open');document.getElementById('sidebarOverlay').classList.toggle('show')});
document.getElementById('sidebarOverlay')?.addEventListener('click',()=>{document.getElementById('sidebar').classList.remove('open');document.getElementById('sidebarOverlay').classList.remove('show')});

// Logout
document.getElementById('logoutBtn')?.addEventListener('click',async()=>{await signOut(auth);window.location.href='index.html'});

// Update profile
document.getElementById('updateProfileBtn')?.addEventListener('click',async()=>{const name=document.getElementById('editName').value.trim();if(!name){toast('Name cannot be empty','warning');return}
try{await updateDoc(doc(db,'users',currentUser.uid),{name});currentUser.name=name;document.getElementById('userName').textContent=name;document.getElementById('profileName').textContent=name;document.getElementById('userAvatar').textContent=name[0].toUpperCase();document.getElementById('profileAvatar').textContent=name[0].toUpperCase();document.getElementById('heroGreeting').textContent=`Welcome, ${name}!`;toast('Profile updated!','success')}catch(e){toast('Error: '+e.message,'error')}});
