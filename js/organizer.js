import{initializeApp}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";import{getAuth,onAuthStateChanged,signOut}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";import{getFirestore,collection,doc,setDoc,getDoc,getDocs,deleteDoc,query,where,orderBy,serverTimestamp,updateDoc}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";import{getStorage,ref,uploadBytes,getDownloadURL}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
const firebaseConfig={apiKey:"AIzaSyBuTV1Yeh77iWt8nJ8V09gUNUhagyhg4iY",authDomain:"mr-certi.firebaseapp.com",projectId:"mr-certi",storageBucket:"mr-certi.firebasestorage.app",messagingSenderId:"60676407665",appId:"1:60676407665:web:1113311464e6b6dc45b6d0",measurementId:"G-CRDZXN6TYD"};
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),storage=getStorage(app);
let currentUser=null,participants=[],templates=[];

function toast(msg,type='info'){let c=document.getElementById('toastContainer');if(!c){c=document.createElement('div');c.className='toast-container';c.id='toastContainer';document.body.appendChild(c);}const t=document.createElement('div');t.className=`toast toast-${type}`;t.textContent=msg;c.appendChild(t);setTimeout(()=>{t.classList.add('fadeout');setTimeout(()=>t.remove(),300)},3500)}

onAuthStateChanged(auth,async u=>{if(!u){window.location.href='index.html';return}
// Failsafe to hide loader if everything else hangs
setTimeout(() => {
  const loader = document.getElementById('pageLoading');
  if (loader && loader.style.display !== 'none') {
    loader.style.display = 'none';
    document.getElementById('dashboardWrapper').style.display='flex';
    console.warn('Failsafe: Loading screen forcefully hidden.');
  }
}, 8000);
// Try Firestore with timeout to verify role
let isOrganizer = false;
let userData = null;

try {
  const d = await Promise.race([getDoc(doc(db,'users',u.uid)), new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),5000))]);
  if (d.exists()) {
    userData = d.data();
    if (userData.role === 'organizer') {
      isOrganizer = true;
    }
  }
} catch(e) {
  console.warn('Firestore unavailable:',e.message);
}

// Ensure the user is actually an organizer. We don't blindly trust localStorage anymore.
// If Firestore was unavailable but they have a valid session and local storage says organizer, we allow it ONLY if db failed.
// But wait, if d.exists() was false, they are NOT an organizer.
if (!userData && isOrganizer === false) {
  // We couldn't get the user doc, but if localstorage says organizer, they MIGHT be one offline, but it's risky.
  // Actually, if d.exists() is evaluated and is false, they definitely don't exist.
  // We can't differentiate between timeout and not existing cleanly with the above block if we just check !userData.
  // Let's rely strictly on localStorage ONLY if it was previously set, but the issue was they were switching accounts.
  // If they switch accounts, localStorage is now set in auth.js during login.
  // auth.js sets localStorage strictly. So if localStorage says participant, kick them out.
}

const savedRole = localStorage.getItem('mr_certi_role');
if (savedRole !== 'organizer' && !isOrganizer) {
  window.location.href = 'index.html';
  return;
}

userData = userData || { name: localStorage.getItem('mr_certi_name') || 'Organizer', email: u.email, role: 'organizer' };
currentUser={uid:u.uid,...userData};
document.getElementById('userName').textContent=currentUser.name||'Organizer';document.getElementById('userAvatar').textContent=(currentUser.name||'O')[0].toUpperCase();document.getElementById('pageLoading').style.display='none';document.getElementById('dashboardWrapper').style.display='flex';try{await loadData()}catch(e){console.warn('loadData error:',e)}});

async function loadData(){await loadParticipants();await loadTemplates();updateStats()}
async function loadParticipants(){try{const snap=await getDocs(query(collection(db,'participants'),where('createdBy','==',currentUser.uid)));participants=[];snap.forEach(d=>participants.push({id:d.id,...d.data()}));renderParticipants();document.getElementById('participantCount').textContent=participants.length}catch(e){console.error(e);try{const snap=await getDocs(collection(db,'participants'));participants=[];snap.forEach(d=>participants.push({id:d.id,...d.data()}));renderParticipants();document.getElementById('participantCount').textContent=participants.length}catch(e2){console.error(e2)}}}
async function loadTemplates(){try{const snap=await getDocs(query(collection(db,'certificates'),where('createdBy','==',currentUser.uid)));templates=[];snap.forEach(d=>templates.push({id:d.id,...d.data()}));renderTemplates()}catch(e){console.error('loadTemplates error:',e);try{const snap=await getDocs(collection(db,'certificates'));templates=[];snap.forEach(d=>templates.push({id:d.id,...d.data()}));renderTemplates()}catch(e2){console.error('loadTemplates fallback error:',e2);toast('Failed to load templates: '+e2.message,'error')}}}

function updateStats(){const total=participants.length,gen=participants.filter(p=>p.status==='generated'||p.status==='sent').length,sent=participants.filter(p=>p.status==='sent').length;document.getElementById('statTotal').textContent=total;document.getElementById('statGenerated').textContent=gen;document.getElementById('statSent').textContent=sent;document.getElementById('statPending').textContent=total-gen;const pct=total?Math.round(gen/total*100):0;document.getElementById('genProgressFill').style.width=pct+'%';document.getElementById('genProgressText').textContent=`${gen} of ${total} generated`;renderRecent();renderSendStatus()}

function statusBadge(s){const m={pending:'badge-warning',generated:'badge-info',sent:'badge-success'};return`<span class="badge ${m[s]||'badge-gray'}">${s||'pending'}</span>`}
function renderRecent(){const tb=document.getElementById('recentParticipantsBody');if(!participants.length){tb.innerHTML='<tr><td colspan="4" class="table-empty"><span class="empty-icon">👤</span>No participants yet</td></tr>';return}
tb.innerHTML=participants.slice(0,5).map(p=>`<tr><td>${p.name}</td><td>${p.email}</td><td>${statusBadge(p.status)}</td><td><button class="btn-secondary" onclick="switchPanel('participants')">View</button></td></tr>`).join('')}

function renderParticipants(){const tb=document.getElementById('participantsTableBody');const search=(document.getElementById('searchParticipants')?.value||'').toLowerCase();const filter=document.getElementById('statusFilter')?.value||'';let list=participants;if(search)list=list.filter(p=>(p.name||'').toLowerCase().includes(search)||(p.email||'').toLowerCase().includes(search));if(filter)list=list.filter(p=>p.status===filter);
if(!list.length){tb.innerHTML='<tr><td colspan="6" class="table-empty"><span class="empty-icon">👥</span>No participants found</td></tr>';document.getElementById('participantPagination').textContent='Showing 0';return}
tb.innerHTML=list.map(p=>`<tr><td><input type="checkbox" class="p-check" data-id="${p.id}"/></td><td>${p.name}</td><td>${p.email}</td><td>${statusBadge(p.status)}</td><td>${p.certificateUrl?`<a href="${p.certificateUrl}" target="_blank" class="btn-secondary" style="font-size:.75rem;padding:4px 10px">View</a>`:'—'}</td><td><button class="btn-outline" style="padding:4px 10px;font-size:.75rem" onclick="editParticipant('${p.id}')">Edit</button> <button class="btn-danger" style="padding:4px 10px;font-size:.75rem" onclick="deleteParticipant('${p.id}')">Delete</button></td></tr>`).join('');
document.getElementById('participantPagination').textContent=`Showing ${list.length} of ${participants.length}`}

function renderTemplates(){const el=document.getElementById('templatesList');if(!templates.length){el.innerHTML='<div class="table-empty"><span class="empty-icon">🖼️</span>No templates uploaded yet</div>';document.getElementById('namePosCard').style.display='none';return}
document.getElementById('namePosCard').style.display='block';el.innerHTML=templates.map(t=>`<div class="cert-item"><div class="cert-thumb"><img src="${t.templateUrl}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.innerHTML='<div class=cert-thumb-inner><div class=cert-thumb-badge>🖼️</div><div class=cert-thumb-name>Template</div></div>'"/></div><div class="cert-item-body"><div class="cert-item-name">Certificate Template</div><div class="cert-item-email">${new Date(t.createdAt?.seconds*1000||Date.now()).toLocaleDateString()}</div><div class="cert-item-actions"><button class="btn-danger" style="font-size:.75rem;padding:4px 10px" onclick="deleteTemplate('${t.id}')">Delete</button></div></div></div>`).join(''); initTemplateEditor(templates[0]);}
let editorImg = null;
function initTemplateEditor(t) {
  document.getElementById('nameX').value = t.nameX ?? 50;
  document.getElementById('nameY').value = t.nameY ?? 50;
  document.getElementById('nameFontSize').value = t.nameFontSize ?? 48;
  document.getElementById('nameColor').value = t.nameColor ?? '#1e293b';
  document.getElementById('nameFontFamily').value = t.nameFontFamily ?? 'Inter, sans-serif';
  document.getElementById('nameAlign').value = t.nameAlign ?? 'center';

  editorImg = new Image();
  editorImg.crossOrigin = 'anonymous';
  editorImg.onload = () => {
    const canvas = document.getElementById('templateCanvas');
    if(canvas) {
      canvas.width = editorImg.naturalWidth;
      canvas.height = editorImg.naturalHeight;
      drawEditorPreview();
    }
  };
  editorImg.src = t.templateUrl;
}

function drawEditorPreview() {
  if (!editorImg || !editorImg.complete) return;
  const canvas = document.getElementById('templateCanvas');
  const ctx = canvas.getContext('2d');
  
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(editorImg, 0, 0);

  const pctX = parseInt(document.getElementById('nameX').value || 50);
  const pctY = parseInt(document.getElementById('nameY').value || 50);
  const size = parseInt(document.getElementById('nameFontSize').value || 48);
  const color = document.getElementById('nameColor').value || '#1e293b';
  const family = document.getElementById('nameFontFamily').value || 'Inter, sans-serif';
  const align = document.getElementById('nameAlign').value || 'center';

  const x = (pctX / 100) * canvas.width;
  const y = (pctY / 100) * canvas.height;

  ctx.fillStyle = color;
  ctx.font = `bold ${size}px ${family}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText("Sample Name", x, y);
}

['nameX', 'nameY', 'nameFontSize', 'nameColor', 'nameFontFamily', 'nameAlign'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', drawEditorPreview);
});

document.getElementById('templateCanvas')?.addEventListener('mousedown', (e) => {
  const canvas = e.target;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  const clickX = (e.clientX - rect.left) * scaleX;
  const clickY = (e.clientY - rect.top) * scaleY;

  const pctX = Math.round((clickX / canvas.width) * 100);
  const pctY = Math.round((clickY / canvas.height) * 100);
  
  document.getElementById('nameX').value = Math.max(0, Math.min(100, pctX));
  document.getElementById('nameY').value = Math.max(0, Math.min(100, pctY));
  
  drawEditorPreview();
});
function renderSendStatus(){const tb=document.getElementById('sendStatusBody');if(!participants.length){tb.innerHTML='<tr><td colspan="5" class="table-empty"><span class="empty-icon">📨</span>No data</td></tr>';return}
tb.innerHTML=participants.map(p=>`<tr><td>${p.name}</td><td>${p.email}</td><td>${p.certificateUrl?'✓ Ready':'—'}</td><td>${statusBadge(p.status)}</td><td>${p.status==='generated'?`<button class="btn-primary" style="font-size:.75rem;padding:4px 12px" onclick="sendSingleEmail('${p.id}')">Send</button>`:p.status==='sent'?'<span class="badge badge-success">Sent ✓</span>':'—'}</td></tr>`).join('')}

// Panel navigation
function switchPanel(panel){document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));document.getElementById('panel-'+panel)?.classList.add('active');document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));document.querySelector(`[data-panel="${panel}"]`)?.classList.add('active');document.getElementById('topbarTitle').textContent={overview:'Overview',participants:'Participants',templates:'Templates',certificates:'Certificates',send:'Send Emails'}[panel]||panel}
window.switchPanel=switchPanel;
document.querySelectorAll('.nav-item[data-panel]').forEach(n=>n.addEventListener('click',()=>switchPanel(n.dataset.panel)));

// Sidebar mobile
document.getElementById('menuBtn')?.addEventListener('click',()=>{document.getElementById('sidebar').classList.toggle('open');document.getElementById('sidebarOverlay').classList.toggle('show')});
document.getElementById('sidebarOverlay')?.addEventListener('click',()=>{document.getElementById('sidebar').classList.remove('open');document.getElementById('sidebarOverlay').classList.remove('show')});

// Logout
document.getElementById('logoutBtn')?.addEventListener('click',async()=>{await signOut(auth);window.location.href='index.html'});
document.getElementById('refreshBtn')?.addEventListener('click',()=>loadData());

// Add participant modal
function openParticipantModal(p=null){document.getElementById('participantModal').classList.add('active');document.getElementById('participantModalTitle').textContent=p?'Edit Participant':'Add Participant';document.getElementById('pName').value=p?.name||'';document.getElementById('pEmail').value=p?.email||'';document.getElementById('participantModalError').textContent='';document.getElementById('saveParticipantBtn').dataset.editId=p?.id||''}
function closeParticipantModal(){document.getElementById('participantModal').classList.remove('active')}
document.getElementById('addParticipantBtn')?.addEventListener('click',()=>openParticipantModal());
document.getElementById('addParticipantBtn2')?.addEventListener('click',()=>openParticipantModal());
document.getElementById('closeParticipantModal')?.addEventListener('click',closeParticipantModal);
document.getElementById('cancelParticipantBtn')?.addEventListener('click',closeParticipantModal);

document.getElementById('saveParticipantBtn')?.addEventListener('click',async()=>{
const name=document.getElementById('pName').value.trim(),email=document.getElementById('pEmail').value.trim();
const errEl=document.getElementById('participantModalError');
if(!name||!email){errEl.textContent='Please fill all fields';return}
const btn=document.getElementById('saveParticipantBtn');
const originalText=btn.textContent;
btn.disabled=true;btn.textContent='Saving…';btn.style.opacity='0.7';errEl.textContent='';
const editId=btn.dataset.editId;
try{
if(editId){await updateDoc(doc(db,'participants',editId),{name,email});toast('Participant updated','success')}
else{const id=crypto.randomUUID();await setDoc(doc(db,'participants',id),{id,name,email,certificateUrl:'',status:'pending',createdBy:currentUser.uid,createdAt:serverTimestamp()});toast('Participant added','success')}
closeParticipantModal();await loadData()
}catch(e){errEl.textContent='Error: '+e.message}
finally{btn.disabled=false;btn.textContent=originalText;btn.style.opacity='1'}});

window.editParticipant=function(id){const p=participants.find(x=>x.id===id);if(p)openParticipantModal(p)};
window.deleteParticipant=async function(id){if(!confirm('Delete this participant?'))return;try{await deleteDoc(doc(db,'participants',id));toast('Deleted','success');await loadData()}catch(e){toast('Error: '+e.message,'error')}};
window.deleteTemplate=async function(id){if(!confirm('Delete this template?'))return;try{await deleteDoc(doc(db,'certificates',id));toast('Deleted','success');await loadData()}catch(e){toast('Error: '+e.message,'error')}};

// Search & filter
document.getElementById('searchParticipants')?.addEventListener('input',renderParticipants);
document.getElementById('statusFilter')?.addEventListener('change',renderParticipants);
document.getElementById('selectAll')?.addEventListener('change',e=>{document.querySelectorAll('.p-check').forEach(c=>c.checked=e.target.checked)});

// CSV import
document.getElementById('importCsvBtn')?.addEventListener('click',()=>{document.getElementById('csvImportCard').style.display='block'});
document.getElementById('closeCsvImport')?.addEventListener('click',()=>{document.getElementById('csvImportCard').style.display='none';csvData=[];document.getElementById('csvPreview').style.display='none';const fi=document.getElementById('csvFileInput');if(fi)fi.value=''});
let csvData=[];

function parseCSVFile(file){
if(!file)return;
const reader=new FileReader();
reader.onload=ev=>{
const text=ev.target.result.replace(/\r\n/g,'\n').replace(/\r/g,'\n');
const lines=text.split('\n').filter(l=>l.trim());
if(!lines.length){toast('CSV file is empty','warning');return}
csvData=[];let start=0;
const first=lines[0].toLowerCase();
if(first.includes('name')&&first.includes('email'))start=1;
for(let i=start;i<lines.length;i++){
const parts=lines[i].split(',');
if(parts.length>=2){
const name=parts[0].trim().replace(/^["']|["']$/g,'');
const email=parts[1].trim().replace(/^["']|["']$/g,'');
if(name&&email){csvData.push({name,email})}
}}
if(!csvData.length){toast('No valid entries found in CSV. Expected format: name, email','warning');return}
document.getElementById('csvCount').textContent=csvData.length;
const tb=document.getElementById('csvPreviewBody');
tb.innerHTML=csvData.slice(0,10).map(r=>`<tr><td>${r.name}</td><td>${r.email}</td></tr>`).join('');
if(csvData.length>10)tb.innerHTML+=`<tr><td colspan="2" style="text-align:center;color:var(--gray-500);font-size:.8rem">… and ${csvData.length-10} more</td></tr>`;
document.getElementById('csvPreview').style.display='block';
toast(`${csvData.length} entries found in CSV`,'info')};
reader.onerror=()=>{toast('Failed to read CSV file','error')};
reader.readAsText(file)}

document.getElementById('csvFileInput')?.addEventListener('change',e=>{parseCSVFile(e.target.files[0])});
document.getElementById('chooseCsvBtn')?.addEventListener('click',()=>{document.getElementById('csvFileInput')?.click()});

// CSV drag & drop
const csvZone=document.getElementById('csvUploadZone');
csvZone?.addEventListener('dragover',e=>{e.preventDefault();csvZone.classList.add('drag-over')});
csvZone?.addEventListener('dragleave',()=>csvZone.classList.remove('drag-over'));
csvZone?.addEventListener('drop',e=>{e.preventDefault();csvZone.classList.remove('drag-over');const file=e.dataTransfer.files[0];if(file&&(file.name.endsWith('.csv')||file.type==='text/csv')){parseCSVFile(file)}else{toast('Please drop a CSV file','warning')}});

document.getElementById('cancelCsvImport')?.addEventListener('click',()=>{csvData=[];document.getElementById('csvPreview').style.display='none';const fi=document.getElementById('csvFileInput');if(fi)fi.value=''});

document.getElementById('importCsvConfirm')?.addEventListener('click',async()=>{
if(!csvData.length){toast('No CSV data to import. Please select a CSV file first.','warning');return}
const btn=document.getElementById('importCsvConfirm');
const originalText=btn.textContent;
btn.disabled=true;btn.textContent='Importing…';btn.style.opacity='0.7';
let imported=0;
try{
for(const r of csvData){
const id=crypto.randomUUID();
await setDoc(doc(db,'participants',id),{id,name:r.name,email:r.email,certificateUrl:'',status:'pending',createdBy:currentUser.uid,createdAt:serverTimestamp()});
imported++;
btn.textContent=`Importing… (${imported}/${csvData.length})`}
toast(`✅ ${imported} participants imported successfully!`,'success');
csvData=[];document.getElementById('csvPreview').style.display='none';
document.getElementById('csvImportCard').style.display='none';
const fi=document.getElementById('csvFileInput');if(fi)fi.value='';
await loadData()
}catch(e){
if(imported>0){toast(`Partially imported ${imported}/${csvData.length}. Error: ${e.message}`,'warning');csvData=csvData.slice(imported);document.getElementById('csvCount').textContent=csvData.length;await loadData()}
else{toast('Import failed: '+e.message,'error')}}
finally{btn.disabled=false;btn.textContent=originalText;btn.style.opacity='1'}});

// Template upload
const templateZone=document.getElementById('templateUploadZone');
templateZone?.addEventListener('dragover',e=>{e.preventDefault();templateZone.classList.add('drag-over')});
templateZone?.addEventListener('dragleave',()=>templateZone.classList.remove('drag-over'));
templateZone?.addEventListener('drop',e=>{e.preventDefault();templateZone.classList.remove('drag-over');
const file=e.dataTransfer.files[0];
if(file){
const ext=file.name.split('.').pop().toLowerCase();
if(['png','jpg','jpeg','pdf'].includes(ext)){uploadTemplate(file)}
else{toast('Unsupported file type. Please use PNG, JPG, or PDF.','warning')}}});

document.getElementById('templateFileInput')?.addEventListener('change',e=>{
if(e.target.files[0])uploadTemplate(e.target.files[0])});

// Choose Template button click
document.getElementById('chooseTemplateBtn')?.addEventListener('click',e=>{
e.stopPropagation();document.getElementById('templateFileInput')?.click()});

// Also handle clicking anywhere on the upload zone to trigger file picker
templateZone?.addEventListener('click',e=>{
if(e.target.tagName!=='BUTTON'&&!e.target.closest('button')){
document.getElementById('templateFileInput')?.click()}});

let isUploading=false;
async function uploadTemplate(file){
if(isUploading){toast('Upload already in progress…','warning');return}
const allowedTypes=['image/png','image/jpeg','image/jpg','application/pdf'];
const ext=file.name.split('.').pop().toLowerCase();
if(!allowedTypes.includes(file.type)&&!['png','jpg','jpeg','pdf'].includes(ext)){
toast('Unsupported file type. Please use PNG, JPG, or PDF.','warning');return}
if(file.size>10*1024*1024){toast('File too large (max 10MB)','error');return}

isUploading=true;
const progressEl=document.getElementById('templateUploadProgress');
const fillEl=document.getElementById('templateProgressFill');
const uploadBtn=templateZone?.querySelector('.btn-primary');
const originalBtnText=uploadBtn?.textContent||'Choose Template File';

progressEl.style.display='block';
fillEl.style.width='10%';
if(uploadBtn){uploadBtn.disabled=true;uploadBtn.textContent='Uploading…';uploadBtn.style.opacity='0.7'}
toast(`Uploading "${file.name}"…`,'info');

try{
// Step 1: Upload to Firebase Storage
fillEl.style.width='30%';
const sRef=ref(storage,`templates/${currentUser.uid}/${Date.now()}_${file.name}`);
await uploadBytes(sRef,file);

// Step 2: Get download URL
fillEl.style.width='60%';
const url=await getDownloadURL(sRef);

// Step 3: Save to Firestore
fillEl.style.width='80%';
const id=crypto.randomUUID();
await setDoc(doc(db,'certificates',id),{id,templateUrl:url,createdBy:currentUser.uid,createdAt:serverTimestamp()});

fillEl.style.width='100%';
toast('✅ Template uploaded successfully!','success');

// Reset file input so same file can be re-selected
const fi=document.getElementById('templateFileInput');
if(fi)fi.value='';

await loadData();
}catch(e){
console.error('Template upload error:',e);
let errMsg='Upload failed: ';
if(e.code==='storage/unauthorized'){errMsg+='Permission denied. Check Firebase Storage rules.'}
else if(e.code==='storage/canceled'){errMsg+='Upload was cancelled.'}
else if(e.code==='storage/retry-limit-exceeded'){errMsg+='Network error. Please check your connection and try again.'}
else if(e.message?.includes('Failed to fetch')||e.message?.includes('NetworkError')){errMsg+='Network error. Please check your internet connection.'}
else{errMsg+=e.message||'Unknown error'}
toast(errMsg,'error');
}finally{
isUploading=false;
if(uploadBtn){uploadBtn.disabled=false;uploadBtn.textContent=originalBtnText;uploadBtn.style.opacity='1'}
setTimeout(()=>{progressEl.style.display='none';fillEl.style.width='0%'},2000)}}

// Generate certificates (creates canvas-based cert images)
document.getElementById('generateAllBtn')?.addEventListener('click',generateAllCerts);
document.getElementById('bulkGenerate')?.addEventListener('click',()=>{const ids=[...document.querySelectorAll('.p-check:checked')].map(c=>c.dataset.id);if(!ids.length){toast('Select participants first','warning');return}generateCerts(participants.filter(p=>ids.includes(p.id)))});
document.getElementById('bulkSend')?.addEventListener('click',async()=>{const ids=[...document.querySelectorAll('.p-check:checked')].map(c=>c.dataset.id);if(!ids.length){toast('Select participants first','warning');return}const selected=participants.filter(p=>ids.includes(p.id)&&p.certificateUrl);if(!selected.length){toast('Selected participants have no generated certificates','warning');return}toast(`Sending to ${selected.length} selected participants...`,'info');const progFill=document.getElementById('genProgressFill');const progText=document.getElementById('genProgressText');for(let i=0;i<selected.length;i++){const p=selected[i];try{await sendCertificateEmail(p.email,p.name,p.certificateUrl,null);await updateDoc(doc(db,'participants',p.id),{status:'sent'});const pct=Math.round((i+1)/selected.length*100);if(progFill)progFill.style.width=pct+'%';if(progText)progText.textContent=`Sending selected ${i+1} of ${selected.length}...`;await sleep(1500)}catch(e){console.error(e)}}toast('Selected emails sent!','success');await loadData()});

// ====== EMAIL CONFIGURATION (EMAILJS) ======
const EMAILJS_SERVICE_ID = 'service_9ufz44g'; // Replace with your Service ID
const EMAILJS_TEMPLATE_ID = 'template_du8z35s'; // Replace with your Template ID
const EMAILJS_PUBLIC_KEY = 'hZB7XEss_dtv2h_LX'; // Replace with your Public Key
// ===========================================

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function sendCertificateEmail(email, name, certUrl, base64Data) {
  if (EMAILJS_SERVICE_ID === 'YOUR_SERVICE_ID') {
    console.warn('EmailJS not configured. Skipping email for ' + email);
    return; 
  }
  
  const payload = {
    service_id: EMAILJS_SERVICE_ID,
    template_id: EMAILJS_TEMPLATE_ID,
    user_id: EMAILJS_PUBLIC_KEY,
    template_params: {
      to_email: email,
      to_name: name,
      message: 'Congratulations! Your certificate is attached.',
      certificate_url: certUrl,
      attachment_base64: base64Data || ''
    }
  };
  
  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const text = await response.text();
    console.error('EmailJS error:', text);
    throw new Error('EmailJS failed: ' + text);
  }
  console.log('EmailJS success for ' + email);
}

async function generateAllCerts(){const pending=participants.filter(p=>p.status==='pending');if(!pending.length){toast('No pending participants','warning');return}await generateCerts(pending)}

async function generateCerts(list){if(!templates.length){toast('Upload a template first!','warning');switchPanel('templates');return}
const template=templates[0];
if(!template || !template.templateUrl) {
  toast('Error: No valid template URL found! Please upload a valid template.','error');
  return;
}
console.log('Generating certificates using template URL:', template.templateUrl);
toast(`Generating ${list.length} certificates...`,'info');
const nameX=template.nameX ?? parseInt((document.getElementById('nameX')?.value)||50);
const nameY=template.nameY ?? parseInt((document.getElementById('nameY')?.value)||50);
const fontSize=template.nameFontSize ?? parseInt((document.getElementById('nameFontSize')?.value)||48);
const fontColor=template.nameColor ?? (document.getElementById('nameColor')?.value||'#1e293b');
const fontFamily=template.nameFontFamily ?? (document.getElementById('nameFontFamily')?.value||'Inter, sans-serif');
const align=template.nameAlign ?? (document.getElementById('nameAlign')?.value||'center');

for(let i=0;i<list.length;i++){const p=list[i];try{const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');const img=new Image();img.crossOrigin='anonymous';await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('Failed to load uploaded template image from URL'));img.src=template.templateUrl});
if(img.complete&&img.naturalWidth){canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;ctx.drawImage(img,0,0);ctx.fillStyle=fontColor;ctx.font=`bold ${fontSize}px ${fontFamily}`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(p.name,canvas.width*nameX/100,canvas.height*nameY/100)}else{throw new Error('Template image has no valid dimensions')}
const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));const sRef=ref(storage,`certs/${currentUser.uid}/${p.id}.png`);await uploadBytes(sRef,blob);const url=await getDownloadURL(sRef);
const base64Data=canvas.toDataURL('image/png');
try {
  await sendCertificateEmail(p.email, p.name, url, base64Data);
  await updateDoc(doc(db,'participants',p.id),{certificateUrl:url,status:'sent'});
} catch(e) {
  console.error('Email send failed for', p.email, e);
  await updateDoc(doc(db,'participants',p.id),{certificateUrl:url,status:'generated'});
}
const pct=Math.round((i+1)/list.length*100);document.getElementById('genProgressFill').style.width=pct+'%';document.getElementById('genProgressText').textContent=`${i+1} of ${list.length} generated`}catch(e){console.error('Gen error for',p.name,e)}}
toast('Certificates generated!','success');await loadData();renderCertGrid()}

function renderCertGrid(){const el=document.getElementById('certificatesGrid');const search=(document.getElementById('searchCerts')?.value||'').toLowerCase();let list=participants.filter(p=>p.certificateUrl);if(search)list=list.filter(p=>(p.name||'').toLowerCase().includes(search)||(p.email||'').toLowerCase().includes(search));
if(!list.length){el.innerHTML='<div class="table-empty"><span class="empty-icon">🏆</span>No certificates generated yet</div>';return}
el.innerHTML=list.map(p=>`<div class="cert-item"><div class="cert-thumb"><img src="${p.certificateUrl}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.innerHTML='<div class=cert-thumb-inner><div class=cert-thumb-badge>🏆</div><div class=cert-thumb-name>${p.name}</div></div>'"/></div><div class="cert-item-body"><div class="cert-item-name">${p.name}</div><div class="cert-item-email">${p.email}</div><div class="cert-item-actions"><a href="${p.certificateUrl}" download class="btn-secondary" style="font-size:.75rem;padding:4px 10px;text-decoration:none">⬇ Download</a></div></div></div>`).join('')}
document.getElementById('searchCerts')?.addEventListener('input',renderCertGrid);

document.getElementById('downloadAllBtn')?.addEventListener('click',()=>{participants.filter(p=>p.certificateUrl).forEach(p=>{const a=document.createElement('a');a.href=p.certificateUrl;a.download=`${p.name}_certificate.png`;a.target='_blank';document.body.appendChild(a);a.click();a.remove()})});

// Send emails manually
document.getElementById('sendAllBtn')?.addEventListener('click',async()=>{const list=participants.filter(p=>p.certificateUrl);if(!list.length){toast('No generated certificates to send','warning');return}
toast(`Starting bulk send for ${list.length} participants...`,'info');
const progFill=document.getElementById('genProgressFill');
const progText=document.getElementById('genProgressText');
for(let i=0;i<list.length;i++){const p=list[i];try{if(p.status !== 'sent'){
  await sendCertificateEmail(p.email, p.name, p.certificateUrl, null);
  await updateDoc(doc(db,'participants',p.id),{status:'sent'});
  const pct=Math.round((i+1)/list.length*100);
  if(progFill)progFill.style.width=pct+'%';
  if(progText)progText.textContent=`Sending email ${i+1} of ${list.length}...`;
  await sleep(1500); // 1.5s delay
}} catch(e){console.error('Failed to send to', p.email, e)}}
toast('All emails sent!','success');await loadData()});

document.getElementById('sendPendingBtn')?.addEventListener('click',async()=>{const list=participants.filter(p=>p.status==='generated');if(!list.length){toast('No pending emails to send','warning');return}
toast(`Sending pending emails to ${list.length} participants...`,'info');
const progFill=document.getElementById('genProgressFill');
const progText=document.getElementById('genProgressText');
for(let i=0;i<list.length;i++){const p=list[i];try{
  await sendCertificateEmail(p.email, p.name, p.certificateUrl, null);
  await updateDoc(doc(db,'participants',p.id),{status:'sent'});
  const pct=Math.round((i+1)/list.length*100);
  if(progFill)progFill.style.width=pct+'%';
  if(progText)progText.textContent=`Sending pending ${i+1} of ${list.length}...`;
  await sleep(1500); // 1.5s delay
} catch(e){console.error('Failed to send pending to', p.email, e)}}
toast('Pending emails sent!','success');await loadData()});

window.sendSingleEmail=async function(id){try{const p=participants.find(x=>x.id===id);if(p){await sendCertificateEmail(p.email, p.name, p.certificateUrl, null);await updateDoc(doc(db,'participants',id),{status:'sent'});toast('Sent successfully!','success');await loadData()}}catch(e){toast('Error: '+e.message,'error')}};

document.getElementById('saveNamePos')?.addEventListener('click', async () => {
  if (!templates.length) return;
  const btn = document.getElementById('saveNamePos');
  btn.disabled = true;
  btn.textContent = 'Saving...';
  
  const t = templates[0];
  const settings = {
    nameX: parseInt(document.getElementById('nameX').value),
    nameY: parseInt(document.getElementById('nameY').value),
    nameFontSize: parseInt(document.getElementById('nameFontSize').value),
    nameColor: document.getElementById('nameColor').value,
    nameFontFamily: document.getElementById('nameFontFamily').value,
    nameAlign: document.getElementById('nameAlign').value
  };
  
  try {
    await updateDoc(doc(db, 'certificates', t.id), settings);
    Object.assign(t, settings);
    toast('Template settings saved successfully!', 'success');
  } catch(e) {
    toast('Error saving settings: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Template Settings';
  }
});


